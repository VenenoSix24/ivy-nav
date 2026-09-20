const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const HAS_PROTOCOL = /^[a-z][a-z0-9+.-]*:/i;

/** Accepts bare hosts and absolute URLs, rejects anything that is not http(s). */
export function parseHttpUrl(input: string): URL | null {
  const raw = input.trim();
  if (!raw) return null;

  const candidate = HAS_PROTOCOL.test(raw) ? raw : `https://${raw}`;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) return null;
  if (!url.hostname || !url.hostname.includes(".")) return null;

  return url;
}

export function normalizeUrl(input: string): string | null {
  return parseHttpUrl(input)?.toString() ?? null;
}

export function isSafeUrl(input: string): boolean {
  return parseHttpUrl(input) !== null;
}

/** Host without the leading "www.". */
export function toDomain(input: string): string | null {
  const url = parseHttpUrl(input);
  if (!url) return null;
  return url.hostname.replace(/^www\./, "");
}

export function toHostname(input: string): string | null {
  return parseHttpUrl(input)?.hostname ?? null;
}

/** Domain for display, falling back to the input. */
export function displayUrl(input: string): string {
  return toDomain(input) ?? input;
}
