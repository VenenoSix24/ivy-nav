const USER = process.env.E2E_USER ?? "a";
const PASSWORD = process.env.E2E_PASSWORD ?? "concurrent-pass-123";
const BASE = process.env.BASE ?? "http://127.0.0.1:3110";
let cookie = "";

let failures = 0;
function assert(label, condition, detail) {
  console.log(
    `${condition ? "PASS" : "FAIL"}  ${label}${detail === undefined ? "" : `  ${detail}`}`,
  );
  if (!condition) failures += 1;
}

/**
 * 响应体是不是那张 1×1 的透明占位图。
 * 不去数字节数：占位图换个编码就变长变短（曾经断言 70 字节，于是换一张正常 PNG 就误报），
 * 读 IHDR 里的宽高才是它真正的特征。
 */
function isPlaceholderBody(buffer) {
  return (
    buffer.length >= 24 &&
    buffer[0] === 0x89 &&
    buffer.toString("latin1", 1, 4) === "PNG" &&
    buffer.readUInt32BE(16) === 1 &&
    buffer.readUInt32BE(20) === 1
  );
}

async function call(path, { method = "GET", body, auth = true, headers: extra = {} } = {}) {
  const headers = { ...extra };
  if (body !== undefined && typeof body === "string") headers["Content-Type"] = "application/json";
  if (auth && cookie) headers.Cookie = cookie;

  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: typeof body === "string" ? body : body === undefined ? undefined : JSON.stringify(body),
  });

  const setCookie = response.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];

  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* html */
  }
  return { status: response.status, json, text, headers: response.headers };
}

// 账号由 CLI 预先创建，这里直接登录
const login = await fetch(`${BASE}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: USER, password: PASSWORD }),
});
assert("登录成功", login.status === 200, `HTTP ${login.status}`);
cookie = (login.headers.get("set-cookie") ?? "").split(";")[0];
assert("拿到会话 Cookie", cookie.startsWith("ivy_session="));

const listed = await call("/api/backup/list");
assert("管理员可用", listed.status === 200, `HTTP ${listed.status}`);

// ---- F1：换 X-Forwarded-For 也不能绕过限流
const statuses = [];
for (let i = 0; i < 14; i += 1) {
  const response = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": `10.1.1.${i}` },
    body: JSON.stringify({ username: USER, password: "wrong-password" }),
  });
  statuses.push(response.status);
}
assert("轮换 X-Forwarded-For 仍会被限流", statuses.includes(429), statuses.join(","));

// 每次都换用户名与转发头，唯一能拦住它的只能是全局上限
let globalBlockedAt = 0;
for (let i = 0; i < 40 && globalBlockedAt === 0; i += 1) {
  const response = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": `10.9.${i}.1` },
    body: JSON.stringify({ username: `rotating-${i}`, password: "x" }),
  });
  if (response.status === 429) globalBlockedAt = i + 1;
}
assert("轮换用户名与转发头也逃不过全局限流", globalBlockedAt > 0, `第 ${globalBlockedAt} 次被拦`);

// ---- F2：匿名响应不含隐藏分类里的条目
const portal = await call("/api/portal");
const hiddenCategory = portal.json.portal.categories.find((c) => c.name === "Entertainment");
await call(`/api/categories/${hiddenCategory.id}`, {
  method: "PATCH",
  body: { visibleOnHomepage: false },
});

const anonymousHtml = await fetch(`${BASE}/`).then((r) => r.text());
// 只断言被隐藏的那个分类：其余分类现在默认都在首页显示
assert("匿名响应不含被隐藏分类的条目", !anonymousHtml.includes("YouTube"), "Entertainment 已隐藏");
assert("匿名响应仍含首页分类的条目", anonymousHtml.includes("Vercel"));

// ---- F6：Private 条目的图标对外是 404，不暴露它存在
const adminPortal = await call("/api/portal");
const privateItem = adminPortal.json.portal.items.find((item) => item.visibility === "private");
const croppedCookie = cookie;
cookie = "";
const anonIcon = await call(`/api/icons/favicon?item=${privateItem.id}`, { auth: false });
assert("匿名取 Private 条目图标返回 404", anonIcon.status === 404, `HTTP ${anonIcon.status}`);
const anonMissing = await call("/api/icons/favicon?item=999999", { auth: false });
assert("不存在的编号同样是 404", anonMissing.status === 404);
cookie = croppedCookie;

// ---- F3：指向内网地址的条目不会触发抓取
const created = await call("/api/items", {
  method: "POST",
  body: {
    title: "内网目标",
    url: "http://127.0.0.1:3222/",
    categoryId: adminPortal.json.portal.categories[0].id,
  },
});
const internalItem = created.json.portal.items.find((i) => i.title === "内网目标");
const internalIcon = await fetch(`${BASE}/api/icons/favicon?item=${internalItem.id}`);
const internalIconBody = Buffer.from(await internalIcon.arrayBuffer());
assert(
  "回环地址只回透明占位图（未发起抓取）",
  internalIcon.status === 200 &&
    isPlaceholderBody(internalIconBody) &&
    internalIcon.headers.get("content-type") === "image/png",
  `HTTP ${internalIcon.status} ${internalIconBody.length}B`,
);

const privateRangeItem = await call("/api/items", {
  method: "POST",
  body: {
    title: "局域网目标",
    url: "http://169.254.169.254/latest/meta-data/",
    categoryId: adminPortal.json.portal.categories[0].id,
  },
});
const linkLocal = privateRangeItem.json.portal.items.find((i) => i.title === "局域网目标");
const linkLocalIcon = await fetch(`${BASE}/api/icons/favicon?item=${linkLocal.id}`);
const linkLocalIconBody = Buffer.from(await linkLocalIcon.arrayBuffer());
assert(
  "link-local 地址只回透明占位图（未发起抓取）",
  linkLocalIcon.status === 200 &&
    isPlaceholderBody(linkLocalIconBody) &&
    linkLocalIcon.headers.get("content-type") === "image/png",
  `HTTP ${linkLocalIcon.status} ${linkLocalIconBody.length}B`,
);

const hexItem = await call("/api/items", {
  method: "POST",
  body: {
    title: "十六进制写法",
    url: "http://0x7f000001:3222/",
    categoryId: adminPortal.json.portal.categories[0].id,
  },
});
const hex = hexItem.json.portal.items.find((i) => i.title === "十六进制写法");
const hexIcon = await fetch(`${BASE}/api/icons/favicon?item=${hex.id}`);
const hexIconBody = Buffer.from(await hexIcon.arrayBuffer());
assert(
  "0x7f000001 这类写法只回透明占位图（未发起抓取）",
  hexIcon.status === 200 &&
    isPlaceholderBody(hexIconBody) &&
    hexIcon.headers.get("content-type") === "image/png",
  `HTTP ${hexIcon.status} ${hexIconBody.length}B`,
);

// ---- F8：管理数据响应禁止中间缓存
const portalAgain = await call("/api/portal");
assert(
  "管理接口带 no-store",
  (portalAgain.headers.get("cache-control") ?? "").includes("no-store"),
  portalAgain.headers.get("cache-control"),
);

console.log(failures ? `\n${failures} 条断言失败` : "\n全部通过");
process.exitCode = failures ? 1 : 0;
