# Ivy · 一叶

> One page. Many places.

个人专属的网站、项目与常用工具导航 Portal。自托管，内容全部在页面上维护，不需要改代码。

## 是什么

一个单人使用的 Personal Portal：把个人网站、开源项目、常用工具和收藏的站点收在一页里，按分类分区展示，支持 Light / Dark / System 主题、即时搜索，以及 Public / Private 两级可见性。

不是网址大全。视觉方向是 Apple-inspired 的克制与留白，不做彩色 Logo 墙、重渐变或大面积毛玻璃。

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

打开 http://localhost:3000。第一次打开时数据库是空的，页面会引导创建管理员账号。

想先看到真实排版而不是空页面，可以灌入一份演示内容：

```bash
pnpm db:seed
```

数据库里已经有分类时该命令会直接跳过，不会重复写入。

## 环境变量

全部可选，默认值适用于本机开发。复制 `.env.example` 为 `.env.local` 后按需覆盖。

| 变量                          | 默认值                  | 说明                                               |
| ----------------------------- | ----------------------- | -------------------------------------------------- |
| `DATABASE_PATH`               | `./data/portal.db`      | SQLite 数据库文件路径                              |
| `MIGRATIONS_PATH`             | `./src/db/migrations`   | 迁移文件目录                                       |
| `SESSION_COOKIE_NAME`         | `ivy_session`           | 会话 Cookie 名                                     |
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
pnpm db:generate    # 改完 schema 后生成迁移
pnpm db:seed        # 灌入演示内容（已有数据时跳过）
```

## 界面与交互

- **首页**是「分区 + 顶部分类筛选」：上面是品牌、欢迎语与搜索框，下面是分类 Tab 与按分类分区的卡片流。
- **分类 Tab** 只显示管理员标记为「首页显示」的分类；移动端横向滚动，不用下拉菜单，也不会把页面撑爆。
- **搜索**在标题、描述、网址、域名、标签和分类里即时匹配，不刷新页面。
- **编辑模式**从首页右上角进入。卡片可以拖动把手排序，右上角菜单可以编辑、复制、移动分类、切换可见性、置顶与删除；搜索状态下不开放拖动，避免把一部分结果当成完整顺序写回。
- **设置页**（`/settings`）包含外观、首页分类、数据、账号四个分区。

## 权限模型

- 每个条目有自己的 visibility：`public` 或 `private`。
- 条目的可见性以自身为准，分类的 visibility 只作为新建条目时的默认值（设计文档 §35）。
- **Private 内容由服务器端决定是否下发**：匿名访问者的响应里既没有 Private 条目，也没有未在首页显示的分类及其条目。前端隐藏不构成权限，直接调用接口同样会被拒。
- 所有写接口都要求管理员会话，未登录一律 401。

## 图标

条目图标有五种来源：

| 来源   | 说明                                                            |
| ------ | --------------------------------------------------------------- |
| 自动   | 读取站点页面的 `<link rel="icon">`，取不到就退回 `/favicon.ico` |
| Emoji  | 精选约 150 个，支持中英关键词搜索                               |
| Lucide | 显式登记约 120 个线性图标，只有名单里的会进包                   |
| 上传   | PNG / JPG / WEBP / SVG，单张上限 512 KB                         |
| 无     | 显示标题首字母                                                  |

自动抓取走本地代理 `/api/icons/favicon?item=<id>`：接受条目编号而不是任意网址，匿名访问者无法拿它当扫描内网的跳板；结果按站点落盘缓存 7 天，失败也短期记住，不会每次打开首页都重新抓一轮。上传的文件存放在数据库同级的 `uploads/` 目录，SVG 会被清洗并只作为图片渲染。

## 备份与恢复

- **导出 / 导入 JSON**：内容是分类、条目、标签、设置与图标集。编号不进文件，条目按分类名与标签名关联，换一套部署也能对上；包含管理员账号与登录状态的部分不在其中，导入后仍然是登录状态。
- **数据库备份**：`VACUUM INTO` 生成一致快照，放在数据库同级的 `backups/` 目录，形如 `portal-20260919-225913.db`，可列出、下载与恢复。
- **恢复**要求二次确认，且只覆盖内容表，不会因为恢复一份旧备份把当前管理员换掉或踢下线。

备份文件是数据库的完整副本，里面包含管理员密码的哈希值，请存放在安全的位置。

## 部署

推荐自有服务器：Next.js + Node.js + SQLite，不需要额外的数据库服务。

```bash
pnpm install --frozen-lockfile
pnpm build

# 组装部署目录：standalone 产物 + 静态资源
mkdir -p /srv/ivy-nav/.next
cp -r .next/standalone/. /srv/ivy-nav/
cp -r .next/static /srv/ivy-nav/.next/static
# 本项目自身不放静态文件；若你后来在 public/ 下添加了资源，再执行 cp -r public /srv/ivy-nav/public

cd /srv/ivy-nav
DATABASE_PATH=/srv/ivy-nav/data/portal.db PORT=3000 HOSTNAME=127.0.0.1 node server.js
```

首次启动会自动建表，然后访问 `/login` 创建管理员账号。

systemd 单元示例：

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
ExecStart=/usr/bin/node server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

部署到反向代理之后：

- 用 HTTPS 对外，保持 `SESSION_COOKIE_SECURE` 为默认的 `true`。
- 只有在代理可信时再设 `TRUST_PROXY_HEADERS=true`。
- 备份与数据库目录（`data/`、`backups/`、`uploads/`）需要在应用目录之外单独做快照。

放在 Vercel 这类 Serverless 环境时，SQLite 不能依赖本地临时文件做长期存储；需要持久化数据库时请换用 SQLite-compatible 的托管服务，或保持自有服务器部署。

## 安全

- 密码用 `node:crypto` 的 scrypt 加盐哈希，参数随哈希存储，校验用定时安全比较。
- 会话只把令牌的 SHA-256 摘要写库，拿到数据库文件也无法重放会话；Cookie 为 HttpOnly + SameSite=Lax，生产环境默认 Secure。
- 登录失败按用户名限流并附加全局限流，不按 IP 计数（`X-Forwarded-For` 由客户端自己写）。
- 网址只接受 `http:` 与 `https:`，写入、导入与恢复三条路径都做校验，`javascript:` 与 `data:` 一律拒绝。
- 上传校验文件头与声明类型是否一致；SVG 清洗脚本、事件属性、远程引用与实体声明，响应另加 CSP `sandbox` 与 `nosniff`。
- 抓取站点图标时拒绝回环、link-local 与保留地址，并逐跳校验跳转目标。
- 接口响应统一 `private, no-store`；`/api/` 与管理页面不出现在 `robots.txt` 里。

## 目录结构

```
src/
├── app/                   路由、页面与 API
│   ├── api/               服务器端接口
│   ├── login/             管理员登录 / 首次建号
│   ├── management/        管理入口（转到首页编辑模式）
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

这些是有意留在后续阶段的能力，不打算伪装成已完成：

- Simple Icons 与 Iconify 图标源、图标集（`icons.zip`）导入、浏览器书签导入、定时自动备份、网站状态检查、访问统计、PWA 属于第二 / 第三阶段。
- 移动端的拖动由把手发起（长按 200ms 起拖），而不是长按整张卡片。
- 恢复与导入会重建条目行，编号会变化；因此两者完成后页面会重新加载。

## 许可

MIT，见 [LICENSE](./LICENSE)。
