# Ivy · 一叶

> One page. Many places.

个人专属的网站、项目与常用工具导航 Portal。自托管，内容全部在页面上维护，不需要修改代码。

## 是什么

一个单人使用的个人导航页：把个人网站、开源项目、常用工具和收藏的站点收在一页里，按分类分区展示，支持 Light / Dark / System 主题、即时搜索，以及 Public / Private 两级可见性。

不是网址大全。视觉方向采用 Apple 风格的克制与留白，不做彩色 Logo 墙、重渐变或大面积毛玻璃。

## 技术栈

| 层   | 选型                                       |
| ---- | ------------------------------------------ |
| 框架 | Next.js（App Router）                      |
| 前端 | React、TypeScript、Tailwind CSS、shadcn/ui |
| 数据 | SQLite + Drizzle ORM                       |
| 认证 | Session + HttpOnly Cookie                  |
| 主题 | Light / Dark / System（next-themes）       |
| 动画 | CSS Transition + Motion                    |
| 拖拽 | dnd-kit                                    |

## 快速开始

需要 Node.js 22 或更高版本，以及 pnpm。

```bash
pnpm install
pnpm dev
```

打开 `http://localhost:3000`。

数据库为空时先创建管理员账号。建号只在服务器上进行，网页端只提供登录：

```bash
pnpm admin:create ivy            # 交互式输入密码
ADMIN_PASSWORD=... pnpm admin:create ivy   # 不走交互，便于脚本化
pnpm admin:create --reset        # 忘记密码时重置
```

这样做而不是做一个网页建号页：门户本身是公网可访问的，「谁都能打开的建号页面」本身就是缺口。

如果想先看到完整的页面排版，可以导入一份演示内容：

```bash
pnpm db:seed
```

数据库中已有分类时，该命令会直接跳过，不会重复写入。

用手机或局域网 IP 打开开发服务器时，Next 16 默认会拦掉开发资源，
页面会呈现「样式正常但点什么都没反应」。`next.config.ts` 已默认放开
`192.168.*.*`、`10.*.*.*`、`172.16.*.*` 三个私有网段；其他域名或网段用
`ALLOWED_DEV_ORIGINS` 追加。只想稳定验收的话，用 `pnpm build && pnpm start`
跑生产模式，它没有这套限制。

## 环境变量

全部可选，默认值适用于本机开发。复制 `.env.example` 为 `.env.local` 后按需修改。

| 变量                          | 默认值                  | 说明                                               |
| ----------------------------- | ----------------------- | -------------------------------------------------- |
| `DATABASE_PATH`               | `./data/portal.db`      | SQLite 数据库文件路径                              |
| `MIGRATIONS_PATH`             | `./src/db/migrations`   | 迁移文件目录                                       |
| `SESSION_COOKIE_NAME`         | `ivy_session`           | 会话 Cookie 名称                                   |
| `SESSION_COOKIE_SECURE`       | 生产环境 `true`         | 是否只在 HTTPS 下回传会话 Cookie                   |
| `TRUST_PROXY_HEADERS`         | `false`                 | 是否读取 `X-Forwarded-For`（仅在可信反代之后开启） |
| `FAVICON_ALLOW_PRIVATE_HOSTS` | `false`                 | 是否允许抓取内网地址的站点图标                     |
| `LOGIN_ATTEMPT_LIMIT`         | `10`                    | 单个用户名 15 分钟内的登录尝试上限                 |
| `LOGIN_GLOBAL_ATTEMPT_LIMIT`  | `30`                    | 全局登录尝试上限                                   |
| `NEXT_PUBLIC_SITE_URL`        | `http://localhost:3000` | 站点对外地址，用于 OpenGraph 绝对链接              |

## 常用命令

```bash
pnpm dev            # 开发服务器
pnpm build          # 生产构建（standalone）
pnpm start          # 运行生产构建
pnpm test           # 单元测试
pnpm lint           # ESLint
pnpm typecheck      # TypeScript 类型检查
pnpm format         # Prettier 格式化
pnpm format:check   # 校验格式（CI 使用）
pnpm db:generate    # 修改 schema 后生成迁移
pnpm db:seed        # 导入演示内容（已有数据时跳过）
pnpm brand:assets   # 从 scripts/brand/source 重新生成图标与分享图
```

