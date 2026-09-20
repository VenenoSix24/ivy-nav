import { createHash, randomBytes } from "node:crypto";

/** 256 bits of entropy, url-safe. */
export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/** The database stores digests, not tokens. */
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
