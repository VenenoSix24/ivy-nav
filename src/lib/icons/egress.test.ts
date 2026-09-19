import { describe, expect, it } from "vitest";
import { isBlockedIp, nextRedirectTarget } from "./egress";

describe("isBlockedIp", () => {
  it("blocks loopback", () => {
    expect(isBlockedIp("127.0.0.1")).toBe(true);
    expect(isBlockedIp("127.1.2.3")).toBe(true);
    expect(isBlockedIp("::1")).toBe(true);
    expect(isBlockedIp("::")).toBe(true);
  });

  it("blocks link-local and the cloud metadata range", () => {
    expect(isBlockedIp("169.254.169.254")).toBe(true);
    expect(isBlockedIp("fe80::1")).toBe(true);
  });

  it("blocks the unspecified network, multicast and reserved ranges", () => {
    expect(isBlockedIp("0.0.0.0")).toBe(true);
    expect(isBlockedIp("224.0.0.1")).toBe(true);
    expect(isBlockedIp("240.0.0.1")).toBe(true);
  });

  it("blocks IPv4-mapped IPv6 loopback", () => {
    expect(isBlockedIp("::ffff:127.0.0.1")).toBe(true);
    expect(isBlockedIp("::ffff:169.254.169.254")).toBe(true);
  });

  it("strips a zone index before judging", () => {
    expect(isBlockedIp("fe80::1%lo0")).toBe(true);
  });

  it("allows public addresses", () => {
    expect(isBlockedIp("93.184.216.34")).toBe(false);
    expect(isBlockedIp("2606:4700::1111")).toBe(false);
  });

  it("allows private LAN ranges, which a personal portal legitimately points at", () => {
    expect(isBlockedIp("192.168.1.10")).toBe(false);
    expect(isBlockedIp("10.0.0.5")).toBe(false);
    expect(isBlockedIp("172.16.3.4")).toBe(false);
  });

  it("rejects malformed input rather than assuming it is public", () => {
    expect(isBlockedIp("")).toBe(true);
    expect(isBlockedIp("999.1.1.1")).toBe(true);
    expect(isBlockedIp("not-an-ip")).toBe(true);
  });
});

describe("nextRedirectTarget", () => {
  const base = new URL("https://example.com/a/b");

  it("resolves a relative location", () => {
    expect(nextRedirectTarget("/x", base).toString()).toBe("https://example.com/x");
  });

  it("refuses a downgrade to a non-http scheme", () => {
    expect(() => nextRedirectTarget("file:///etc/passwd", base)).toThrow();
    expect(() => nextRedirectTarget("javascript:alert(1)", base)).toThrow();
  });

  it("refuses an unparseable location", () => {
    expect(() => nextRedirectTarget("http://[", base)).toThrow();
  });
});

describe("URL normalisation of obfuscated hosts", () => {
  it("turns integer and hex forms into dotted decimal, so the guard sees them", () => {
    expect(new URL("http://0x7f000001/").hostname).toBe("127.0.0.1");
    expect(new URL("http://2130706433/").hostname).toBe("127.0.0.1");
    expect(isBlockedIp(new URL("http://0x7f000001/").hostname)).toBe(true);
  });
});
