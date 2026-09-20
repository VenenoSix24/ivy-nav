const USER = process.env.E2E_USER ?? "ivy";
const PASSWORD = process.env.E2E_PASSWORD ?? "test-password-123";
const BASE = process.env.BASE ?? "http://127.0.0.1:3110";
let cookie = "";

let failures = 0;
function assert(label, condition, detail) {
  console.log(
    `${condition ? "PASS" : "FAIL"}  ${label}${detail === undefined ? "" : `  ${detail}`}`,
  );
  if (!condition) failures += 1;
}

async function call(path, { method = "GET", body, auth = true, raw = false } = {}) {
  const headers = {};
  if (body !== undefined && typeof body === "string") headers["Content-Type"] = "application/json";
  if (auth && cookie) headers.Cookie = cookie;

  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: typeof body === "string" ? body : body === undefined ? undefined : JSON.stringify(body),
  });

  const setCookie = response.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  if (raw) return response;

  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: response.status, json, text, headers: response.headers };
}

const portalOf = async () => (await call("/api/portal")).json.portal;

// 账号由 pnpm admin:create 预先创建
async function signIn() {
  const response = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: USER, password: PASSWORD }),
  });
  cookie = (response.headers.get("set-cookie") ?? "").split(";")[0];
  if (response.status !== 200 || !cookie.startsWith("ivy_session=")) {
    console.error("登录失败，无法继续：" + response.status);
    process.exit(1);
  }
}
await signIn();

for (const [path, method] of [
  ["/api/backup/export", "GET"],
  ["/api/backup/list", "GET"],
  ["/api/backup/create", "POST"],
  ["/api/backup/import", "POST"],
  ["/api/backup/restore", "POST"],
]) {
  const response = await call(path, {
    method,
    auth: false,
    body: method === "POST" ? "{}" : undefined,
  });
  assert(`匿名 ${method} ${path} 被拒`, response.status === 401, `HTTP ${response.status}`);
}

const exported = await call("/api/backup/export", { raw: true });
const exportText = await exported.text();
const document = JSON.parse(exportText);
assert(
  "导出为附件下载",
  (exported.headers.get("content-disposition") ?? "").includes("attachment"),
);
assert("导出带格式标记", document.format === "ivy-nav" && document.version === 1);
assert("导出含分类", document.categories.length === 7, `${document.categories.length} 个`);
assert("导出含条目", document.items.length === 15, `${document.items.length} 条`);
assert(
  "条目按分类名关联",
  document.items[0].categoryName === "My Projects",
  document.items[0].categoryName,
);
assert(
  "导出含标签",
  Array.isArray(document.tags) && document.tags.length === 14,
  `${document.tags?.length}`,
);
assert("导出不含用户与会话", !("users" in document) && !("sessions" in document));
assert(
  "导出保留首页布局",
  document.categories.some((c) => c.visibleOnHomepage === true),
);

const before = await portalOf();
const first = before.items[0];
await call(`/api/items/${first.id}`, { method: "PATCH", body: { title: "被改掉的标题" } });
await call("/api/categories", { method: "POST", body: { name: "临时分类" } });
const changed = await portalOf();
assert(
  "内容已被改动",
  changed.items.some((i) => i.title === "被改掉的标题"),
);

const imported = await call("/api/backup/import", { method: "POST", body: exportText });
assert(
  "导入成功",
  imported.status === 200,
  `HTTP ${imported.status} ${JSON.stringify(imported.json)}`,
);
assert(
  "导入统计正确",
  imported.json.imported.categories === 7 && imported.json.imported.items === 15,
  JSON.stringify(imported.json.imported),
);

const after = await portalOf();
assert("导入后标题还原", !after.items.some((i) => i.title === "被改掉的标题"));
assert("导入后临时分类消失", !after.categories.some((c) => c.name === "临时分类"));
assert("导入后条目数一致", after.items.length === 15, `${after.items.length}`);
assert("导入后标签保留", after.items.find((i) => i.title === "GitHub")?.tags.includes("Dev"));
assert("导入不影响登录", (await call("/api/auth/session")).json.authenticated === true);

