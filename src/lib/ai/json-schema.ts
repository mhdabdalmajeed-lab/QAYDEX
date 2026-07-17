import type { ZodType } from "zod";
import { z } from "zod";

/**
 * Bridges zod's JSON Schema output to what the Responses API's strict validator actually
 * accepts. Two mismatches make this necessary, both verified against the live API:
 *
 *  - zod emits `oneOf` for `z.discriminatedUnion`, but strict mode rejects it outright
 *    (`'oneOf' is not permitted`). `anyOf` is supported and behaves identically for a
 *    discriminated union, whose variants are mutually exclusive by construction.
 *  - zod emits a `$schema` key, which the validator does not expect.
 *
 * The `format: "email"` guard is a tripwire, not a nicety: that keyword makes the request
 * hang forever rather than return an error, which is near-impossible to diagnose from a
 * timeout alone. Failing loudly while building the request is much kinder.
 *
 * Kept free of `server-only` so it stays directly testable.
 */
export function sanitizeJsonSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(sanitizeJsonSchema);
  if (!node || typeof node !== "object") return node;

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (key === "$schema") continue;
    if (key === "format" && value === "email") {
      throw new Error(
        'Refusing to send a schema containing format:"email" — it hangs the Responses API ' +
          "indefinitely rather than returning an error. Validate emails in application code.",
      );
    }
    out[key === "oneOf" ? "anyOf" : key] = sanitizeJsonSchema(value);
  }
  return out;
}

/** Converts a zod schema into the strict json_schema format the Responses API requires. */
export function toStrictJsonSchema(schema: ZodType<unknown>, name: string) {
  const jsonSchema = z.toJSONSchema(schema, { target: "draft-2020-12", io: "output" });
  return {
    type: "json_schema" as const,
    name,
    strict: true,
    schema: sanitizeJsonSchema(jsonSchema) as Record<string, unknown>,
  };
}
