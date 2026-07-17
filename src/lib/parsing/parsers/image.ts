/**
 * Images and scans. **No OCR** — the audit model has vision, and it reads
 * scanned statements, handwriting, rotated pages and ruled tables far better
 * than an OCR pass would. This parser therefore records what the image *is*
 * (format, dimensions) and marks the document `kind: "image"` so the pipeline
 * hands the stored file to the model for visual reading.
 *
 * Dimensions are read straight from the container headers — no image decoding
 * library, no pixel work.
 */

import type { InputWarning } from "@/db/schema";

import type { ParseResult, ParserContext } from "../types";

type Dimensions = { width: number; height: number };

function pngSize(b: Buffer): Dimensions | undefined {
  // IHDR is the first chunk: 8-byte signature, 4-byte length, 4-byte type.
  if (b.length < 24 || b.toString("latin1", 12, 16) !== "IHDR") return undefined;
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

function gifSize(b: Buffer): Dimensions | undefined {
  if (b.length < 10) return undefined;
  return { width: b.readUInt16LE(6), height: b.readUInt16LE(8) };
}

function bmpSize(b: Buffer): Dimensions | undefined {
  if (b.length < 26) return undefined;
  return { width: b.readInt32LE(18), height: Math.abs(b.readInt32LE(22)) };
}

function jpegSize(b: Buffer): Dimensions | undefined {
  // Walk the marker chain to the first Start-Of-Frame.
  let offset = 2;
  while (offset + 9 < b.length) {
    if (b[offset] !== 0xff) {
      offset++;
      continue;
    }
    const marker = b[offset + 1];
    if (marker === undefined) return undefined;
    // SOF0..SOF15 excluding DHT (c4), JPGA (c8) and DAC (cc).
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: b.readUInt16BE(offset + 5), width: b.readUInt16BE(offset + 7) };
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd9)) {
      offset += 2;
      continue;
    }
    const length = b.readUInt16BE(offset + 2);
    if (length < 2) return undefined;
    offset += 2 + length;
  }
  return undefined;
}

function webpSize(b: Buffer): Dimensions | undefined {
  if (b.length < 30) return undefined;
  const chunk = b.toString("latin1", 12, 16);
  if (chunk === "VP8X") {
    return {
      width: 1 + (b[24]! | (b[25]! << 8) | (b[26]! << 16)),
      height: 1 + (b[27]! | (b[28]! << 8) | (b[29]! << 16)),
    };
  }
  if (chunk === "VP8 ") {
    return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
  }
  if (chunk === "VP8L") {
    const bits = b.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  return undefined;
}

function tiffSize(b: Buffer): Dimensions | undefined {
  if (b.length < 8) return undefined;
  const little = b[0] === 0x49;
  const readU16 = (o: number) => (little ? b.readUInt16LE(o) : b.readUInt16BE(o));
  const readU32 = (o: number) => (little ? b.readUInt32LE(o) : b.readUInt32BE(o));

  const ifd = readU32(4);
  if (ifd + 2 > b.length) return undefined;
  const count = readU16(ifd);
  let width: number | undefined;
  let height: number | undefined;

  for (let i = 0; i < count; i++) {
    const entry = ifd + 2 + i * 12;
    if (entry + 12 > b.length) break;
    const tag = readU16(entry);
    const type = readU16(entry + 2);
    // Tag 256 = ImageWidth, 257 = ImageLength; type 3 = SHORT, 4 = LONG.
    const value = type === 3 ? readU16(entry + 8) : readU32(entry + 8);
    if (tag === 256) width = value;
    if (tag === 257) height = value;
  }
  return width !== undefined && height !== undefined ? { width, height } : undefined;
}

function readDimensions(b: Buffer): { dimensions?: Dimensions; format: string } {
  if (b.length >= 8 && b.toString("latin1", 1, 4) === "PNG") {
    return { dimensions: pngSize(b), format: "png" };
  }
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8) {
    return { dimensions: jpegSize(b), format: "jpeg" };
  }
  if (b.length >= 6 && b.toString("latin1", 0, 3) === "GIF") {
    return { dimensions: gifSize(b), format: "gif" };
  }
  if (b.length >= 16 && b.toString("latin1", 0, 4) === "RIFF" && b.toString("latin1", 8, 12) === "WEBP") {
    return { dimensions: webpSize(b), format: "webp" };
  }
  if (b.length >= 2 && b[0] === 0x42 && b[1] === 0x4d) {
    return { dimensions: bmpSize(b), format: "bmp" };
  }
  if (b.length >= 4 && (b.toString("latin1", 0, 2) === "II" || b.toString("latin1", 0, 2) === "MM")) {
    return { dimensions: tiffSize(b), format: "tiff" };
  }
  return { format: "image" };
}

export async function parse(buffer: Buffer, ctx: ParserContext): Promise<ParseResult> {
  const warnings: InputWarning[] = [];

  let dimensions: Dimensions | undefined;
  let format = "image";
  try {
    const read = readDimensions(buffer);
    dimensions = read.dimensions;
    format = read.format;
  } catch {
    // A malformed header is not a parse failure — the model can still look at
    // the file. Only the dimensions are lost.
  }

  if (!dimensions) {
    warnings.push({
      code: "image_dimensions_unknown",
      message: `${ctx.fileName}: image dimensions could not be read from the file header.`,
      severity: "info",
    });
  }

  warnings.push({
    code: "image_requires_vision",
    message:
      `${ctx.fileName} is an image and holds no extractable text. It is stored and marked to be ` +
      "read visually by the audit model; no OCR was performed.",
    severity: "info",
  });

  if (ctx.budget.documentsRemaining <= 0) {
    return {
      documents: [],
      warnings: [
        ...warnings,
        {
          code: "document_budget_exhausted",
          message: `${ctx.fileName} was not parsed: the document budget for this input was exhausted.`,
          severity: "medium",
        },
      ],
      detected: {},
      status: "failed",
    };
  }
  ctx.budget.documentsRemaining--;

  const size = dimensions ? `${dimensions.width}×${dimensions.height}px` : "unknown dimensions";

  return {
    documents: [
      {
        kind: "image",
        name: ctx.fileName,
        seq: 0,
        columns: [],
        rows: [],
        summary: `${format.toUpperCase()} image, ${size}, ${buffer.length} bytes. Marked for model vision; not OCR'd.`,
        truncated: false,
      },
    ],
    warnings,
    detected: {},
    status: "parsed",
  };
}
