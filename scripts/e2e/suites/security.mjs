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

// ---- 分类级隐藏：整类设为 Private 之后，匿名连分类带条目都看不到。
// 匿名视图没有 JSON 接口（/api/portal 是管理接口），所以照旧读首页 HTML 来判断。
const PROBE_CATEGORY = "整类隐藏探针";
const PROBE_ITEM = "整类隐藏样例";

const probeCategory = await call("/api/categories", {
  method: "POST",
  body: { name: PROBE_CATEGORY, visibleOnHomepage: true },
});
const probeCategoryId = probeCategory.json?.portal?.categories?.find(
  (category) => category.name === PROBE_CATEGORY,
)?.id;

const probeItem = await call("/api/items", {
  method: "POST",
  body: {
    title: PROBE_ITEM,
    url: "https://example.com/",
    categoryId: probeCategoryId,
    visibility: "public",
  },
});
assert(
  "建好探针分类与公开条目",
  Boolean(probeCategoryId) && probeItem.status === 200,
  `分类 ${probeCategoryId}`,
);

const anonBefore = await fetch(`${BASE}/`).then((r) => r.text());
assert(
  "隐藏之前匿名首页能看到这个分类与条目",
  anonBefore.includes(PROBE_CATEGORY) && anonBefore.includes(PROBE_ITEM),
);

const hidden = await call(`/api/categories/${probeCategoryId}`, {
  method: "PATCH",
  body: { visibility: "private" },
});
assert("把分类设为整类隐藏", hidden.status === 200, `HTTP ${hidden.status}`);

const anonHidden = await fetch(`${BASE}/`).then((r) => r.text());
assert(
  "匿名首页连分类带条目都没有了",
  !anonHidden.includes(PROBE_CATEGORY) && !anonHidden.includes(PROBE_ITEM),
);

const adminAfterHide = await call("/api/portal");
assert(
  "登录后仍然看得到整类隐藏的分类与条目",
  (adminAfterHide.json?.portal?.categories ?? []).some((c) => c.id === probeCategoryId) &&
    (adminAfterHide.json?.portal?.items ?? []).some((item) => item.title === PROBE_ITEM),
);

await call(`/api/categories/${probeCategoryId}`, {
  method: "PATCH",
  body: { visibility: "public" },
});
const anonRestored = await fetch(`${BASE}/`).then((r) => r.text());
assert(
  "恢复公开后又回来了",
  anonRestored.includes(PROBE_CATEGORY) && anonRestored.includes(PROBE_ITEM),
);

const cleanupPortal = await call("/api/portal");
const probeItemId = (cleanupPortal.json?.portal?.items ?? []).find(
  (item) => item.title === PROBE_ITEM,
)?.id;
if (probeItemId) await call(`/api/items/${probeItemId}`, { method: "DELETE" });
await call(`/api/categories/${probeCategoryId}`, { method: "DELETE" });

// ---- 按网址猜标题（/api/site-meta）：同样是管理接口，也走同一套出口检查
const metaAnon = await call("/api/site-meta?url=github.com", { auth: false });
assert("匿名问标题被拒", metaAnon.status === 401, `HTTP ${metaAnon.status}`);

const metaEmpty = await call("/api/site-meta?url=");
assert("空网址被拒", metaEmpty.status === 400, `HTTP ${metaEmpty.status}`);

const metaBad = await call("/api/site-meta?url=javascript:alert(1)");
assert("非 http(s) 网址被拒", metaBad.status === 400, `HTTP ${metaBad.status}`);

// 回环地址：出口检查拦下，不去抓，但「猜不到标题」不算错误
const metaPrivate = await call("/api/site-meta?url=http%3A%2F%2F127.0.0.1%3A3222%2F");
assert(
  "内网地址只回 title: null（未发起抓取）",
  metaPrivate.status === 200 && metaPrivate.json?.title === null,
  `HTTP ${metaPrivate.status} ${JSON.stringify(metaPrivate.json)}`,
);

// ---- 图标候选（/api/icons/candidates）：一次列出所有取图方案，同样只有管理员能用
const candidatesAnon = await call("/api/icons/candidates?url=example.com", { auth: false });
assert("匿名列图标候选被拒", candidatesAnon.status === 401, `HTTP ${candidatesAnon.status}`);

const candidatesEmpty = await call("/api/icons/candidates?url=");
assert(
  "网址还没填时列空候选而不是报错",
  candidatesEmpty.status === 200 && Array.isArray(candidatesEmpty.json?.candidates)
    ? candidatesEmpty.json.candidates.length === 0
    : false,
  `HTTP ${candidatesEmpty.status} ${JSON.stringify(candidatesEmpty.json)}`,
);

