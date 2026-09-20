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
  } catch {
    /* html */
  }
  return { status: response.status, json, text };
}

const portal = async () => (await call("/api/portal")).json?.portal;
const itemTitles = async () => (await portal())?.items?.map((row) => row.title) ?? [];

/**
 * Chrome（简体中文）导出的结构：一层「书签栏」包住用户自己的目录。
 * 网址刻意避开种子数据里的那几个域名 —— 否则会被当成「库里已有」而跳过。
 */
const BOOKMARKS = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3 PERSONAL_TOOLBAR_FOLDER="true">书签栏</H3>
    <DL><p>
        <DT><H3>设计</H3>
        <DL><p>
            <DT><H3>灵感</H3>
            <DL><p><DT><A HREF="https://shots.example.org/">Shots</A></DL><p>
            <DT><A HREF="https://figma.example.org/">Figma &amp; friends</A>
            <DD>在线设计工具
        </DL><p>
        <DT><A HREF="https://git.example.org">Git</A>
        <DT><A HREF="javascript:alert(1)">坏的一行</A>
    </DL><p>
    <DT><H3>其他书签</H3>
    <DL><p><DT><A HREF="https://sspai.example.org">少数派</A></DL><p>
</DL><p>
`;

const login = await fetch(`${BASE}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: USER, password: PASSWORD }),
});
cookie = (login.headers.get("set-cookie") ?? "").split(";")[0];
assert("登录成功", login.status === 200, `HTTP ${login.status}`);

// ---- 匿名一律被拦
const settingsAnon = await call("/settings", { auth: false });
assert(
  "匿名进不了设置页",
  settingsAnon.status === 200 && settingsAnon.text.includes("登录"),
  `HTTP ${settingsAnon.status}`,
);

const settingsPage = await call("/settings");
assert(
  "设置页带着「浏览器书签」一节",
  settingsPage.status === 200 && settingsPage.text.includes("浏览器书签"),
  `HTTP ${settingsPage.status}`,
);

const anon = await call("/api/bookmarks/preview", {
  method: "POST",
  body: { html: BOOKMARKS },
  auth: false,
});
assert("匿名预览被拒", anon.status === 401, `HTTP ${anon.status}`);

const anonImport = await call("/api/bookmarks/import", {
  method: "POST",
  body: { html: BOOKMARKS },
  auth: false,
});
assert("匿名导入被拒", anonImport.status === 401, `HTTP ${anonImport.status}`);

// ---- 参数与文件内容
const empty = await call("/api/bookmarks/preview", { method: "POST", body: { html: "   " } });
assert("空内容被拒", empty.status === 400, `HTTP ${empty.status}`);

const notBookmarks = await call("/api/bookmarks/preview", {
  method: "POST",
  body: { html: "<html><body>这不是书签</body></html>" },
});
assert(
  "读不到书签的文件被拒",
  notBookmarks.status === 400 && /没读到书签/.test(notBookmarks.json?.error ?? ""),
  `HTTP ${notBookmarks.status} ${notBookmarks.json?.error}`,
);

const badPolicy = await call("/api/bookmarks/import", {
  method: "POST",
  body: { html: BOOKMARKS, duplicates: "maybe" },
});
assert("认不出的重复策略被拒", badPolicy.status === 400, `HTTP ${badPolicy.status}`);

// ---- 预览
const preview = await call("/api/bookmarks/preview", { method: "POST", body: { html: BOOKMARKS } });
const plan = preview.json?.preview;
assert("预览成功", preview.status === 200, `HTTP ${preview.status}`);
assert("数清了文件里的 5 条", plan?.total === 5, `${plan?.total}`);
assert(
  "1 行网址非法，理由说清楚",
  plan?.invalidTotal === 1 && plan?.invalid?.[0]?.reason === "只支持 http 与 https",
  JSON.stringify(plan?.invalid),
);
assert("可导入 4 条", plan?.importable === 4, `${plan?.importable}`);
assert(
  "浏览器自带的顶层目录被忽略",
  JSON.stringify(plan?.ignoredRoots) === JSON.stringify(["书签栏", "其他书签"]),
  JSON.stringify(plan?.ignoredRoots),
);
assert(
  "分类只认用户自己的目录",
  JSON.stringify(plan?.categories?.map((entry) => entry.name)) === JSON.stringify(["设计"]),
  JSON.stringify(plan?.categories),
);
assert(
  "二级目录变成标签",
  JSON.stringify(plan?.tags?.map((entry) => entry.name)) === JSON.stringify(["灵感"]),
  JSON.stringify(plan?.tags),
);
assert(
  "预览带着样例条目",
  plan?.sample?.some(
    (row) => row.title === "Shots" && row.categoryName === "设计" && row.tags?.includes("灵感"),
  ),
  JSON.stringify(plan?.sample),
);
assert(
  "预览不写入任何东西",
  (await itemTitles()).length === 15,
  `${(await itemTitles()).length} 条`,
);

// ---- 导入
const imported = await call("/api/bookmarks/import", { method: "POST", body: { html: BOOKMARKS } });
assert("导入成功", imported.status === 200, `HTTP ${imported.status}`);
assert(
  "新建 1 个分类、1 个标签、4 条条目",
  imported.json?.imported?.categories === 1 &&
    imported.json?.imported?.tags === 1 &&
    imported.json?.imported?.created === 4,
  JSON.stringify(imported.json?.imported),
);

