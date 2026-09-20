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
const gridClasses = (html) => [...html.matchAll(/class="(grid [^"]*)"/g)].map((m) => m[1]);
const CARD = "grid-cols-2";
const LIST = "grid-cols-1";
const COMPACT = "sm:grid-cols-4";

const anon = await call("/api/categories/1", {
  method: "PATCH",
  body: { layout: "list" },
  auth: false,
});
assert("匿名改布局被拒", anon.status === 401, `HTTP ${anon.status}`);

const before = gridClasses(await home());
assert(
  "默认每个分区都是卡片网格",
  before.length > 0 && before.every((c) => c.includes(CARD)),
  `${before.length} 个网格`,
);

const login = await call("/api/auth/login", {
  method: "POST",
  body: { username: USER, password: PASSWORD },
  auth: false,
});
assert("登录成功", login.status === 200, `HTTP ${login.status}`);

const bad = await call("/api/categories/1", { method: "PATCH", body: { layout: "masonry" } });
assert("未知布局被拒", bad.status === 400, `HTTP ${bad.status}`);

const first = await call("/api/categories/1", { method: "PATCH", body: { layout: "list" } });
assert("给分类 1 设成列表", first.status === 200, `HTTP ${first.status}`);

const mixed = gridClasses(await home());
assert(
  "分类 1 变成单列列表",
  mixed.some((c) => c.includes(LIST)),
  JSON.stringify(mixed.slice(0, 3)),
);
assert(
  "其余分类仍是卡片（不是全局切换）",
  mixed.some((c) => c.includes(CARD)),
  `${mixed.length} 个网格`,
);

const second = await call("/api/categories/2", { method: "PATCH", body: { layout: "compact" } });
assert(
  "给分类 2 设成紧凑",
  second.status === 200 &&
    second.json?.portal?.categories?.some((c) => c.id === 2 && c.layout === "compact"),
);
const three = gridClasses(await home());
assert(
  "三种布局可以同时存在",
  three.some((c) => c.includes(LIST)) &&
    three.some((c) => c.includes(COMPACT)) &&
    three.some((c) => c.includes(CARD)),
  `${three.length} 个网格`,
);

const reset = await call("/api/categories/1", { method: "PATCH", body: { layout: null } });
assert(
  "可以回到默认（null）",
  reset.status === 200 && reset.json?.portal?.categories?.find((c) => c.id === 1)?.layout === null,
);

const wrongRoute = await call("/api/settings", { method: "PATCH", body: { layout: "list" } });
assert(
  "设置接口拒绝 layout（布局挂在分类上）",
  wrongRoute.status === 400,
  `HTTP ${wrongRoute.status}`,
);
const palette = await call("/api/settings", { method: "PATCH", body: { palette: "clay" } });
assert("设置接口仍然接受配色", palette.status === 200 && palette.json?.palette === "clay");

const exported = await call("/api/backup/export");
assert("导出里带上分类布局", exported.text.includes('"layout"'), `HTTP ${exported.status}`);

console.log(failures ? `\n${failures} 条断言失败` : "\n全部通过");
process.exitCode = failures ? 1 : 0;