// 回环地址：出口检查拦下，每个方案都取不到，前端据此把格子画成灰的
const candidatesPrivate = await call("/api/icons/candidates?url=http%3A%2F%2F127.0.0.1%3A3222%2F");
assert(
  "内网地址的候选全部是取不到",
  candidatesPrivate.status === 200 &&
    Array.isArray(candidatesPrivate.json?.candidates) &&
    candidatesPrivate.json.candidates.length > 0 &&
    candidatesPrivate.json.candidates.every((entry) => entry.status === "miss"),
  `HTTP ${candidatesPrivate.status} ${JSON.stringify(candidatesPrivate.json)}`,
);

const resolveBadSource = await call("/api/icons/resolve?url=example.com&source=google");
assert("认不出的图标来源被拒", resolveBadSource.status === 400, `HTTP ${resolveBadSource.status}`);

// ---- 图标库（/api/icons/library）：搜、看、挑三段都是管理接口
const libraryAnon = await call("/api/icons/library", { auth: false });
assert("匿名列图标库被拒", libraryAnon.status === 401, `HTTP ${libraryAnon.status}`);

const libraryList = await call("/api/icons/library");
const libraryIds = (libraryList.json?.libraries ?? []).map((entry) => entry.id);
assert(
  "默认三套：Simple Icons、Iconify 在服务端，Lucide 在前端",
  libraryIds[0] === "simple-icons" && libraryIds[1] === "iconify",
  JSON.stringify(libraryIds),
);

const libraryBad = await call("/api/icons/library/search?lib=nope&q=home");
assert("认不出的图标库被拒", libraryBad.status === 400, `HTTP ${libraryBad.status}`);

// Simple Icons 的数据随包装在本地：这条断言同时盯着「搜索不依赖外网」
const siSearch = await call("/api/icons/library/search?lib=simple-icons&q=github");
assert(
  "Simple Icons 搜得到 GitHub 并带上品牌色",
  siSearch.status === 200 && siSearch.json?.hits?.[0]?.name === "github"
    ? siSearch.json.hits[0].color === "#181717"
    : false,
  `HTTP ${siSearch.status} ${JSON.stringify(siSearch.json?.hits?.[0])}`,
);

const siIcon = await call("/api/icons/library/icon?lib=simple-icons&name=github");
assert(
  "图标缩略图回 SVG",
  siIcon.status === 200 && (siIcon.headers.get("content-type") ?? "").includes("svg"),
  `HTTP ${siIcon.status} ${siIcon.headers.get("content-type")}`,
);

const pickAnon = await call("/api/icons/library/pick", {
  method: "POST",
  auth: false,
  body: { library: "simple-icons", name: "github" },
});
assert("匿名挑图标被拒", pickAnon.status === 401, `HTTP ${pickAnon.status}`);

const picked = await call("/api/icons/library/pick", {
  method: "POST",
  body: { library: "simple-icons", name: "github", color: "#ffffff" },
});
const pickedName = picked.json?.filename;
assert(
  "挑中的图标落成本地文件（名字可读、带哈希）",
  picked.status === 200 && /^simple-icons-github-ffffff_[a-f0-9]{16}\.svg$/.test(pickedName ?? ""),
  `HTTP ${picked.status} ${JSON.stringify(picked.json)}`,
);

const pickedFile = await call(`/api/icons/file/${pickedName}`);
assert(
  "落下来的那张能当图片取回",
  pickedFile.status === 200 && (pickedFile.headers.get("content-type") ?? "").includes("svg"),
  `HTTP ${pickedFile.status}`,
);

const pickBadLibrary = await call("/api/icons/library/pick", {
  method: "POST",
  body: { library: "set:9999", name: "x" },
});
assert("往不存在的库挑被拒", pickBadLibrary.status === 400, `HTTP ${pickBadLibrary.status}`);

// ---- 自建图标集（/api/icon-sets）：地址、抓取、删除
const setsAnon = await call("/api/icon-sets", { auth: false });
assert("匿名列图标集被拒", setsAnon.status === 401, `HTTP ${setsAnon.status}`);

const setBadUrl = await call("/api/icon-sets", {
  method: "POST",
  body: { url: "javascript:alert(1)" },
});
assert("图标集地址只收 http(s)", setBadUrl.status === 400, `HTTP ${setBadUrl.status}`);

const setLoopback = await call("/api/icon-sets", {
  method: "POST",
  body: { url: "http://127.0.0.1:3222/icons.json" },
});
assert(
  "内网地址的图标集抓不到（出口检查拦下）",
  setLoopback.status === 400,
  `HTTP ${setLoopback.status} ${JSON.stringify(setLoopback.json)}`,
);