`pnpm dev` 与 `pnpm build` 使用不同的产物目录（`.next-dev` 与 `.next`）。
两者共用同一个目录时，一次构建就可能让开发服务器引用的脚本失效，
页面上表现为样式还在、点击全无反应。

## 接口回归

`pnpm e2e` 会为每个套件建一份独立的临时数据库、起一个独立端口的服务，然后跑一组接口断言：

```bash
pnpm build && pnpm e2e           # 全跑
pnpm e2e palette                 # 只跑某个套件
```

套件在 `scripts/e2e/suites/`：`edit`（条目与分类的增删改、排序、可见性）、`backup`（导出、导入、快照、恢复）、
`security`（未登录越权、Private 泄漏、限流、SSRF 兜底、缓存头）、`restore`（危险网址的恢复与导入）、
`palette` 与 `layout`（两类界面偏好的写入、校验与首屏渲染）。需要先 `pnpm build`，脚本会自己检查。
临时库与日志落在 `scripts/e2e/.tmp/`（已忽略）。

浏览器的交互与观感验证不在里面 —— 那部分是一次性的探查，写得再全也不如真机点一遍。

## 界面与交互

- **顶栏**只放品牌、外观切换与设置入口：停在页面顶部时完全透明，向下滚动后才浮起毛玻璃与细分隔线。
- **分类导航**在搜索框下方，是一排跟随内容的胶囊（不吸顶、无底衬）；只显示管理员标记为「首页显示」的分类，分类多了整排横向滚动。
- **首页主体**依次是欢迎语、站点口号、搜索框、分类导航，以及按分类分区的卡片流，末尾是页脚。
- **编辑模式**在设置页打开，用 Cookie 记住，回到首页即可编辑；顶栏不出现管理按钮。
- **搜索**在标题、描述、网址、域名、标签和分类中即时匹配，不刷新页面。
- **编辑模式**在设置页的「前台编辑」里打开。卡片可以通过拖动把手排序，右上角菜单支持编辑、复制、移动分类、切换可见性、置顶与删除；点顶部的「完成」退出。
- 搜索状态下不开放拖动，避免把一部分结果当成完整顺序写回。
- **设置页**（`/settings`）包含外观、配色、首页布局、前台编辑、首页分类、数据、账号七个分区；分类的名称与描述也在那里改。
- **配色主题**与浅色/深色各管一维：六套配色（一叶青、天青、紫罗兰、陶土、玫红、石墨）只换强调色与背景光晕，中性色与卡面材质不变；在设置页选，存进 `settings` 表，服务端渲染时直接写进 `<html data-palette>`，所以首屏不会闪。
- **首页布局**可在设置里切换三种，只换条目的排布，分类、搜索与编辑模式都不受影响：
  - **卡片**（默认）：图标在上、描述两行；手机两列、桌面三列，窄屏下收窄内边距并把标签与「打开」改成上下排布。
  - **列表**：一行一条。宽屏上行内依次是图标、标题、描述、域名、标签与操作；窄屏只留标题、域名与「打开」，用来快速扫视。
  - **紧凑**：只放图标与标题的小方块，手机三列、桌面六列，适合当成常用入口的主屏。
    三种形状共用一份网格参数（`src/lib/settings/homepage.ts` 的 `GRID_CLASS`），公开视图与编辑视图不会各写一套；
    布局和配色一样存进 `settings` 表、由服务端读取，换设备跟着走，也一起进备份。
- **背景**是两团模糊光斑加一层极细噪点（噪点负责打散大面积渐变常见的色带）。两团光斑各自以 46s / 58s 的周期慢慢漂移并微微胀缩 —— 不滚动时背景也是活的；滚动时外面还套一层视差。整套只用 `transform`，五秒内的 `LayoutCount` 增量为 0；系统开启「降低动态效果」时全部静止。
- **条目图标**取不到时回一张 1×1 的透明占位图（不是 404，控制台就不会多一条红线），
  图标位始终垫着标题首字母；真的取到了图标才把首字母收起来。
