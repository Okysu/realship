# Real 2026 鸿蒙创新赛 · 公开评选平台

一个**重产品、反 PPT、评审全程可追溯**的公开评选平台。它的每一处设计，都是「PPT 赢过产品、作品零流量无人审、被推荐者挤占名额」这些不公的反义词。

> 让每一个真正能跑起来的产品，被认真看见。

## 核心特色（三位一体）

1. **审计留痕** —— 记录每位评委对每个作品的查看会话（首次时间、有效时长、打开了哪些材料）。参赛者在「谁看过我」里能看到自己的作品**被谁、看了多久、看过哪些材料**（评委匿名）。正面回应「视频流量为 0 = 没人审阅」之痛。
2. **AI 提问驱动审阅** —— AI 读完作品材料生成**核查性问题**，评委必须查看视频 / 产品 / 仓库才答得上来；纯 PPT / 套壳作品会被 AI 识破（含防 Prompt 注入）。
3. **重产品评分** —— 上架应用市场、邀测链接、可运行仓库是**加分硬通货**；评分维度与权重在规则页**全程公开、可复核**。

## 技术栈

- **Next.js 16**（App Router）+ React 19 + TypeScript
- **TailwindCSS v4**
- **PostgreSQL**（Neon Serverless）+ **Prisma 6**
- **Auth.js v5**（邮箱密码 + JWT + 基于角色的访问控制）
- **OpenAI 兼容 SDK**（DeepSeek / 通义 / GLM / OpenAI 任一端点）
- 文件存储：**S3 兼容对象存储**（生产）/ 本地 `uploads/`（开发）

## 快速开始

### 1. 环境要求
- Node.js ≥ 20.9
- 一个可连接的 PostgreSQL 数据库（推荐 [Neon](https://neon.tech) 免费实例）

### 2. 安装与配置
```bash
npm install
cp .env.example .env   # 填写 DATABASE_URL / DIRECT_URL / AUTH_SECRET
```
`.env` 关键项：
- `DATABASE_URL`：运行时连接（pooled，建议带 `?sslmode=require&pgbouncer=true`）
- `DIRECT_URL`：迁移用直连（unpooled，`?sslmode=require`）
- `AUTH_SECRET`：`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
- `AI_API_KEY` / `AI_BASE_URL` / `AI_MODEL`：**可选**，留空则 AI 提问功能禁用、其余照常
- `STORAGE_DRIVER`：`local`（默认）或 `s3`（填 `S3_*`），单文件上限 `MAX_UPLOAD_MB`（默认 200）

### 3. 初始化数据库与种子数据
```bash
npx prisma migrate dev   # 建表
npm run db:seed          # 写入演示数据（会清空并重建）
```

### 4. 启动
```bash
npm run dev              # http://localhost:3000
```

## 演示账号（密码均为 `Password123!`）

| 角色 | 账号 | 入口 |
|---|---|---|
| 管理员 | `admin@real2026.dev` | `/admin`（赛事 / 维度 / 评委分配） |
| 评委 | `judge1@real2026.dev` ~ `judge3` | `/judge`（审阅 + AI 问答 + 打分） |
| 选手 | `player1@real2026.dev` ~ `player5` | `/dashboard`（提交作品 + 谁看过我） |

种子内置 5 个**对照作品**：A 全加分（已上架/邀测/仓库）· B 开源组件 · C 纯 PPT 概念（AI 标记 `concept_only`）· D H5 套壳（AI 标记 `h5_shell`）· E 团队作品。

## 功能导览

- **游客**：`/competitions/real-2026` 看规则与公开权重；`/showcase` 看作品展示墙（落榜作品带 AI/评委评语）。
- **选手**：`/dashboard` 提交作品（表单 + 外链 + 附件）→ 作品页查看「谁看过我」。
- **评委**：`/judge` 待评列表 → 审阅页（查阅材料 → 触发 AI 提问 → 看视频作答 → 按权重打分 → 兜底备注），全程留痕。
- **管理员**：`/admin` 管理赛事 / 赛道 / 阶段 / 评分维度，一键均衡分配评委。

## 项目结构

```
src/
├─ auth.ts / auth.config.ts / proxy.ts   # Auth.js v5 + Next16 路由守卫
├─ lib/         prisma / rbac / storage(local+s3) / ai(提问引擎+防注入) / scoring / validators
├─ server/actions/                        # Server Actions（认证/作品/审计/评分/AI/分配）
├─ components/  ui / forms / review(埋点) / showcase / audit(谁看过我)
└─ app/(public | participant | judge | admin)/   # 按角色分组路由
prisma/  schema.prisma · seed.ts
```

## 说明

- 这是一个**独立的开发者社区公开评选**，与任何官方赛事无关。
- AI 与文件存储均为可选：未配置时对应功能优雅降级（AI 禁用 / 用本地存储），不影响主流程。
- 演示用的数据库与 AI 凭据若曾出现在协作记录中，请在正式使用前**轮换**。
