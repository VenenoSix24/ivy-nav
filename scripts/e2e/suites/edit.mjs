import Database from "better-sqlite3";
import path from "node:path";

const USER = process.env.E2E_USER ?? "ivy";
const PASSWORD = process.env.E2E_PASSWORD ?? "test-password-123";
const BASE = process.env.BASE ?? "http://127.0.0.1:3110";
const DATA_DIR = process.env.DATA_DIR ?? "data";
let cookie = "";

function assert(label, condition, detail) {
  const mark = condition ? "PASS" : "FAIL";
  console.log(`${mark}  ${label}${detail === undefined ? "" : `  ${detail}`}`);
  if (!condition) process.exitCode = 1;
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
  return { status: response.status, json, text };
}

const home = () =>
  fetch(`${BASE}/`, { headers: cookie ? { Cookie: cookie } : {} }).then((r) => r.text());

const guard = await call("/api/items", {
  method: "POST",
  body: { title: "x", url: "example.com" },
  auth: false,
});
assert("匿名调用写接口被拒", guard.status === 401, `HTTP ${guard.status}`);

const portalGuard = await call("/api/portal", { auth: false });
assert("匿名读取管理数据被拒", portalGuard.status === 401, `HTTP ${portalGuard.status}`);

const beforeHtml = await home();
assert("匿名首页不含 Private 条目", !beforeHtml.includes("个人服务器"));

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

const portal = await call("/api/portal");
assert(
  "管理端拿到全部分类",
  portal.json.portal.categories.length === 7,
  `${portal.json.portal.categories.length} 个`,
);
assert(
  "管理端拿到全部条目",
  portal.json.portal.items.length === 15,
  `${portal.json.portal.items.length} 条`,
);
assert(
  "管理端能看到 Private 条目",
  portal.json.portal.items.some((item) => item.visibility === "private"),
);

const development = portal.json.portal.categories.find((c) => c.name === "Development");
const tools = portal.json.portal.categories.find((c) => c.name === "Tools");

const created = await call("/api/items", {
  method: "POST",
  body: {
    title: "Playwright",
    url: "playwright.dev",
    description: "浏览器自动化测试。",
    categoryId: development.id,
    tagNames: ["#Test", "test", "QA"],
    featured: true,
  },
});
assert("新建条目", created.status === 200, `HTTP ${created.status}`);
const newItem = created.json.portal.items.find((item) => item.title === "Playwright");
assert("网址被规范化成 https", newItem?.url === "https://playwright.dev/", newItem?.url);
assert(
  "标签去重且去掉 # 前缀",
  JSON.stringify(newItem?.tags) === '["QA","Test"]',
  JSON.stringify(newItem?.tags),
);
assert("置顶已保存", newItem?.featured === true);
assert("默认可见性为 public", newItem?.visibility === "public");
const developmentItems = created.json.portal.items.filter((i) => i.categoryId === development.id);
assert("新条目排在所属分类末尾", developmentItems[developmentItems.length - 1]?.id === newItem?.id);

const patched = await call(`/api/items/${newItem.id}`, {
  method: "PATCH",
  body: { visibility: "private", description: "只有登录后可见的测试工具。" },
});
assert(
  "切换为 Private",
  patched.status === 200 &&
    patched.json.portal.items.find((i) => i.id === newItem.id)?.visibility === "private",
);

const renamed = await call(`/api/items/${newItem.id}`, {
  method: "PATCH",
  body: { title: "Playwright Test" },
});
assert(
  "改标题",
  renamed.json.portal.items.find((i) => i.id === newItem.id)?.title === "Playwright Test",
);

const badUrl = await call(`/api/items/${newItem.id}`, {
  method: "PATCH",
  body: { url: "javascript:alert(1)" },
});
assert("危险协议被拒", badUrl.status === 400, `HTTP ${badUrl.status} ${badUrl.json?.error ?? ""}`);

const moved = await call(`/api/items/${newItem.id}`, {
  method: "PATCH",
  body: { categoryId: tools.id },
});
const movedItem = moved.json.portal.items.find((i) => i.id === newItem.id);
assert("移动到 Tools", movedItem?.categoryId === tools.id);
const toolsItems = moved.json.portal.items.filter((i) => i.categoryId === tools.id);
assert("移动后落到目标分类末尾", toolsItems[toolsItems.length - 1]?.id === newItem.id);

const reversed = [...toolsItems].reverse().map((i) => i.id);
const reordered = await call("/api/items/reorder", {
  method: "POST",
  body: { orderedIds: reversed },
});
const afterOrder = reordered.json.portal.items
  .filter((i) => i.categoryId === tools.id)
  .map((i) => i.id);
assert(
  "排序按给定顺序写回",
  JSON.stringify(afterOrder) === JSON.stringify(reversed),
  JSON.stringify(afterOrder),
);

const newCategory = await call("/api/categories", {
  method: "POST",
  body: { name: "Reading", visibleOnHomepage: false },
});
assert(
  "新建分类",
  newCategory.status === 200 &&
    newCategory.json.portal.categories.some((c) => c.name === "Reading"),
);
const reading = newCategory.json.portal.categories.find((c) => c.name === "Reading");
assert("新分类默认不显示在首页", reading.visibleOnHomepage === false);

const duplicate = await call("/api/categories", { method: "POST", body: { name: "Reading" } });
assert("重名分类被拒", duplicate.status === 409, `HTTP ${duplicate.status}`);