- **品牌标记**是一片叶子，顶栏与页脚共用；标签页图标、Apple 图标与分享卡片由 `pnpm brand:assets` 从源图生成，顶栏与页脚用不带底板的叶子，标签页用带底板的方块版本；方块是满幅不透明的，圆角交给浏览器与系统自己加。

## 权限模型

每个条目都有自己的 `visibility`：

- `public`
- `private`

条目的可见性以自身设置为准，分类的 `visibility` 只作为新建条目时的默认值。

**Private 内容由服务器端决定是否下发。**

匿名访问者的响应中不会包含：

- Private 条目
- 未在首页显示的分类及其条目

前端隐藏不构成权限控制，直接调用接口同样会被拒绝。

所有写接口都要求管理员会话，未登录一律返回 `401`。

## 图标

条目图标有五种来源：

| 来源   | 说明                                                            |
| ------ | --------------------------------------------------------------- |
| 自动   | 读取站点页面的 `<link rel="icon">`，取不到时退回 `/favicon.ico` |
| Emoji  | 精选约 150 个，支持中英关键词搜索                               |
| Lucide | 显式登记约 120 个线性图标，只有名单里的图标会被打包             |
| 上传   | PNG / JPG / WEBP / SVG，单张上限 512 KB                         |
| 无     | 显示标题首字母                                                  |

自动抓取通过本地代理 `/api/icons/favicon?item=<id>`：接受条目编号而不是任意网址，匿名访问者无法利用它作为扫描内网的跳板。

结果按站点落盘缓存 7 天，失败请求也会短期缓存，不会每次打开首页都重新抓取。

上传的文件存放在数据库同级的 `uploads/` 目录，SVG 会被清洗，并只作为图片渲染。

## 备份与恢复

### JSON 导出 / 导入

内容包括分类、条目、标签、设置与图标集。

编号不会写入导出文件，条目通过分类名与标签名建立关联，换一套部署也能对应。

管理员账号与登录状态不包含在其中，导入后仍保持当前登录状态。

### 数据库备份

数据库备份使用 `VACUUM INTO` 生成一致快照，放在数据库同级的 `backups/` 目录。

文件名格式：

```text
portal-20260919-225913.db
```

备份可以列出、下载与恢复。

恢复需要二次确认，且只覆盖内容表，不会因为恢复一份旧备份而修改当前管理员账号或使当前会话失效。

> 数据库备份是数据库的完整副本，其中包含管理员密码哈希，请存放在安全的位置。

## 部署

推荐部署在自有服务器上：Next.js + Node.js + SQLite，不需要额外的数据库服务。

### 方式一：部署整个项目（推荐）

服务器上保留完整项目，用 `pnpm start` 运行。建号、迁移、备份都能直接在服务器上执行，不需要回到开发机。

```bash
# 服务器上
git clone <你的仓库地址> /srv/ivy-nav
cd /srv/ivy-nav
pnpm install --frozen-lockfile
pnpm build

# 创建管理员（首次部署时执行一次）
DATABASE_PATH=/srv/ivy-nav/data/portal.db ADMIN_PASSWORD='你的密码' pnpm admin:create ivy

# 启动
DATABASE_PATH=/srv/ivy-nav/data/portal.db PORT=3000 HOSTNAME=127.0.0.1 pnpm start
```

数据库文件不存在时会自动建表，所以建号与启动的 `DATABASE_PATH` 要指向同一个位置。

### 方式二：standalone 产物（体积小，但服务器上没有建号工具）

standalone 产物自带运行依赖，不含 tsx 与 drizzle-kit，所以**建号要在有工具链的机器上做**。

