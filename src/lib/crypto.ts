import "server-only";

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

/**
 * Encryption at rest for integration credentials (PRD §25.1: "Integration token
 * encryption").
 *
 * AES-256-GCM, so the ciphertext is authenticated: a tampered blob fails to decrypt
 * rather than yielding attacker-chosen plaintext. The key material comes from
 * `APP_ENCRYPTION_KEY`, which must be **32 bytes of CSPRNG output, base64-encoded**:
 *
 *     node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 *
 * That length is enforced rather than papered over. scrypt would happily stretch
 * "hunter2" into a well-formed 32-byte key, which would look identical to a real key at
 * every call site while carrying almost no entropy — so a short or non-base64 value is a
 * startup-time error with instructions, not a silently weak cipher.
 *
 * scrypt still runs over the decoded bytes for domain separation: the salt is a fixed
 * constant because decryption must derive the same key from the same env var years
 * later, so it cannot be random per call. Per-message uniqueness comes from the random
 * IV instead, which is what GCM actually requires.
 *
 * Nothing here logs plaintext, and no error message ever embeds a secret or a decoded
 * key — a thrown error from this module is safe to surface and safe to log.
 */

const VERSION = "v1";
const KEY_LENGTH = 32;
const IV_LENGTH = 12; // 96 bits — the size GCM is specified for.
const SALT = "caydex.integration-credentials.v1";

const GENERATE_HINT =
  'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))" ' +
  "and add it to your environment (see .env.example).";

let cachedKey: Buffer | null = null;

export class EncryptionKeyMissing extends Error {
  constructor() {
    super(
      "APP_ENCRYPTION_KEY is not set. Integration credentials cannot be stored without it. " +
        GENERATE_HINT,
    );
    this.name = "EncryptionKeyMissing";
  }
}

/** The key exists but is unusable. The message states the actual length, never the value. */
export class EncryptionKeyInvalid extends Error {
  constructor(detail: string) {
    super(`APP_ENCRYPTION_KEY is invalid: ${detail} ${GENERATE_HINT}`);
    this.name = "EncryptionKeyInvalid";
  }
}

export class DecryptionFailed extends Error {
  constructor(message = "Stored credentials could not be decrypted.") {
    super(message);
    this.name = "DecryptionFailed";
  }
}

/**
 * Decodes and validates the env var.
 *
 * `Buffer.from(x, "base64")` never throws — it silently skips characters it cannot read,
 * so "hunter2!!!!" decodes to *something* rather than failing. The character check below
 * is therefore the only thing standing between a typo and a key derived from a partially
 * discarded string. Both standard and URL-safe alphabets are accepted; padding is
 * optional because a 32-byte key is 43 significant characters plus one "=".
 */
function decodeKeyMaterial(secret: string): Buffer {
  const trimmed = secret.trim();

  if (!/^[A-Za-z0-9+/\-_]+={0,2}$/.test(trimmed)) {
    throw new EncryptionKeyInvalid("it is not valid base64.");
  }

  const raw = Buffer.from(trimmed, "base64");
  if (raw.length !== KEY_LENGTH) {
    throw new EncryptionKeyInvalid(
      `it decodes to ${raw.length} byte${raw.length === 1 ? "" : "s"}, but ${KEY_LENGTH} are ` +
        "required (the base64 of 32 random bytes — 44 characters).",
    );
  }
  return raw;
}

function key(): Buffer {
  if (cachedKey) return cachedKey;
  const secret = process.env.APP_ENCRYPTION_KEY;
  if (!secret || secret.trim().length === 0) throw new EncryptionKeyMissing();
  cachedKey = scryptSync(decodeKeyMaterial(secret), SALT, KEY_LENGTH);
  return cachedKey;
}

/**
 * True when the app is actually configured to store credentials — i.e. the key is
 * present *and* usable. Never throws: the UI calls this to decide whether to offer the
 * connect flow at all, and a config problem should disable the form with an explanation
 * rather than crash the page.
 */
export function encryptionAvailable(): boolean {
  try {
    key();
    return true;
  } catch {
    return false;
  }
}

/**
 * The reason encryption is unavailable, for an admin-facing notice. Returns null when
 * everything is fine. Safe to render: it describes the shape of the problem, not the key.
 */
export function encryptionUnavailableReason(): string | null {
  try {
    key();
    return null;
  } catch (error) {
    if (error instanceof EncryptionKeyMissing || error instanceof EncryptionKeyInvalid) {
      return error.message;
    }
    throw error;
  }
}

/** Returns `v1.<iv>.<authTag>.<ciphertext>`, all base64url. */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptSecret(payload: string): string {
  const parts = payload.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new DecryptionFailed("Stored credentials are not in a recognised format.");
  }
  const [, ivPart, tagPart, dataPart] = parts;

  try {
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivPart, "base64url"));
    decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(dataPart, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch (error) {
    if (error instanceof EncryptionKeyMissing) throw error;
    // Either the key changed or the blob was altered. Both are the same answer to the
    // caller, and neither should leak which one it was.
    throw new DecryptionFailed();
  }
}

/**
 * A safe echo of a secret for the UI: enough to recognise which credential is stored,
 * not enough to use it. Credentials themselves never travel back to the browser.
 */
export function credentialHint(plaintext: string): string {
  const trimmed = plaintext.trim();
  if (trimmed.length <= 4) return "••••";
  return `••••${trimmed.slice(-4)}`;
}
