# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 与
[Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Changed

- 分类导航移到常驻顶栏（品牌 / 分类 / 外观 / 设置同排），滚动到任何位置都能切换分类
- 手机端卡片改为两列，并收窄内边距、把标签与 Open 改为上下排布
- 演示种子数据把 7 个分类全部设为首页显示，首次导入即可看到完整排版
- 管理员账号改由服务器端 `pnpm admin:create` 创建，网页端不再提供建号入口

### Added

- `pnpm admin:create`：交互式建号，支持 `ADMIN_PASSWORD` 非交互传入与 `--reset` 重置密码
- `pnpm test` 之外的部署路径实测：整项目部署与 standalone 产物两种方式都写进 README

### Fixed

- 登录表单未声明 `method="post"`：脚本未执行时浏览器按 GET 原生提交，会把密码写进 URL
- `pnpm dev` 与 `pnpm build` 共用 `.next`：一次构建就可能让开发服务器引用的脚本失效，
  页面表现为样式正常但点击全无反应；开发改用独立目录 `.next-dev`

### Removed

- 网页端建号接口 `/api/auth/setup`
- 仓库里的 `AGENTS.md`（`next dev` 每次自动生成，改为忽略）

## [0.1.0] - 2026-09-19

第一个可用版本：首页、数据、认证、前台编辑、图标与备份都跑通了。

### Added

- 公开门户首页：Brand、欢迎语、即时搜索、顶部分类 Tab、按分类分区的卡片流
- 卡片包含图标、标题、描述、标签与 Open；图标取不到时回落标题首字母
- 主题系统支持 Light / Dark / System，默认跟随系统，切换不闪烁，动效遵守 `prefers-reduced-motion`
- 响应式布局：手机一列、平板两列、桌面三列；分类 Tab 在移动端横向滚动
- 搜索覆盖标题、描述、URL、域名、标签与分类，多个关键词按 AND 收窄
- SQLite + Drizzle 数据层：User / Session / Category / Item / Tag / ItemTag / IconSet / Setting / Backup 共 9 张表
- 首次访问自动执行迁移，不需要单独的迁移步骤
- 幂等种子数据（`pnpm db:seed`）：7 个分类、15 个条目、14 个标签，含一个 Private 条目
- 管理员认证：scrypt 加盐哈希、HttpOnly + SameSite=Lax + 生产环境 Secure 的会话 Cookie
- 会话默认 30 天并滑动续期：中间件推后 Cookie 到期时间，数据库侧在用到一半寿命时顺延
- 首次部署没有账号时 `/login` 切换为创建管理员，创建成功后该接口自动关闭
- 支持修改密码（并吊销其它设备会话）与退出所有设备
- 前台编辑：编辑模式下卡片可拖动排序，表单可改标题、网址、描述、分类、标签、可见性与置顶
- 卡片操作菜单：编辑、复制、移动分类、切换 Public/Private、置顶、删除（二次确认）
- 分类管理：新建、改名、上下移动、首页显示开关、删除（条目退回 Inbox 而不是被一起删掉）
- 图标系统：自动抓取站点图标（本地代理 + 按 origin 落盘缓存）、Emoji 精选表、Lucide 精选表、自定义上传
- 上传支持 PNG / JPG / WEBP / SVG，单张上限 512 KB，校验文件头并对 SVG 做清洗
- 备份与恢复：内容层面的 JSON 导出与导入、`VACUUM INTO` 数据库快照、快照列表、下载与恢复
- 设置页：外观、首页分类、数据、账号四个分区
- Prettier + ESLint + Vitest（102 项单元测试）+ GitHub Actions（格式、lint、类型、测试、构建）
- standalone 构建输出，部署产物自带依赖，不携带本地运行数据

### Security

- Private 内容由服务器端过滤：匿名响应里不含 Private 条目的标题、网址与描述，也不含未在首页显示的分类及其条目
- 所有写接口经 `withAdmin` 校验会话，前端隐藏不构成权限
- 登录失败按用户名限流并附加全局限流，不依赖客户端可伪造的转发头
- 网址只接受 http 与 https，写入、导入与恢复三条路径都做校验
- SVG 去除脚本、事件属性、远程引用、外部样式与实体声明，响应另加 CSP sandbox 与 nosniff
- 抓取站点图标时拒绝回环、link-local 与保留地址，并逐跳重新校验跳转目标
- 备份文件名按固定格式校验，上传文件名由服务端随机生成，两者都不可路径穿越
- 接口响应统一 `private, no-store`，避免共享缓存转发管理数据