```bash
# 开发机上
pnpm install --frozen-lockfile
pnpm build

mkdir -p /tmp/ivy-deploy/.next
cp -r .next/standalone/. /tmp/ivy-deploy/
cp -r .next/static /tmp/ivy-deploy/.next/static

# 在开发机上先建号，再把数据目录一起带过去
DATABASE_PATH=/tmp/ivy-deploy/data/portal.db ADMIN_PASSWORD='你的密码' pnpm admin:create ivy

rsync -a /tmp/ivy-deploy/ server:/srv/ivy-nav/
# 之后在服务器上启动
cd /srv/ivy-nav && DATABASE_PATH=/srv/ivy-nav/data/portal.db PORT=3000 HOSTNAME=127.0.0.1 node server.js
```

> `public/brand/` 与 `src/app/` 下的图标是 `pnpm brand:assets` 的产物，部署时要一起带过去：
> `cp -r public /srv/ivy-nav/public`。

### systemd

```ini
[Unit]
Description=Ivy Portal
After=network.target

[Service]
Type=simple
WorkingDirectory=/srv/ivy-nav
Environment=NODE_ENV=production
Environment=DATABASE_PATH=/srv/ivy-nav/data/portal.db
Environment=PORT=3000
Environment=HOSTNAME=127.0.0.1
# 方式一用 ExecStart=/usr/bin/pnpm start
ExecStart=/usr/bin/node server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

部署到反向代理之后：

- 使用 HTTPS，保持 `SESSION_COOKIE_SECURE` 为默认的 `true`。
- 只有在代理可信时再设置 `TRUST_PROXY_HEADERS=true`。
- 备份与数据库目录（`data/`、`backups/`、`uploads/`）需要在应用目录之外单独做快照。

部署到 Vercel 这类 Serverless 环境时，SQLite 不能依赖本地临时文件做长期存储。需要持久化数据库时，请换用 SQLite-compatible 的托管服务，或保持自有服务器部署。

## 安全

- 密码使用 `node:crypto` 的 scrypt 加盐哈希，参数随哈希存储，校验使用定时安全比较。
- 会话只把令牌的 SHA-256 摘要写入数据库，拿到数据库文件也无法直接重放会话；Cookie 使用 HttpOnly + SameSite=Lax，生产环境默认 Secure。
- 登录失败按用户名限流，并附加全局限流，不按 IP 计数（`X-Forwarded-For` 由客户端自己写）。
- 网址只接受 `http:` 与 `https:`，写入、导入与恢复三条路径都会进行校验，`javascript:` 与 `data:` 一律拒绝。
- 上传校验文件头与声明类型是否一致；SVG 会清洗脚本、事件属性、远程引用与实体声明，响应另加 CSP `sandbox` 与 `nosniff`。
- 抓取站点图标时拒绝回环、link-local 与保留地址，并逐跳校验跳转目标。
- 接口响应统一使用 `private, no-store`；`/api/` 与管理页面不出现在 `robots.txt` 中。

## 目录结构

```text
scripts/
└── brand/                 图标与分享图生成（源图、版式、生成脚本）
src/
├── app/                   路由、页面与 API
│   ├── api/               服务器端接口
│   ├── login/             管理员登录
│   └── settings/          系统设置
├── components/
│   ├── ui/                shadcn/ui 基础组件
│   ├── portal/            公开门户界面
│   ├── editor/            前台编辑模式
│   ├── icons/             图标渲染与选择
│   └── settings/          设置页各分区
├── db/                    schema、连接、迁移、种子数据
├── lib/
│   ├── auth/              密码、会话、限流、服务端鉴权
│   ├── backup/            导出、导入与数据库快照
│   ├── icons/             图标抓取、上传与清洗
│   ├── portal/            门户数据查询与写操作
│   └── utils/             通用工具
├── hooks/
└── types/
```

## 已知边界

这些功能暂时留在后续阶段：

- Simple Icons 与 Iconify 图标源
- 图标集（`icons.zip`）导入
- 浏览器书签导入
- 定时自动备份
- 网站状态检查
- 访问统计
- PWA

移动端的拖动由把手发起（长按 200ms 起拖），而不是长按整张卡片。

恢复与导入会重建条目行，编号会发生变化；操作完成后页面会重新加载。

## 许可

MIT，见 [LICENSE](./LICENSE)。