const setDeleteMissing = await call("/api/icon-sets?id=9999", { method: "DELETE" });
assert(
  "删不存在的图标集回 404",
  setDeleteMissing.status === 404,
  `HTTP ${setDeleteMissing.status}`,
);

// ---- 图标底板与单色跟随主题：两个新列要能存能取（迁移在既有库上加的列）
const portalBefore = await call("/api/portal");
const firstItem = (portalBefore.json?.portal?.items ?? [])[0];
assert(
  "新建条目默认带底板、不跟随主题",
  firstItem?.iconPlate === true && firstItem?.iconMono === false,
  JSON.stringify({ plate: firstItem?.iconPlate, mono: firstItem?.iconMono }),
);

const flagPatch = await call(`/api/items/${firstItem?.id}`, {
  method: "PATCH",
  body: {
    title: firstItem?.title,
    url: firstItem?.url,
    iconPlate: false,
    iconMono: true,
  },
});
assert(
  "底板与跟随主题存得进去",
  flagPatch.status === 200 &&
    flagPatch.json?.portal?.items?.find((entry) => entry.id === firstItem?.id)?.iconPlate ===
      false &&
    flagPatch.json.portal.items.find((entry) => entry.id === firstItem?.id)?.iconMono === true,
  `HTTP ${flagPatch.status}`,
);

const flagsBack = await call(`/api/items/${firstItem?.id}`, {
  method: "PATCH",
  body: { title: firstItem?.title, url: firstItem?.url, iconPlate: true, iconMono: false },
});
assert(
  "改回来也对（不是只认 true/false 里的一个）",
  flagsBack.status === 200 &&
    flagsBack.json?.portal?.items?.find((entry) => entry.id === firstItem?.id)?.iconPlate === true,
  `HTTP ${flagsBack.status}`,
);

// ---- 图标摆法（原样 / 自动裁边 / 裁剪铺满 / 拉伸）：这一列要能存能取
const fitPatch = await call(`/api/items/${firstItem?.id}`, {
  method: "PATCH",
  body: { title: firstItem?.title, url: firstItem?.url, iconFit: "auto" },
});
assert(
  "图标摆法存得进去",
  fitPatch.status === 200 &&
    fitPatch.json?.portal?.items?.find((entry) => entry.id === firstItem?.id)?.iconFit === "auto" &&
    fitPatch.json.portal.items.find((entry) => entry.id === firstItem?.id)?.iconFitOwn === "auto",
  `HTTP ${fitPatch.status} ${JSON.stringify(fitPatch.json?.portal?.items?.[0]?.iconFit)}`,
);

const fitBad = await call(`/api/items/${firstItem?.id}`, {
  method: "PATCH",
  body: { title: firstItem?.title, url: firstItem?.url, iconFit: "stretch" },
});
assert("认不出的图标摆法被拒", fitBad.status === 400, `HTTP ${fitBad.status}`);

// 默认值：条目没设过就跟设置页里那个走，设过就听条目自己的
const fitDefault = await call("/api/settings", { method: "PATCH", body: { iconFit: "cover" } });
assert("设置默认图标摆法", fitDefault.status === 200, `HTTP ${fitDefault.status}`);
const fitFollows = (await call("/api/portal")).json?.portal;
assert(
  "没设过的条目跟随默认",
  fitFollows?.defaultIconFit === "cover" &&
    fitFollows.items
      .filter((entry) => entry.iconFitOwn === null)
      .every((entry) => entry.iconFit === "cover"),
  JSON.stringify({ default: fitFollows?.defaultIconFit }),
);
assert(
  "设过的条目不受默认影响",
  fitFollows?.items.find((entry) => entry.id === firstItem?.id)?.iconFit === "auto",
  JSON.stringify(fitFollows?.items.find((entry) => entry.id === firstItem?.id)?.iconFit),
);
const fitReset = await call("/api/settings", { method: "PATCH", body: { iconFit: "contain" } });
assert("默认摆法改回原样", fitReset.status === 200, `HTTP ${fitReset.status}`);

const fitClear = await call(`/api/items/${firstItem?.id}`, {
  method: "PATCH",
  body: { title: firstItem?.title, url: firstItem?.url, iconFit: null },
});
assert(
  "条目可以交还给默认",
  fitClear.status === 200 &&
    fitClear.json?.portal?.items?.find((entry) => entry.id === firstItem?.id)?.iconFitOwn === null,
  `HTTP ${fitClear.status}`,
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
