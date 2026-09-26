#!/usr/bin/env node
// 列出（或删掉）上传目录里已经没有条目引用的图标文件。
// 默认只打印，加 --delete 才真删。
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

/** 与 uploads.ts 的 isServableName 一致：只碰本工具生成的文件名 */
const SERVABLE = /^(?:[a-z0-9-]{1,48}_)?[a-f0-9]{16}\.([a-z0-9]+)$/;
const EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "svg"]);
/** 刚写进来的那张可能还在编辑面板里没保存，先不动 */
const GRACE_MS = 60 * 60 * 1000;

const dbPath = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "portal.db");
const uploadDir = path.join(path.dirname(dbPath), "uploads");
const remove = process.argv.includes("--delete");

if (!fs.existsSync(uploadDir)) {
  console.log(`没有这个目录：${uploadDir}`);
  process.exit(0);
}

let db;
try {
  db = new Database(dbPath, { readonly: true });
} catch {
  console.error(`打不开数据库：${dbPath}（用 DATABASE_PATH 指定别的路径）`);
  process.exit(1);
}
const used = new Set(
  db
    .prepare("select icon_value from items where icon_type = 'upload'")
    .all()
    .map((row) => row.icon_value)
    .filter((value) => typeof value === "string"),
);
db.close();

let kept = 0;
let prunable = 0;
let skipped = 0;
const now = Date.now();

for (const name of fs.readdirSync(uploadDir)) {
  const file = path.join(uploadDir, name);
  if (!fs.statSync(file).isFile()) continue;

  if (!SERVABLE.test(name) || !EXTENSIONS.has(name.split(".").pop() ?? "")) {
    skipped += 1;
    console.log(`跳过（不是这里生成的文件名）  ${name}`);
    continue;
  }
  if (used.has(name)) {
    kept += 1;
    continue;
  }
  if (now - fs.statSync(file).mtimeMs < GRACE_MS) {
    skipped += 1;
    console.log(`跳过（一小时内刚写过）      ${name}`);
    continue;
  }

  prunable += 1;
  console.log(`${remove ? "已删除" : "可清理"}                      ${name}`);
  if (remove) fs.rmSync(file, { force: true });
}

console.log(`\n在用的 ${kept} 个，可清理 ${prunable} 个，跳过 ${skipped} 个。`);
if (prunable > 0 && !remove) console.log("加 --delete 才真删。");
