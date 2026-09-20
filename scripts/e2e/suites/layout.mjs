const USER = process.env.E2E_USER ?? "ivy";
const PASSWORD = process.env.E2E_PASSWORD ?? "test-password-123";
const BASE = process.env.BASE ?? "http://127.0.0.1:3110";
let cookie = "";
function assert(label, condition, detail) {
  console.log(
    `${condition ? "PASS" : "FAIL"}  ${label}${detail === undefined ? "" : `  ${detail}`}`,
  );
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
const home = () => fetch(`${BASE}/`).then((r) => r.text());
// 首页第一条网格容器的 class
const gridClass = (html) => {
  const m = /class="(grid [^"]*)"/.exec(html);
  return m ? m[1] : null;
};

const anon = await call("/api/settings", {
  method: "PATCH",
  body: { layout: "list" },
  auth: false,
});
assert("匿名改布局被拒", anon.status === 401, `HTTP ${anon.status}`);

const before = await home();
assert(
  "默认布局是卡片网格",
  gridClass(before)?.includes("lg:grid-cols-3") === true,
  gridClass(before),
);

const login = await call("/api/auth/login", {
  method: "POST",
  body: { username: USER, password: PASSWORD },
  auth: false,
});
assert("登录成功", login.status === 200, `HTTP ${login.status}`);

const bad = await call("/api/settings", { method: "PATCH", body: { layout: "masonry" } });
assert("未知布局被拒", bad.status === 400, `HTTP ${bad.status}`);

const toList = await call("/api/settings", { method: "PATCH", body: { layout: "list" } });
assert(
  "写入列表布局成功",
  toList.status === 200 && toList.json?.layout === "list",
  JSON.stringify(toList.json),
);
const listHtml = await home();
assert(
  "首页渲染成单列列表",
  gridClass(listHtml)?.includes("grid-cols-1") === true,
  gridClass(listHtml),
);
assert("列表形态出现（域名行）", listHtml.includes("github.com") || listHtml.includes(">打开<"));

const toCompact = await call("/api/settings", { method: "PATCH", body: { layout: "compact" } });
assert("写入紧凑布局成功", toCompact.status === 200 && toCompact.json?.layout === "compact");
const compactHtml = await home();
assert(
  "首页渲染成三到六列方块",
  gridClass(compactHtml)?.includes("grid-cols-3") === true,
  gridClass(compactHtml),
);

// 两个偏好互不干扰
const both = await call("/api/settings", {
  method: "PATCH",
  body: { layout: "card", palette: "violet" },
});
assert(
  "可以同时写两项",
  both.status === 200 && both.json?.layout === "card" && both.json?.palette === "violet",
  JSON.stringify(both.json),
);
const finalHtml = await home();
assert(
  "布局回到卡片",
  gridClass(finalHtml)?.includes("lg:grid-cols-3") === true,
  gridClass(finalHtml),
);
assert("配色仍是紫罗兰", finalHtml.includes('data-palette="violet"'));

const exported = await call("/api/backup/export");
assert(
  "导出带上 homepage.layout",
  exported.text.includes("homepage.layout"),
  `HTTP ${exported.status}`,
);
