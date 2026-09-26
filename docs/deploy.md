# 部署

## 环境变量

| 变量                          | 默认值                  | 说明                                                                             |
| ----------------------------- | ----------------------- | -------------------------------------------------------------------------------- |
| `DATABASE_PATH`               | `./data/portal.db`      | SQLite 文件路径；同级的 `uploads/`、`*-cache/` 跟着走，快照放上一层的 `backups/` |
| `MIGRATIONS_PATH`             | `./src/db/migrations`   | 迁移目录，standalone 产物要与源码一起带                                          |
| `SESSION_COOKIE_NAME`         | `ivy_session`           | 会话 Cookie 名                                                                   |
| `SESSION_COOKIE_SECURE`       | 生产 `true`             | 只在 HTTPS 下回传 Cookie                                                         |
| `TRUST_PROXY_HEADERS`         | `false`                 | 读 `X-Forwarded-For`，只有反代可信时才开                                         |
| `NEXT_PUBLIC_SITE_URL`        | `http://localhost:3000` | 分享卡片用的绝对链接                                                             |
| `FAVICON_ALLOW_PRIVATE_HOSTS` | `false`                 | 允许抓内网地址的站点图标                                                         |
| `FAVICON_FALLBACK_SOURCES`    | 开                      | 是否走 favicon.im / icon.horse                                                   |
| `LOGIN_ATTEMPT_LIMIT`         | `10`                    | 单个用户名在统计窗口内的失败上限                                                 |
| `LOGIN_GLOBAL_ATTEMPT_LIMIT`  | `30`                    | 全局失败上限                                                                     |
| `LOGIN_ATTEMPT_WINDOW_MS`     | `900000`                | 统计窗口                                                                         |
| `ADMIN_PASSWORD`              | —                       | 只给 `pnpm admin:create` 用，给了就不走交互                                      |

完整清单与说明见 `.env.example`。`ALLOWED_DEV_ORIGINS` 只在开发模式生效。

## 运行时

- 建号只能在命令行做（`pnpm admin:create ivy`，`--reset` 改密码），网页端没有建号页。
- `pnpm dev` 与 `pnpm build` 用不同产物目录（`.next-dev` / `.next`）：共用同一个时，一次构建就可能
  让开发服务器引用的脚本失效，页面上表现为样式还在、点击全无反应。
- standalone 产物里没有 tsx 与 drizzle-kit，**建号要在有工具链的机器上完成**，再把 `data/` 一起带过去。
- `public/` 与 `src/app/` 下的图标是 `pnpm brand:assets` 的产物，部署时要一起带。
- 迁移文件是运行期读的（首次访问时自动建表），`next.config.ts` 已经把 `src/db/migrations/**` 打进
  standalone 产物，`data/`、`backups/`、`TASKS.md`、`.history/` 则被排除在产物之外。

## 反向代理

- 用 HTTPS，`SESSION_COOKIE_SECURE` 保持默认的 `true`。
- 只有反代可信时才设 `TRUST_PROXY_HEADERS=true`（否则请求头里的 `X-Forwarded-For` 由客户端自己写，
  按它限流等于不限）。
- Serverless 平台不能把 SQLite 放在本地临时文件里做长期存储 —— 需要换 SQLite 兼容的托管服务，
  或者保持自有服务器部署。

## 验收

- 接口回归：`pnpm build && pnpm e2e`。每个套件自建临时数据库、起一个独立端口的服务，产物落在
  `scripts/e2e/.tmp/`（已忽略）。
- 手机或局域网 IP 打开开发服务器时，Next 16 默认拦掉非 localhost 的开发资源，页面会「样式正常但
  点什么都没反应」。`next.config.ts` 默认放行 `192.168.*.*`、`10.*.*.*`、`172.16.*.*`，其他网段用
  `ALLOWED_DEV_ORIGINS` 追加；只想稳定验收就用生产构建。
- 浏览器里的观感与手势只能在真机上验，接口套件覆盖不到。