const badUrl = JSON.stringify({
  format: "ivy-nav",
  version: 1,
  categories: [],
  items: [{ title: "x", url: "javascript:alert(1)" }],
});
const rejected = await call("/api/backup/import", { method: "POST", body: badUrl });
assert("导入拒绝危险协议", rejected.status === 400, `HTTP ${rejected.status}`);

const badVersion = await call("/api/backup/import", {
  method: "POST",
  body: JSON.stringify({ ...document, version: 99 }),
});
assert(
  "导入拒绝版本不符",
  badVersion.status === 400,
  `HTTP ${badVersion.status} ${badVersion.json?.error}`,
);

const notJson = await call("/api/backup/import", { method: "POST", body: "not json at all" });
assert("导入拒绝非 JSON", notJson.status === 400, `HTTP ${notJson.status}`);

const emptyBody = await call("/api/backup/import", { method: "POST", body: "" });
assert("导入拒绝空内容", emptyBody.status === 400, `HTTP ${emptyBody.status}`);

const created = await call("/api/backup/create", { method: "POST" });
assert(
  "创建备份",
  created.status === 200 && created.json.snapshots.length === 1,
  JSON.stringify(created.json.snapshots?.[0]),
);
const snapshot = created.json.snapshots[0];
assert("备份落在备份目录", /^portal-\d{8}-\d{6}\.db$/.test(snapshot.name), snapshot.name);
assert("备份文件非空", snapshot.size > 0, `${snapshot.size} B`);

const listed = await call("/api/backup/list");
assert("列出备份", listed.json.snapshots.length === 1);

const downloaded = await call(`/api/backup/download?name=${snapshot.name}`, { raw: true });
const dbBytes = Buffer.from(await downloaded.arrayBuffer());
assert(
  "下载备份",
  downloaded.status === 200 && dbBytes.subarray(0, 15).toString("latin1") === "SQLite format 3",
  `HTTP ${downloaded.status}`,
);
assert(
  "下载带附件头",
  (downloaded.headers.get("content-disposition") ?? "").includes(snapshot.name),
);

const badName = await call("/api/backup/download?name=../../portal.db", { raw: true });
assert("下载拒绝路径穿越", badName.status === 404, `HTTP ${badName.status}`);

// 导入与恢复会重建行，编号会变，这里重新取一次
const currentFirst = (await portalOf()).items[0];
await call(`/api/items/${currentFirst.id}`, { method: "PATCH", body: { title: "备份之后改的" } });
await call("/api/categories", { method: "POST", body: { name: "又一个临时分类" } });
assert(
  "改动已生效",
  (await portalOf()).items.some((i) => i.title === "备份之后改的"),
);

const noConfirm = await call("/api/backup/restore", {
  method: "POST",
  body: { name: snapshot.name },
});
assert(
  "恢复必须二次确认",
  noConfirm.status === 400,
  `HTTP ${noConfirm.status} ${noConfirm.json?.error}`,
);

const restored = await call("/api/backup/restore", {
  method: "POST",
  body: { name: snapshot.name, confirm: true },
});
assert(
  "恢复成功",
  restored.status === 200,
  `HTTP ${restored.status} ${JSON.stringify(restored.json)}`,
);
const afterRestore = await portalOf();
assert("恢复后改动消失", !afterRestore.items.some((i) => i.title === "备份之后改的"));
assert("恢复后临时分类消失", !afterRestore.categories.some((c) => c.name === "又一个临时分类"));
assert("恢复后条目完整", afterRestore.items.length === 15, `${afterRestore.items.length}`);
assert("恢复不影响登录", (await call("/api/auth/session")).json.authenticated === true);

const missing = await call("/api/backup/restore", {
  method: "POST",
  body: { name: "portal-19700101-000000.db", confirm: true },
});
assert(
  "恢复不存在的备份报错",
  missing.status === 400,
  `HTTP ${missing.status} ${missing.json?.error}`,
);

console.log(failures ? `\n${failures} 条断言失败` : "\n全部通过");
process.exitCode = failures ? 1 : 0;
