import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isServableName, saveUpload, uploadDir } from "./uploads";

const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(16),
]);

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "ivy-nav-uploads-"));
  process.env.DATABASE_PATH = path.join(dir, "portal.db");
});

afterEach(() => {
  delete process.env.DATABASE_PATH;
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("isServableName", () => {
  it("accepts the names this module writes", () => {
    expect(isServableName("0123456789abcdef.png")).toBe(true);
    expect(isServableName("simple-icons-github-181717_0123456789abcdef.svg")).toBe(true);
  });

  it("still refuses anything that could walk out of the directory", () => {
    for (const name of [
      "../0123456789abcdef.png",
      "/etc/passwd",
      "0123456789abcdef.png/../x.png",
      "sub/0123456789abcdef.png",
      "_0123456789abcdef.png",
      "prefix.\\./0123456789abcdef.png",
      "0123456789abcdef.exe",
      "0123456789abcde.png",
      "0123456789ABCDEF.png",
      "",
    ]) {
      expect(isServableName(name)).toBe(false);
    }
  });
});

describe("saveUpload", () => {
  it("uses the preferred name when it is legal and matches the format", () => {
    const name = saveUpload(PNG, "image/png", "simple-icons-github_0123456789abcdef.png");
    expect(name).toBe("simple-icons-github_0123456789abcdef.png");
    expect(fs.existsSync(path.join(uploadDir(), name))).toBe(true);
  });

  it("falls back to a random name when the preferred one does not fit the bytes", () => {
    // 名字说 svg、内容却是 png：不能就这么存下去
    const name = saveUpload(PNG, "image/png", "simple-icons-github_0123456789abcdef.svg");
    expect(name).toMatch(/^[a-f0-9]{16}\.png$/);
  });
});
