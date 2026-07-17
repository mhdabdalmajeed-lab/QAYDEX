/**
 * Format sniffing: magic bytes first, then extension, then mime type, then a
 * light content sniff. Magic bytes win because uploaded files lie — browsers
 * send `application/octet-stream` for anything they don't recognise, and users
 * rename `.xls` onto CSV exports constantly.
 */

export type ParserKey =
  | "spreadsheet"
  | "csv"
  | "pdf"
  | "docx"
  | "text"
  | "json"
  | "xml"
  | "image"
  | "zip"
  | "unknown";

export type DetectionReason = "magic" | "extension" | "mime" | "content" | "none";

export type FormatDetection = {
  parser: ParserKey;
  reason: DetectionReason;
  /** Delimiter for `csv`, when we could establish one. */
  delimiter?: string;
  /** Concrete format label for warnings/summaries, e.g. "xlsx", "png". */
  format?: string;
};

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif", "tif", "tiff", "bmp"]);

const EXTENSION_MAP: Record<string, ParserKey> = {
  xlsx: "spreadsheet",
  xlsm: "spreadsheet",
  xlsb: "spreadsheet",
  xls: "spreadsheet",
  ods: "spreadsheet",
  csv: "csv",
  tsv: "csv",
  tab: "csv",
  pdf: "pdf",
  docx: "docx",
  txt: "text",
  text: "text",
  md: "text",
  log: "text",
  json: "json",
  jsonl: "json",
  ndjson: "json",
  geojson: "json",
  xml: "xml",
  xbrl: "xml",
  html: "xml",
  htm: "xml",
  zip: "zip",
};

const MIME_MAP: Record<string, ParserKey> = {
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "spreadsheet",
  "application/vnd.ms-excel": "spreadsheet",
  "application/vnd.ms-excel.sheet.macroenabled.12": "spreadsheet",
  "application/vnd.oasis.opendocument.spreadsheet": "spreadsheet",
  "text/csv": "csv",
  "text/tab-separated-values": "csv",
  "application/csv": "csv",
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "text/plain": "text",
  "text/markdown": "text",
  "application/json": "json",
  "application/ld+json": "json",
  "text/xml": "xml",
  "application/xml": "xml",
  "text/html": "xml",
  "application/zip": "zip",
  "application/x-zip-compressed": "zip",
};

export function extensionOf(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? fileName;
  const dot = base.lastIndexOf(".");
  if (dot <= 0 || dot === base.length - 1) return "";
  return base.slice(dot + 1).toLowerCase();
}

function startsWith(buffer: Buffer, bytes: number[], offset = 0): boolean {
  if (buffer.length < offset + bytes.length) return false;
  return bytes.every((b, i) => buffer[offset + i] === b);
}

function imageFormatFromMagic(buffer: Buffer): string | undefined {
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return "jpeg";
  if (startsWith(buffer, [0x47, 0x49, 0x46, 0x38])) return "gif";
  if (startsWith(buffer, [0x42, 0x4d])) return "bmp";
  if (startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) && startsWith(buffer, [0x57, 0x45, 0x42, 0x50], 8)) {
    return "webp";
  }
  if (startsWith(buffer, [0x49, 0x49, 0x2a, 0x00]) || startsWith(buffer, [0x4d, 0x4d, 0x00, 0x2a])) {
    return "tiff";
  }
  return undefined;
}

/**
 * A zip container may be an OOXML document. The first local file header's name
 * sits at offset 30, and OOXML always ships `[Content_Types].xml` plus a
 * well-known top-level directory. Scan the first few KB of plaintext entry names
 * rather than fully unzipping just to classify.
 */
function ooxmlFlavour(buffer: Buffer): ParserKey | undefined {
  const head = buffer.subarray(0, Math.min(buffer.length, 8192)).toString("latin1");
  if (!head.includes("[Content_Types].xml")) return undefined;
  if (head.includes("xl/")) return "spreadsheet";
  if (head.includes("word/")) return "docx";
  return undefined;
}

function looksLikeUtf8Text(buffer: Buffer): boolean {
  const sample = buffer.subarray(0, Math.min(buffer.length, 4096));
  if (sample.length === 0) return true;
  let suspicious = 0;
  for (const byte of sample) {
    // NUL or a C0 control that isn't tab/LF/CR/FF.
    if (byte === 0 || (byte < 0x09) || (byte > 0x0d && byte < 0x20)) suspicious++;
  }
  return suspicious / sample.length < 0.05;
}

function sniffDelimiter(text: string): string | undefined {
  const lines = text.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0).slice(0, 10);
  if (lines.length === 0) return undefined;
  let best: { delimiter: string; score: number } | undefined;
  for (const delimiter of [",", "\t", ";", "|"]) {
    const counts = lines.map((l) => l.split(delimiter).length - 1);
    const first = counts[0] ?? 0;
    if (first < 1) continue;
    // Consistent field counts across lines is the signal; wobble is not fatal.
    const consistent = counts.filter((c) => c === first).length / counts.length;
    const score = first * consistent;
    if (!best || score > best.score) best = { delimiter, score };
  }
  return best && best.score >= 1 ? best.delimiter : undefined;
}

