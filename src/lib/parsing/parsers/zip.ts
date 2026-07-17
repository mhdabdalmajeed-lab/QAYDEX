/**
 * ZIP archives via fflate. Entries are expanded and parsed recursively through
 * `ctx.recurse`, so a CSV inside a zip is parsed exactly like a CSV upload and
 * its documents carry the zip path in their names.
 *
 * Guards, because this is the one format where a small upload can cost
 * unbounded work:
 *  - nesting depth (zip inside zip inside zip)
 *  - entry count
 *  - per-entry compression ratio (a zip bomb is ~1000:1; real files are <100:1)
 *  - a shared decompressed-bytes budget across the whole `parseInput` call
 *
 * Every refusal produces a warning naming the entry. A skipped entry is a
 * flagged entry, never a silently dropped one (PRD §26.3).
 */

import { unzipSync } from "fflate";

import type { InputWarning } from "@/db/schema";

import type { ParsedDocument, ParseResult, ParserContext } from "../types";

/** Directory entries and editor/OS noise carry no evidence. */
function isIgnorable(name: string): boolean {
  if (name.endsWith("/")) return true;
  const base = name.split("/").pop() ?? name;
  return (
    name.startsWith("__MACOSX/") ||
    base === ".DS_Store" ||
    base === "Thumbs.db" ||
    base.startsWith("._")
  );
}

export async function parse(buffer: Buffer, ctx: ParserContext): Promise<ParseResult> {
  const warnings: InputWarning[] = [];

  if (ctx.depth >= ctx.limits.maxZipDepth) {
    return {
      documents: [],
      warnings: [
        {
          code: "zip_too_deep",
          message:
            `${ctx.fileName}: nested archives go deeper than ${ctx.limits.maxZipDepth} level(s); ` +
            "this archive was stored but not expanded.",
          severity: "medium",
        },
      ],
      detected: {},
      status: "unsupported",
    };
  }

  const skipped: string[] = [];
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(new Uint8Array(buffer), {
      filter: (file) => {
        if (isIgnorable(file.name)) return false;
        // fflate: `size` is the compressed size, `originalSize` the inflated one.
        const ratio = file.size > 0 ? file.originalSize / file.size : 0;
        if (ratio > ctx.limits.maxCompressionRatio) {
          warnings.push({
            code: "zip_entry_suspicious_ratio",
            message:
              `${ctx.fileName} › ${file.name}: compression ratio ${Math.round(ratio)}:1 exceeds the ` +
              `${ctx.limits.maxCompressionRatio}:1 limit (${file.originalSize} bytes from ${file.size}). ` +
              "The entry was not expanded.",
            severity: "high",
          });
          skipped.push(file.name);
          return false;
        }
        if (file.originalSize > ctx.budget.bytesRemaining) {
          warnings.push({
            code: "zip_budget_exhausted",
            message:
              `${ctx.fileName} › ${file.name}: expanding this entry (${file.originalSize} bytes) would ` +
              "exceed the decompression budget for this input. The entry was not expanded.",
            severity: "high",
          });
          skipped.push(file.name);
          return false;
        }
        ctx.budget.bytesRemaining -= file.originalSize;
        return true;
      },
    });
  } catch (error) {
    return {
      documents: [],
      warnings: [
        ...warnings,
        {
          code: "zip_unreadable",
          message:
            `Could not read ${ctx.fileName} as a ZIP archive: ${
              error instanceof Error ? error.message : String(error)
            }. ` + "The file is stored and flagged for manual review.",
          severity: "high",
        },
      ],
      detected: {},
      status: "failed",
    };
  }

  const names = Object.keys(entries).sort();
  if (names.length === 0 && skipped.length === 0) {
    return {
      documents: [],
      warnings: [
        ...warnings,
        {
          code: "zip_empty",
          message: `${ctx.fileName} contains no files.`,
          severity: "medium",
        },
      ],
      detected: {},
      status: "parsed",
    };
  }

  const selected = names.slice(0, ctx.limits.maxZipEntries);
  if (names.length > selected.length) {
    warnings.push({
      code: "zip_entries_truncated",
      message:
        `${ctx.fileName}: expanded ${selected.length} of ${names.length} entries ` +
        `(cap ${ctx.limits.maxZipEntries}). The remaining entries were stored but not parsed.`,
      severity: "medium",
    });
  }

  const documents: ParsedDocument[] = [];
  let seq = 0;
  let failures = 0;

  for (const name of selected) {
    const data = entries[name];
    if (!data) continue;

    const baseName = name.split("/").pop() ?? name;
    const child = await ctx.recurse(Buffer.from(data), {
      ...ctx,
      fileName: baseName,
      mimeType: undefined,
      path: [...ctx.path, ctx.fileName],
      depth: ctx.depth + 1,
    });

    warnings.push(...child.warnings);
    if (child.status !== "parsed") failures++;

    for (const document of child.documents) {
      // A child names itself `<baseName>` or `<baseName> › Sheet1`. Replace the
      // leading basename with the full archive path so the document says where
      // it came from; sheet/page provenance inside the document is untouched.
      const suffix = document.name.startsWith(baseName)
        ? document.name.slice(baseName.length)
        : ` › ${document.name}`;
      documents.push({
        ...document,
        name: `${ctx.fileName} › ${name}${suffix}`,
        seq: seq++,
      });
    }
  }

  if (failures > 0) {
    warnings.push({
      code: "zip_entries_failed",
      message:
        `${ctx.fileName}: ${failures} of ${selected.length} entries could not be parsed. ` +
        "They are listed above and remain stored and flagged.",
      severity: "medium",
    });
  }

  return {
    documents,
    warnings,
    detected: {},
    // The archive itself was read; individual entry failures are carried as
    // warnings rather than failing the whole upload.
    status: "parsed",
  };
}
