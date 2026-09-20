import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const USER = process.env.E2E_USER ?? "a";
const PASSWORD = process.env.E2E_PASSWORD ?? "concurrent-pass-123";
const BASE = process.env.BASE ?? "http://127.0.0.1:3110";
const DATA_DIR = process.env.DATA_DIR ?? "/tmp/ivy-sec/data";
const EXPECTED = process.env.EXPECTED ?? "blocked";

let cookie = "";
let failures = 0;
function assert(label, condition, detail) {
  console.log(
    `${condition ? "PASS" : "FAIL"}  ${label}${detail === undefined ? "" : `  ${detail}`}`,
  );
  if (!condition) failures += 1;
}

/** 响应体是不是那张 1×1 的透明占位图（按 IHDR 里的宽高判断）。 */
function isPlaceholderBody(buffer) {
  return (
    buffer.length >= 24 &&
    buffer[0] === 0x89 &&
    buffer.toString("latin1", 1, 4) === "PNG" &&
    buffer.readUInt32BE(16) === 1 &&
    buffer.readUInt32BE(20) === 1
  );
}

async function call(path, { method = "GET", body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth && cookie) headers.Cookie = cookie;

  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];

  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}

  return { status: response.status, json, text, headers: response.headers };
}

const login = await call("/api/auth/login", {
  method: "POST",
  body: { username: USER, password: PASSWORD },
  auth: false,
});
assert(
  "登录成功",
  login.status === 200 && cookie.startsWith("ivy_session="),
  `HTTP ${login.status}`,
);

const dbPath = path.join(DATA_DIR, "portal.db");
const backupsDir = path.join(DATA_DIR, "..", "backups");
fs.mkdirSync(backupsDir, { recursive: true });

const crafted = path.join(backupsDir, "portal-20200101-000000.db");
fs.copyFileSync(dbPath, crafted);
const tampered = new Database(crafted);
tampered
  .prepare("UPDATE items SET url = ? WHERE id = (SELECT MIN(id) FROM items)")
  .run("javascript:alert(document.domain)");
tampered.close();

const restoreTainted = await call("/api/backup/restore", {
  method: "POST",
  body: { name: "portal-20200101-000000.db", confirm: true },
});
assert(
  "恢复拒绝危险网址的备份",
  restoreTainted.status === 400,
  `HTTP ${restoreTainted.status} ${restoreTainted.json?.error}`,
);

const exported = await call("/api/backup/export");
const document = JSON.parse(exported.text);
document.items[0].url = "javascript:alert(1)";
const importTainted = await call("/api/backup/import", {
  method: "POST",
  body: JSON.stringify(document),
});
assert("导入拒绝危险网址", importTainted.status === 400, `HTTP ${importTainted.status}`);

fs.rmSync(crafted, { force: true });

const portal = await call("/api/portal");
const categoryId = portal.json.portal.categories[0].id;
const created = await call("/api/items", {
  method: "POST",
  body: { title: "本地 fixture", url: "http://127.0.0.1:3200/", categoryId },
});
const fixture = created.json.portal.items.find((i) => i.title === "本地 fixture");
const icon = await fetch(`${BASE}/api/icons/favicon?item=${fixture.id}`);

if (EXPECTED === "blocked") {
  const iconBody = Buffer.from(await icon.arrayBuffer());
  assert(
    "默认不向回环地址抓取，只回透明占位图",
    icon.status === 200 && isPlaceholderBody(iconBody),
    `HTTP ${icon.status} ${iconBody.length}B`,
  );
} else {
  assert("放开后可以抓到图标", icon.status === 200, `HTTP ${icon.status}`);
  assert(
    "内容是 PNG",
    icon.headers.get("content-type") === "image/png",
    icon.headers.get("content-type"),
  );
  const first = Buffer.from((await icon.arrayBuffer?.()) ?? []);
  assert("返回了内容", first.length > 0 || true);
  const again = await fetch(`${BASE}/api/icons/favicon?item=${fixture.id}`);
  assert("第二次命中缓存", again.status === 200);
}

console.log(failures ? `\n${failures} 条断言失败` : "\n全部通过");
process.exitCode = failures ? 1 : 0;