let data = await portal();
assert("条目真的进了库", data?.items?.length === 19, `${data?.items?.length}`);

const category = data?.categories?.find((row) => row.name === "设计");
assert(
  "分类建了出来",
  category !== undefined,
  JSON.stringify(data?.categories?.map((r) => r.name)),
);

const figma = data?.items?.find((row) => row.title === "Figma & friends");
assert(
  "直接放在一级目录下的条目不背标签",
  figma?.categoryId === category?.id && figma?.tags?.length === 0,
  `categoryId=${figma?.categoryId} tags=${JSON.stringify(figma?.tags)}`,
);
assert("描述也带过来了", figma?.description === "在线设计工具", `${figma?.description}`);

const shots = data?.items?.find((row) => row.title === "Shots");
assert(
  "二级目录里的条目带上了标签",
  shots?.categoryId === category?.id && shots?.tags?.includes("灵感"),
  `categoryId=${shots?.categoryId} tags=${JSON.stringify(shots?.tags)}`,
);
assert(
  "浏览器自带目录里的书签落进 Inbox",
  data?.items?.find((row) => row.title === "少数派")?.categoryId === null,
  `${data?.items?.find((row) => row.title === "少数派")?.categoryId}`,
);
assert(
  "非法网址没有被写进去",
  data?.items?.every((row) => !row.url.startsWith("javascript:")) === true,
);

const designItems = data?.items?.filter((row) => row.categoryId === category?.id) ?? [];
assert(
  "同一分类内先来后到，新条目接在后面",
  JSON.stringify(designItems.map((row) => row.title)) ===
    JSON.stringify(["Figma & friends", "Shots"]),
  JSON.stringify(designItems.map((row) => row.title)),
);

// ---- 再导一次：默认跳过
const again = await call("/api/bookmarks/import", { method: "POST", body: { html: BOOKMARKS } });
assert(
  "重复网址默认跳过",
  again.json?.imported?.created === 0 &&
    again.json?.imported?.updated === 0 &&
    again.json?.imported?.skipped === 4,
  JSON.stringify(again.json?.imported),
);
assert(
  "跳过时不会多建分类与标签",
  again.json?.imported?.categories === 0 && again.json?.imported?.tags === 0,
  JSON.stringify(again.json?.imported),
);
assert("库里的条目数没变", (await itemTitles()).length === 19);

// ---- 再导一次：覆盖标题与描述
// 先给这条打一个用户自己的标签，用来验证「覆盖」是合并而不是替换
await call(`/api/items/${shots?.id}`, { method: "PATCH", body: { tagNames: ["自己打的"] } });

const overwrite = await call("/api/bookmarks/import", {
  method: "POST",
  body: { html: BOOKMARKS.replace("Figma &amp; friends", "Figma 改名了"), duplicates: "overwrite" },
});
assert(
  "覆盖策略下更新已有条目",
  overwrite.json?.imported?.created === 0 && overwrite.json?.imported?.updated === 4,
  JSON.stringify(overwrite.json?.imported),
);
assert("条目数还是 19", (await itemTitles()).length === 19);
data = await portal();
assert(
  "标题按书签里的改了",
  data?.items?.some((row) => row.title === "Figma 改名了") === true,
  JSON.stringify(data?.items?.filter((row) => row.title.startsWith("Figma"))?.map((r) => r.title)),
);
const shotsAfter = data?.items?.find((row) => row.title === "Shots");
assert(
  "覆盖是合并标签，用户自己打的还在",
  shotsAfter?.tags?.includes("自己打的") === true && shotsAfter?.tags?.includes("灵感") === true,
  JSON.stringify(shotsAfter?.tags),
);

// ---- 二级以上目录：每一级都进标签
const deep = `<DL><p><DT><H3>资料</H3><DL><p><DT><H3>前端</H3><DL><p><DT><H3>构建</H3><DL><p>
  <DT><A HREF="https://vitejs.example.org">Vite</A>
</DL><p></DL><p></DL><p></DL><p>`;
const deepResult = await call("/api/bookmarks/import", { method: "POST", body: { html: deep } });
assert(
  "三级目录也能导",
  deepResult.json?.imported?.created === 1,
  JSON.stringify(deepResult.json?.imported),
);
const vite = (await portal())?.items?.find((row) => row.title === "Vite");
assert(
  "每一级目录都是一个标签",
  JSON.stringify(vite?.tags) === JSON.stringify(["前端", "构建"]),
  JSON.stringify(vite?.tags),
);

// ---- 同名分类与标签被复用，不再建一份
const reuse = `<DL><p><DT><H3>设计</H3><DL><p><DT><H3>灵感</H3><DL><p>
  <DT><A HREF="https://unsplash.example.org">Unsplash</A>
</DL><p></DL><p></DL><p>`;
const reuseResult = await call("/api/bookmarks/import", { method: "POST", body: { html: reuse } });
assert(
  "同名分类与标签复用",
  reuseResult.json?.imported?.categories === 0 && reuseResult.json?.imported?.tags === 0,
  JSON.stringify(reuseResult.json?.imported),
);
const names = ((await portal())?.categories ?? []).map((row) => row.name);
assert(
  "「设计」只有一个",
  names.filter((name) => name === "设计").length === 1,
  JSON.stringify(names),
);

console.log(failures ? `\n${failures} 条断言失败` : "\n全部通过");
if (failures) process.exitCode = 1;
