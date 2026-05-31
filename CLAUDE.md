@AGENTS.md

# Real 2026 鸿蒙创新赛 · 公开评选平台

一个「重产品、反 PPT、评审全程可追溯」的公开评选平台。核心特色三位一体：**审计留痕**（谁看了/看了多久/打开了哪些材料，参赛者可见）、**AI 提问驱动审阅**（AI 读材料提问、评委须看视频/产品才能作答）、**重产品评分**（上架/邀测/可运行仓库为加分硬通货）。

## 技术栈
- Next.js 16.2.6（App Router）+ React 19.2 + TypeScript
- TailwindCSS v4（CSS-first，**无** `tailwind.config.js`，配置写在 `globals.css` 的 `@theme`）
- **PostgreSQL（Neon Serverless）** + Prisma **6.19.x**（稳定线，非 7.x）
- Auth.js v5（`next-auth@beta`）邮箱密码 + JWT 会话 + RBAC
- `openai` 兼容 SDK（`baseURL`/`model` 可配）
- react-hook-form + **zod v4**（注意：`z.email()`、错误用 `{ error: ... }`，与 v3 不同）
- 文件存储：**S3 兼容对象存储**（生产，单文件 ≤ 200MB，可对接 R2/B2/MinIO）/ 本地 `uploads/`（开发兜底）

## UI 约定（视觉系统）
- 颜色一律用**语义 token**：`bg-background`/`bg-card`/`bg-muted`、`text-foreground`/`text-muted-foreground`、`border-border`/`border-input`、`bg-primary`/`text-primary`/`text-primary-foreground`、`text-danger`、`bg-primary-soft`/`bg-warning-soft`。**勿硬编码 `slate-*`/`emerald-*`/`red-*`**——token 在 `globals.css` 定义亮/暗两套，自动适配暗色。
- 暗色用 `next-themes`（class 策略，`@custom-variant dark`），切换组件 `components/ui/theme-toggle`。
- 优先复用封装组件：`Card`/`Section`/`PageHeader`/`Badge`(tone: default/primary/warning)/`EmptyState`/`Markdown`，及表单原子 `Button`/`Input`/`Select`/`Textarea`/`Label`/`FieldError`。
- footer 贴底：root `body` 为 `min-h-screen flex flex-col`，各页/布局顶层用 `flex flex-1 flex-col`、`main` 用 `flex-1`。
- 阶段状态展示用 `lib/stage.ts` 的 `deriveStageStatus`（按真实日期），勿依赖存储的 status 硬编码。

## ⚠️ Next.js 16 关键约定（与训练数据不同，务必遵循）
- **中间件 = Proxy**：`src/proxy.ts`，导出 `proxy` 函数（**不是** `middleware.ts`）；仅 Node runtime（Auth.js v5 兼容）。Proxy 只做乐观检查（基于 cookie 的重定向），不做完整授权。
- **Async Request APIs（同步访问已彻底移除）**：`cookies()`/`headers()`/`draftMode()` 必须 `await`；动态路由 `params`、page 的 `searchParams` 是 **Promise**，必须 `await`。可用 `PageProps<'/route'>`、`LayoutProps`、`RouteContext` 类型助手（`npx next typegen` 生成）。
- **Server Actions 是公开 POST 端点**：每个 action 内部必须 `await auth()` 校验认证与角色，不能只靠 proxy。
- **缓存/刷新**（均自 `next/cache`，`redirect` 自 `next/navigation`）：`refresh()` 刷新 client router；`updateTag(tag)` read-your-writes；`revalidateTag(tag, 'max')` 需第二参数；`revalidatePath(path)`。
- **Turbopack 默认**：scripts 无需 `--turbopack`；dev 输出到 `.next/dev`。
- **next/image**：外部图片用 `images.remotePatterns`（`domains` 已废弃）。
- 不确定某 API 时，查 `node_modules/next/dist/docs/` 对应文档再写。

## 数据库（Neon PostgreSQL）
- `DATABASE_URL`（pooled / pgbouncer）用于运行时；`DIRECT_URL`（unpooled）用于迁移。Prisma 连接串**勿带 `channel_binding`**（兼容性）。
- 善用 PG 原生特性（如 `String[]` 数组——已用于 `AiReviewRun.flags`）。

## 目录约定
- `src/lib/`：`prisma`(单例) / `rbac` / `storage/*`(local+s3) / `ai/*` / `scoring/*` / `validators/*`
- `src/server/actions/`：Server Actions（按域分文件）
- `src/components/`：`ui` / `forms` / `review` / `showcase` / `audit`
- `src/app/(public|participant|judge|admin)/`：按角色分组路由（括号分组不影响 URL）
- `uploads/`：local 驱动的受保护上传目录（不在 public，经 `/files/[...key]` 鉴权下载）；生产切 S3。

## 常用命令
- 开发：`npm run dev`
- 数据库：`npx prisma migrate dev`（连 Neon PG）→ `npx prisma studio` → `npm run db:seed`
- 校验：`npm run lint`、`npx tsc --noEmit`

## 工程原则
代码注释统一用中文（与现有代码库一致）。遵循 KISS/DRY/YAGNI；危险操作（删除/迁移重置/提交）先确认。**不主动执行 git 提交与分支操作**。