function sniffTextual(buffer: Buffer, extension: string): FormatDetection | undefined {
  const head = buffer.subarray(0, Math.min(buffer.length, 65536)).toString("utf8");
  const trimmed = head.trimStart();
  if (trimmed.startsWith("<?xml") || trimmed.startsWith("<!DOCTYPE html") || /^<[A-Za-z_]/.test(trimmed)) {
    return { parser: "xml", reason: "content", format: "xml" };
  }
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return { parser: "json", reason: "content", format: "json" };
  }
  const delimiter = sniffDelimiter(head);
  if (delimiter) {
    return {
      parser: "csv",
      reason: "content",
      delimiter,
      format: delimiter === "\t" ? "tsv" : "csv",
    };
  }
  if (extension === "" && looksLikeUtf8Text(buffer)) {
    return { parser: "text", reason: "content", format: "txt" };
  }
  return undefined;
}

export function detectFormat(
  buffer: Buffer,
  input: { fileName: string; mimeType?: string },
): FormatDetection {
  const extension = extensionOf(input.fileName);
  const mimeType = (input.mimeType ?? "").split(";")[0]?.trim().toLowerCase() ?? "";

  if (buffer.length === 0) {
    return { parser: "unknown", reason: "none", format: extension || undefined };
  }

  // ── Magic bytes ────────────────────────────────────────────────────────────
  const image = imageFormatFromMagic(buffer);
  if (image) return { parser: "image", reason: "magic", format: image };

  if (startsWith(buffer, [0x25, 0x50, 0x44, 0x46])) {
    return { parser: "pdf", reason: "magic", format: "pdf" };
  }

  // OLE2 compound document — legacy .xls (also .doc, which SheetJS will reject
  // loudly rather than silently mangle).
  if (startsWith(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
    return { parser: "spreadsheet", reason: "magic", format: "xls" };
  }

  // PK zip container: OOXML, ODF, or a plain archive.
  if (startsWith(buffer, [0x50, 0x4b, 0x03, 0x04]) || startsWith(buffer, [0x50, 0x4b, 0x05, 0x06])) {
    const flavour = ooxmlFlavour(buffer);
    if (flavour === "spreadsheet") {
      return { parser: "spreadsheet", reason: "magic", format: extension || "xlsx" };
    }
    if (flavour === "docx") return { parser: "docx", reason: "magic", format: "docx" };
    if (extension === "ods") return { parser: "spreadsheet", reason: "extension", format: "ods" };
    if (EXTENSION_MAP[extension] === "spreadsheet") {
      return { parser: "spreadsheet", reason: "extension", format: extension };
    }
    if (extension === "docx") return { parser: "docx", reason: "extension", format: "docx" };
    return { parser: "zip", reason: "magic", format: "zip" };
  }

  // ── Extension ──────────────────────────────────────────────────────────────
  if (IMAGE_EXTENSIONS.has(extension)) {
    return { parser: "image", reason: "extension", format: extension };
  }

  const byExtension = EXTENSION_MAP[extension];
  if (byExtension === "csv") {
    const head = buffer.subarray(0, Math.min(buffer.length, 65536)).toString("utf8");
    const delimiter =
      extension === "tsv" || extension === "tab" ? "\t" : (sniffDelimiter(head) ?? ",");
    return { parser: "csv", reason: "extension", delimiter, format: extension };
  }
  if (byExtension) return { parser: byExtension, reason: "extension", format: extension };

  // ── Mime type ──────────────────────────────────────────────────────────────
  const byMime = MIME_MAP[mimeType];
  if (byMime === "csv") {
    const head = buffer.subarray(0, Math.min(buffer.length, 65536)).toString("utf8");
    return {
      parser: "csv",
      reason: "mime",
      delimiter: mimeType === "text/tab-separated-values" ? "\t" : (sniffDelimiter(head) ?? ","),
      format: mimeType === "text/tab-separated-values" ? "tsv" : "csv",
    };
  }
  if (byMime) return { parser: byMime, reason: "mime", format: extension || undefined };
  if (mimeType.startsWith("image/")) {
    return { parser: "image", reason: "mime", format: mimeType.slice("image/".length) };
  }

  // ── Content ────────────────────────────────────────────────────────────────
  if (looksLikeUtf8Text(buffer)) {
    const sniffed = sniffTextual(buffer, extension);
    if (sniffed) return sniffed;
    return { parser: "text", reason: "content", format: extension || "txt" };
  }

  return { parser: "unknown", reason: "none", format: extension || undefined };
}
