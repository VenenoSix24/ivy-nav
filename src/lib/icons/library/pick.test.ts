import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PickError, pickLibraryIcon } from "./pick";
import { uploadDir } from "@/lib/icons/uploads";

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "ivy-nav-pick-"));
  process.env.DATABASE_PATH = path.join(dir, "portal.db");
});

afterEach(() => {
  delete process.env.DATABASE_PATH;
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("pickLibraryIcon", () => {
  it("stores the icon locally with a readable name", async () => {
    const { filename } = await pickLibraryIcon("simple-icons", "github", "#181717");

    expect(filename).toMatch(/^simple-icons-github-181717_[a-f0-9]{16}\.svg$/);
    expect(fs.existsSync(path.join(uploadDir(), filename))).toBe(true);
  });

  it("gives the same name for the same icon, so picking twice does not pile up files", async () => {
    const first = await pickLibraryIcon("simple-icons", "github", null);
    const second = await pickLibraryIcon("simple-icons", "github", null);
    expect(second.filename).toBe(first.filename);
  });

  it("keeps different colours apart", async () => {
    const black = await pickLibraryIcon("simple-icons", "github", "#000000");
    const white = await pickLibraryIcon("simple-icons", "github", "#ffffff");
    expect(black.filename).not.toBe(white.filename);
  });

  it("says what is wrong instead of failing silently", async () => {
    await expect(pickLibraryIcon("nope", "github", null)).rejects.toThrow(PickError);
    await expect(pickLibraryIcon("simple-icons", "no-such-icon", null)).rejects.toThrow(PickError);
  });
});
