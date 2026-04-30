import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32;
const IV_BYTES = 12;

const HEX_KEY = /^[0-9a-fA-F]{64}$/;

function decodeKey(raw: string): Buffer {
  if (HEX_KEY.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  const fromBase64 = Buffer.from(raw, "base64");
  if (fromBase64.length === KEY_BYTES) {
    return fromBase64;
  }
  throw new Error(
    `ENCRYPTION_KEY must be ${KEY_BYTES} bytes encoded as 64 hex chars or 44 base64 chars`,
  );
}

// Read at call time, not module load: this lets tests set process.env.ENCRYPTION_KEY without
// importing the full @/config/env validator chain (which requires a complete env to load).
function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("ENCRYPTION_KEY is not set");
  }
  return decodeKey(raw);
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(
    ":",
  );
}

export function decrypt(payload: string): string {
  const parts = payload.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid ciphertext format: expected iv:authTag:ciphertext");
  }
  const [ivB64, authTagB64, ciphertextB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");
  if (iv.length !== IV_BYTES) {
    throw new Error(`Invalid IV: expected ${IV_BYTES} bytes`);
  }
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}
