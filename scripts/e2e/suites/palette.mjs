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

// 1. 匿名不能改配色
const anon = await call("/api/settings", {
  method: "PATCH",
  body: { palette: "clay" },
  auth: false,
});
assert("匿名改配色被拒", anon.status === 401, `HTTP ${anon.status}`);

// 2. 默认配色由基础 token 承担
const before = await home();
assert("首页默认 data-palette=leaf", before.includes('data-palette="leaf"'));
assert("首页带上了配色样式表", before.includes("data-palette"));
assert("匿名首页不含 Private 内容", !before.includes("个人服务器"));

// 3. 登录
const login = await call("/api/auth/login", {
  method: "POST",
  body: { username: USER, password: PASSWORD },
  auth: false,
});
assert("登录成功", login.status === 200, `HTTP ${login.status}`);

// 4. 未知取值被拒
const bad = await call("/api/settings", { method: "PATCH", body: { palette: "neon" } });
assert("未知配色被拒", bad.status === 400, `HTTP ${bad.status}`);
const empty = await call("/api/settings", { method: "PATCH", body: {} });
assert("空请求被拒", empty.status === 400, `HTTP ${empty.status}`);

// 5. 写入
const ok = await call("/api/settings", { method: "PATCH", body: { palette: "clay" } });
assert("写入配色成功", ok.status === 200 && ok.json?.palette === "clay", JSON.stringify(ok.json));

// 6. 首页服务端就渲染成新配色（不依赖 JS，所以不会闪）
const after = await home();
assert("首页 data-palette 变成 clay", after.includes('data-palette="clay"'));

// 7. 换回默认
const back = await call("/api/settings", { method: "PATCH", body: { palette: "leaf" } });
assert("切回默认配色", back.status === 200 && (await home()).includes('data-palette="leaf"'));

// 7b. 图标默认摆法：同一个接口的第二个偏好项
const fitBad = await call("/api/settings", { method: "PATCH", body: { iconFit: "stretch" } });
assert("未知的图标摆法被拒", fitBad.status === 400, `HTTP ${fitBad.status}`);
const fitOk = await call("/api/settings", { method: "PATCH", body: { iconFit: "auto" } });
assert(
  "写入图标摆法成功",
  fitOk.status === 200 && fitOk.json?.iconFit === "auto",
  JSON.stringify(fitOk.json),
);
const fitHome = await call("/api/portal");
assert(
  "首页拿到新的默认摆法",
  fitHome.json?.portal?.defaultIconFit === "auto",
  `${fitHome.json?.portal?.defaultIconFit}`,
);
const fitBack = await call("/api/settings", { method: "PATCH", body: { iconFit: "contain" } });
assert("图标摆法改回默认", fitBack.status === 200 && fitBack.json?.iconFit === "contain");
// 只发配色时不该把另一个偏好项一起抹掉
assert(
  "只改配色不影响图标摆法",
  (await call("/api/portal")).json?.portal?.defaultIconFit === "contain",
);

// 8. 设置跟着备份走
const exported = await call("/api/backup/export");
assert(
  "导出带上 appearance.palette",
  exported.text.includes("appearance.palette"),
  `HTTP ${exported.status}`,
);
