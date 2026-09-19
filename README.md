# Ivy · 一叶

> One page. Many places.

个人专属的网站、项目与常用工具导航 Portal。自托管，内容全部在页面上维护，不需要改代码。

## 是什么

一个单人使用的 Personal Portal：把个人网站、开源项目、常用工具和收藏的站点收在一页里，按分类分区展示，支持 Light / Dark / System 主题、全局搜索，以及 Public / Private 两级可见性。

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

## 快速开始

需要 Node.js 22 或更高版本，以及 pnpm。

```bash
pnpm install
pnpm dev
```

打开 http://localhost:3000。首次启动时数据库是空的，页面会引导创建管理员账号。

想先看到真实排版而不是空页面，可以灌入一份演示内容（7 个分类、15 个条目）：

```bash
pnpm db:seed
```

数据库里已经有分类时该命令会直接跳过，不会重复写入。

## 环境变量

全部可选，默认值适用于本机开发。复制 `.env.example` 为 `.env.local` 后按需覆盖。

| 变量                  | 默认值                | 说明                  |
| --------------------- | --------------------- | --------------------- |
| `DATABASE_PATH`       | `./data/portal.db`    | SQLite 数据库文件路径 |
| `MIGRATIONS_PATH`     | `./src/db/migrations` | 迁移文件目录          |
| `SESSION_COOKIE_NAME` | `ivy_session`         | 会话 Cookie 名        |

## 常用命令

```bash
pnpm dev            # 开发服务器
pnpm build          # 生产构建
pnpm start          # 运行生产构建
pnpm test           # 单元测试
pnpm lint           # ESLint
pnpm typecheck      # TypeScript 类型检查
pnpm format         # Prettier 格式化
pnpm format:check   # 校验格式（CI 使用）
pnpm db:generate    # 改完 schema 后生成迁移
pnpm db:seed        # 灌入演示内容（已有数据时跳过）
```

## 目录结构

```
src/
├── app/                   路由、页面与 API
│   ├── api/               服务器端接口
│   ├── login/             管理员登录
│   ├── management/        管理入口
│   └── settings/          系统设置
├── components/
│   ├── ui/                shadcn/ui 基础组件
│   ├── portal/            公开门户界面
│   ├── editor/            前台编辑模式
│   ├── icons/             图标渲染与选择
│   └── settings/          设置页各分区
├── db/                    schema、连接、迁移
├── lib/
│   ├── auth/              密码、会话、服务端鉴权
│   ├── icons/             图标解析
│   ├── backup/            导出与恢复
│   ├── metadata/          站点元信息抓取
│   └── utils/             通用工具
├── hooks/
└── types/
```

## 许可

MIT，见 [LICENSE](./LICENSE)。
