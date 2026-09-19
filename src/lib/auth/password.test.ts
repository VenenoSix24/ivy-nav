import { describe, expect, it } from "vitest";
import { checkPasswordStrength, hashPassword, verifyPassword } from "./password";
import { createSessionToken, hashSessionToken } from "./token";

describe("hashPassword", () => {
  it("never stores the plaintext", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(hash).not.toContain("correct horse battery");
    expect(hash.startsWith("scrypt$")).toBe(true);
  });

  it("salts, so the same password yields different hashes", async () => {
    const [a, b] = await Promise.all([
      hashPassword("same-password"),
      hashPassword("same-password"),
    ]);
    expect(a).not.toBe(b);
  });

  it("carries the cost parameters with the hash", async () => {
    const hash = await hashPassword("whatever");
    const [prefix, N, r, p] = hash.split("$");
    expect(prefix).toBe("scrypt");
    expect(Number(N)).toBe(16384);
    expect(Number(r)).toBe(8);
    expect(Number(p)).toBe(1);
  });
});

describe("verifyPassword", () => {
  it("accepts the right password", async () => {
    const hash = await hashPassword("s3cret-passphrase");
    await expect(verifyPassword("s3cret-passphrase", hash)).resolves.toBe(true);
  });

  it("rejects the wrong password", async () => {
    const hash = await hashPassword("s3cret-passphrase");
    await expect(verifyPassword("s3cret-passphras", hash)).resolves.toBe(false);
    await expect(verifyPassword("", hash)).resolves.toBe(false);
  });

  it("rejects malformed stored hashes instead of throwing", async () => {
    await expect(verifyPassword("x", "")).resolves.toBe(false);
    await expect(verifyPassword("x", "plaintext")).resolves.toBe(false);
    await expect(verifyPassword("x", "scrypt$a$b$c$d$e")).resolves.toBe(false);
    await expect(verifyPassword("x", "bcrypt$16384$8$1$c2FsdA==$a2V5")).resolves.toBe(false);
  });
});

describe("checkPasswordStrength", () => {
  it("explains the reason and the fix", () => {
    const message = checkPasswordStrength("short");
    expect(message).toContain("8");
    expect(message).toContain("加长");
  });

  it("accepts a long enough password", () => {
    expect(checkPasswordStrength("long-enough")).toBeNull();
  });
});

describe("session tokens", () => {
  it("are unique and url-safe", () => {
    const tokens = new Set(Array.from({ length: 50 }, () => createSessionToken()));
    expect(tokens.size).toBe(50);
    for (const token of tokens) expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("hash to a stable digest that is not the token", () => {
    const token = createSessionToken();
    expect(hashSessionToken(token)).toBe(hashSessionToken(token));
    expect(hashSessionToken(token)).not.toBe(token);
    expect(hashSessionToken(token)).toHaveLength(64);
  });
});
