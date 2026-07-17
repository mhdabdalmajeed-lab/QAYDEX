/**
 * Evidence parsing entry point (PRD §22 stages 1–3).
 *
 * `parseInput` is total: it dispatches on the sniffed format, catches
 * everything, and **always** returns a `ParseResult`. It never throws.
 *
 * That is a product requirement, not defensive habit. PRD §8.5 says
 * "Unsupported or unreadable files should be stored and clearly flagged" and
 * §26.3 says "Inputs must never be silently dropped". A file this module cannot
 * read comes back with `status: "unsupported"` or `"failed"` and a warning that
 * says why, so the caller stores it and the review screen shows it. A thrown
 * error, by contrast, would take the upload down with it and the user would
 * never know their bank statement was missing from the audit.
 *
 * The module is pure: Buffers in, results out. No filesystem, no network, no DB.
 */

import type { InputWarning } from "@/db/schema";

import { detectFormat, type ParserKey } from "./detect";
import { detectMetadata } from "./detect-metadata";
import * as csvParser from "./parsers/csv";
import * as docxParser from "./parsers/docx";
import * as imageParser from "./parsers/image";
import * as jsonParser from "./parsers/json";
import * as pdfParser from "./parsers/pdf";
import * as spreadsheetParser from "./parsers/spreadsheet";
import * as textParser from "./parsers/text";
import * as xmlParser from "./parsers/xml";
import * as zipParser from "./parsers/zip";
import {
  DEFAULT_LIMITS,
  type ParseLimits,
  type ParseResult,
  type Parser,
  type ParserContext,
} from "./types";

export * from "./types";
export { detectFormat, extensionOf, type FormatDetection, type ParserKey } from "./detect";
export { detectMetadata, mergeDetected } from "./detect-metadata";
export { SOURCE_ROW_COLUMN, SOURCE_ROW_KEY } from "./types";

const PARSERS: Record<Exclude<ParserKey, "unknown">, Parser> = {
  spreadsheet: spreadsheetParser.parse,
  csv: csvParser.parse,
  pdf: pdfParser.parse,
  docx: docxParser.parse,
  text: textParser.parse,
  json: jsonParser.parse,
  xml: xmlParser.parse,
  image: imageParser.parse,
  zip: zipParser.parse,
};

export type ParseInputOptions = {
  fileName: string;
  mimeType?: string;
  limits?: Partial<ParseLimits>;
};

function unsupported(fileName: string, format: string | undefined): ParseResult {
  return {
    documents: [],
    warnings: [
      {
        code: "format_unsupported",
        message:
          `${fileName} is not in a format this pipeline can read` +
          (format ? ` (detected: ${format})` : "") +
          ". The file has been stored and flagged so it can be reviewed manually or read by the " +
          "audit model directly.",
        severity: "medium",
      },
    ],
    detected: {},
    status: "unsupported",
  };
}

/**
 * The recursive dispatcher. Zip entries re-enter here through `ctx.recurse`,
 * which is injected rather than imported so that `zip.ts` does not have to
 * import this module back.
 */
async function dispatch(buffer: Buffer, ctx: ParserContext): Promise<ParseResult> {
  if (buffer.length === 0) {
    return {
      documents: [],
      warnings: [
        {
          code: "file_empty",
          message: `${ctx.fileName} is empty (0 bytes). It has been stored and flagged.`,
          severity: "medium",
        },
      ],
      detected: {},
      status: "unsupported",
    };
  }

  const detection = detectFormat(buffer, { fileName: ctx.fileName, mimeType: ctx.mimeType });
  if (detection.parser === "unknown") {
    return unsupported(ctx.fileName, detection.format);
  }

  const parser = PARSERS[detection.parser];
  const warnings: InputWarning[] = [];

  // A weak detection is worth saying out loud: it explains an odd parse later.
  if (detection.reason === "content" || detection.reason === "mime") {
    warnings.push({
      code: "format_inferred",
      message:
        `${ctx.fileName}: format was inferred from ${
          detection.reason === "content" ? "file content" : "the declared MIME type"
        } as ${detection.format ?? detection.parser}, not from a reliable signature.`,
      severity: "info",
    });
  }

  try {
    const result = await parser(buffer, ctx);
    return { ...result, warnings: [...warnings, ...result.warnings] };
  } catch (error) {
    // A parser that throws is a bug in this module or a file crafted to trip
    // one. Either way the input survives as a flagged, stored input.
    return {
      documents: [],
      warnings: [
        ...warnings,
        {
          code: "parser_crashed",
          message:
            `${ctx.fileName} could not be parsed as ${detection.format ?? detection.parser}: ` +
            `${error instanceof Error ? error.message : String(error)}. ` +
            "The file has been stored and flagged; nothing was dropped.",
          severity: "high",
        },
      ],
      detected: {},
      status: "failed",
    };
  }
}

/**
 * Parse an uploaded file into documents that evidence references can point at.
 *
 * Never throws. Check `status`:
 *  - `"parsed"`      — documents were produced (possibly with warnings)
 *  - `"unsupported"` — the format is not readable here; store and flag it
 *  - `"failed"`      — the file is the right format but broken; store and flag it
 */
export async function parseInput(
  buffer: Buffer,
  options: ParseInputOptions,
): Promise<ParseResult> {
  const limits: ParseLimits = { ...DEFAULT_LIMITS, ...options.limits };

  const ctx: ParserContext = {
    fileName: options.fileName,
    mimeType: options.mimeType,
    path: [],
    depth: 0,
    limits,
    budget: {
      bytesRemaining: limits.maxTotalBytes,
      documentsRemaining: limits.maxDocuments,
    },
    recurse: dispatch,
  };

  try {
    const result = await dispatch(buffer, ctx);
    return {
      ...result,
      // Metadata is derived once, over everything the input produced (including
      // anything unpacked out of a zip).
      detected: detectMetadata(result.documents),
    };
  } catch (error) {
    // Belt and braces: dispatch already catches, so reaching here means
    // something outside a parser failed. The contract still holds.
    return {
      documents: [],
      warnings: [
        {
          code: "parse_failed",
          message:
            `${options.fileName} could not be processed: ` +
            `${error instanceof Error ? error.message : String(error)}. ` +
            "The file has been stored and flagged.",
          severity: "high",
        },
      ],
      detected: {},
      status: "failed",
    };
  }
}
