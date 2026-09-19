import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

const KEY_LENGTH = 64;
const PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } satisfies ScryptOptions;
const PREFIX = "scrypt";

export const PASSWORD_MIN_LENGTH = 8;

function derive(
  password: string,
  salt: Buffer,
  keyLength: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password.normalize("NFKC"), salt, keyLength, options, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

/** Format: scrypt$N$r$p$salt$key — parameters travel with the hash so they can be raised later. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, KEY_LENGTH, PARAMS);
  return [
    PREFIX,
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString("base64"),
    key.toString("base64"),
  ].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== PREFIX) return false;

  const [, rawN, rawR, rawP, rawSalt, rawKey] = parts;
  const N = Number(rawN);
  const r = Number(rawR);
  const p = Number(rawP);
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return false;

  const salt = Buffer.from(rawSalt, "base64");
  const expected = Buffer.from(rawKey, "base64");
  if (salt.length === 0 || expected.length === 0) return false;

  const key = await derive(password, salt, expected.length, {
    N,
    r,
    p,
    maxmem: PARAMS.maxmem,
  });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/** Returns a message explaining both the reason and the fix, or null when acceptable. */
export function checkPasswordStrength(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `密码至少需要 ${PASSWORD_MIN_LENGTH} 个字符，当前 ${password.length} 个：请加长后再提交。`;
  }
  if (password.length > 200) {
    return "密码过长（上限 200 个字符）：请缩短后再提交。";
  }
  return null;
}