const shown = await call(`/api/categories/${reading.id}`, {
  method: "PATCH",
  body: { visibleOnHomepage: true },
});
assert(
  "改为显示在首页",
  shown.json.portal.categories.find((c) => c.id === reading.id)?.visibleOnHomepage === true,
);

const categoryOrder = [
  reading.id,
  ...shown.json.portal.categories.filter((c) => c.id !== reading.id).map((c) => c.id),
];
const reorderedCategories = await call("/api/categories/reorder", {
  method: "POST",
  body: { orderedIds: categoryOrder },
});
assert(
  "分类顺序写回",
  JSON.stringify(reorderedCategories.json.portal.categories.map((c) => c.id)) ===
    JSON.stringify(categoryOrder),
);

const deletedItem = await call(`/api/items/${newItem.id}`, { method: "DELETE" });
assert(
  "删除条目",
  deletedItem.status === 200 && !deletedItem.json.portal.items.some((i) => i.id === newItem.id),
);

const design = deletedItem.json.portal.categories.find((c) => c.name === "Design");
const designCount = deletedItem.json.portal.items.filter((i) => i.categoryId === design.id).length;
const deletedCategory = await call(`/api/categories/${design.id}`, { method: "DELETE" });
const inbox = deletedCategory.json.portal.items.filter((i) => i.categoryId === null);
assert("删除分类后条目退到 Inbox", inbox.length === designCount, `${inbox.length} 条`);
assert(
  "Inbox 条目仍然存在",
  deletedCategory.json.portal.items.length === 15,
  `${deletedCategory.json.portal.items.length} 条`,
);

const missing = await call(`/api/categories/${reading.id}`, {
  method: "PATCH",
  body: { name: "Reading 2" },
});
assert("存在的分类仍可改", missing.status === 200);
const gone = await call(`/api/items/999999`, { method: "DELETE" });
assert("删除不存在的条目返回 404", gone.status === 404, `HTTP ${gone.status}`);

const adminHtml = await home();
assert("管理员首页含 Private 条目", adminHtml.includes("个人服务器"));
assert("管理员首页含新分类", adminHtml.includes("Reading"));

const anonymous = await fetch(`${BASE}/`).then((r) => r.text());
assert("匿名首页仍不含 Private 条目", !anonymous.includes("个人服务器"));
assert("匿名首页含首页分类的条目", anonymous.includes("GitHub"));

const editingHtml = await fetch(`${BASE}/`, {
  headers: { Cookie: `${cookie}; ivy_edit=1` },
}).then((r) => r.text());
assert("编辑态首页有「整理分类」入口", editingHtml.includes("整理分类"));
assert(
  "编辑态首页每个分区都有分类菜单",
  editingHtml.includes("分类的操作"),
  `${(editingHtml.match(/分类的操作/g) ?? []).length} 个`,
);

const settingsHtml = await call("/settings");
assert(
  "分类设置已从设置页移走",
  !settingsHtml.text.includes("首页分类") && settingsHtml.text.includes("整理分类"),
);
assert("设置页有「标签」一节", settingsHtml.text.includes("改成一个已经存在的名字就是合并过去"));

// 标签改名：改到已经存在的名字就是合并过去
/** 标签没有列表接口，直接读库拿编号 */
function tagId(name) {
  const db = new Database(path.join(DATA_DIR, "portal.db"), { readonly: true });
  const row = db.prepare("select id from tags where name = ?").get(name);
  db.close();
  return row?.id ?? null;
}

await call("/api/items", {
  method: "POST",
  body: { title: "标签改名甲", url: "https://tag-a.example/", tagNames: ["旧标签戊"] },
});
await call("/api/items", {
  method: "POST",
  body: { title: "标签改名乙", url: "https://tag-b.example/", tagNames: ["目标标签戊"] },
});
const sourceTagId = tagId("旧标签戊");
assert("新建条目的标签落了库", typeof sourceTagId === "number", `tag=${sourceTagId}`);

const tagRenamed = await call(`/api/tags/${sourceTagId}`, {
  method: "PATCH",
  body: { name: "目标标签戊" },
});
assert(
  "改到已存在的名字会合并",
  tagRenamed.status === 200 && tagRenamed.json?.merged === true,
  `HTTP ${tagRenamed.status} merged=${tagRenamed.json?.merged}`,
);
assert(
  "合并后同名标签只剩一个",
  (tagRenamed.json?.tags ?? []).filter((tag) => tag.name === "目标标签戊").length === 1,
);

const afterRename = await call("/api/portal");
const renamedItems = (afterRename.json?.portal?.items ?? []).filter((item) =>
  item.title.startsWith("标签改名"),
);
assert(
  "两个条目都挂到了合并后的标签上",
  renamedItems.length === 2 && renamedItems.every((item) => item.tags.includes("目标标签戊")),
  JSON.stringify(renamedItems.map((item) => item.tags)),
);

const blankName = await call(`/api/tags/${sourceTagId}`, {
  method: "PATCH",
  body: { name: "   " },
});
assert("空名字被拒", blankName.status === 400, `HTTP ${blankName.status}`);

const loggedOut = await call("/api/auth/logout", { method: "POST" });
assert("退出登录", loggedOut.status === 200);
const afterLogout = await call("/api/portal");
assert("退出后管理接口失效", afterLogout.status === 401, `HTTP ${afterLogout.status}`);

console.log(process.exitCode ? "\n有断言失败" : "\n全部通过");
