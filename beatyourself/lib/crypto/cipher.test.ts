import { randomBytes } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { decrypt, encrypt } from "./cipher";

const HEX_KEY = randomBytes(32).toString("hex");
const BASE64_KEY = randomBytes(32).toString("base64");

describe("crypto/cipher", () => {
  let originalKey: string | undefined;

  beforeAll(() => {
    originalKey = process.env.ENCRYPTION_KEY;
    process.env.ENCRYPTION_KEY = HEX_KEY;
  });

  afterAll(() => {
    if (originalKey === undefined) {
      delete process.env.ENCRYPTION_KEY;
    } else {
      process.env.ENCRYPTION_KEY = originalKey;
    }
  });

  it("round-trips arbitrary plaintext", () => {
    const samples = [
      "hello",
      "",
      "русский текст",
      "🔐 emoji 💪",
      "x".repeat(10_000),
      JSON.stringify({ access: "abc.def", refresh: "ghi.jkl", expires: 1234567890 }),
    ];
    for (const s of samples) {
      expect(decrypt(encrypt(s))).toBe(s);
    }
  });

  it("produces a different ciphertext for the same plaintext (unique IV)", () => {
    const a = encrypt("strava-token");
    const b = encrypt("strava-token");
    expect(a).not.toBe(b);
    expect(decrypt(a)).toBe("strava-token");
    expect(decrypt(b)).toBe("strava-token");
  });

  it("emits ciphertext in iv:authTag:ciphertext base64 format", () => {
    const payload = encrypt("hello");
    const parts = payload.split(":");
    expect(parts).toHaveLength(3);
    const [iv, authTag, ct] = parts.map((p) => Buffer.from(p, "base64"));
    expect(iv.length).toBe(12);
    expect(authTag.length).toBe(16);
    expect(ct.length).toBeGreaterThan(0);
  });

  it("rejects a tampered ciphertext (auth tag mismatch)", () => {
    const payload = encrypt("secret");
    const [iv, authTag, ct] = payload.split(":");
    const ctBuf = Buffer.from(ct, "base64");
    ctBuf[0] = ctBuf[0] ^ 0x01;
    const tampered = [iv, authTag, ctBuf.toString("base64")].join(":");
    expect(() => decrypt(tampered)).toThrow();
  });

  it("rejects a tampered auth tag", () => {
    const payload = encrypt("secret");
    const [iv, authTag, ct] = payload.split(":");
    const tagBuf = Buffer.from(authTag, "base64");
    tagBuf[0] = tagBuf[0] ^ 0x01;
    const tampered = [iv, tagBuf.toString("base64"), ct].join(":");
    expect(() => decrypt(tampered)).toThrow();
  });

  it("rejects a malformed payload", () => {
    expect(() => decrypt("not-a-valid-payload")).toThrow(/Invalid ciphertext format/);
    expect(() => decrypt("a:b")).toThrow(/Invalid ciphertext format/);
    expect(() => decrypt("a:b:c:d")).toThrow(/Invalid ciphertext format/);
  });

  it("rejects a payload encrypted under a different key", () => {
    const payload = encrypt("secret");
    const previous = process.env.ENCRYPTION_KEY;
    process.env.ENCRYPTION_KEY = randomBytes(32).toString("hex");
    try {
      expect(() => decrypt(payload)).toThrow();
    } finally {
      process.env.ENCRYPTION_KEY = previous;
    }
  });

  it("accepts a base64-encoded key as well as hex", () => {
    const previous = process.env.ENCRYPTION_KEY;
    process.env.ENCRYPTION_KEY = BASE64_KEY;
    try {
      expect(decrypt(encrypt("ok"))).toBe("ok");
    } finally {
      process.env.ENCRYPTION_KEY = previous;
    }
  });

  it("throws when ENCRYPTION_KEY is missing", () => {
    const previous = process.env.ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_KEY;
    try {
      expect(() => encrypt("x")).toThrow(/ENCRYPTION_KEY is not set/);
    } finally {
      process.env.ENCRYPTION_KEY = previous;
    }
  });

  it("throws on a key with the wrong length", () => {
    const previous = process.env.ENCRYPTION_KEY;
    process.env.ENCRYPTION_KEY = "tooshort";
    try {
      expect(() => encrypt("x")).toThrow(/32 bytes/);
    } finally {
      process.env.ENCRYPTION_KEY = previous;
    }
  });
});
