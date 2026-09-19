import { createHash, randomBytes } from "node:crypto";

/** 256 bits of entropy, url-safe. The raw token only ever lives in the cookie. */
export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * The database stores digests, not tokens: a leaked database file then cannot be
 * replayed as a valid session.
 */
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
