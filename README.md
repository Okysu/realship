<div align="center">

# 🏆 Realship

**让每一个真正能跑起来的产品，被认真看见。**

一个重产品、反 PPT、评审全程可追溯的**开源公开评选平台**。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Docker Image](https://ghcr-badge.egpl.dev/okysu/realship/latest_tag?trim=major&label=docker&color=blue)](https://github.com/Okysu/realship/pkgs/container/realship)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)](https://www.prisma.io/)
[![Docker Build](https://github.com/Okysu/realship/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/Okysu/realship/actions/workflows/docker-publish.yml)

</div>

---

## ✨ 项目亮点

Realship 的每一处设计，都是「PPT 赢过产品、作品零流量无人审、被推荐者挤占名额」这些不公的反义词。

<table>
<tr>
<td width="33%" align="center">

### 🔍 审计留痕

记录每位评委对每个作品的查看会话——首次时间、有效时长、打开了哪些材料。参赛者在「谁看过我」中可查看**被谁看了、看了多久**（评委匿名）。

</td>
<td width="33%" align="center">

### 🤖 AI 提问式审阅

AI 读完作品材料后生成**核查性问题**，评委必须查看视频/产品/仓库才答得上来。纯 PPT / 套壳作品会被 AI 识破。

</td>
<td width="33%" align="center">

### 🎯 重产品评分

上架应用市场、邀测链接、可运行仓库是**加分硬通货**。评分维度与权重**全程公开、可复核**。

</td>
</tr>
</table>

## 📸 界面预览

<details>
<summary>🖼️ 点击展开截图</summary>

| 首页 | 排行榜 | 作品展示墙 |
|:---:|:---:|:---:|
| ![首页](/.github/assets/v4-home.jpeg) | ![排行榜](/.github/assets/v3-ranking.jpeg) | ![展示墙](/.github/assets/v3-showcase.jpeg) |

| 管理后台 - 用户管理 | 管理后台 - 评委分配 | 管理后台 - 审核 |
|:---:|:---:|:---:|
| ![用户管理](/.github/assets/v6-users-table.jpeg) | ![评委分配](/.github/assets/v7-admin-assignments.jpeg) | ![审核](/.github/assets/v7-admin-review.jpeg) |

| 提交表单 | 加分项配置 | 审计日志 |
|:---:|:---:|:---:|
| ![提交表单](/.github/assets/v5-submit-form.jpeg) | ![加分项](/.github/assets/v4-bonus.jpeg) | ![审计日志](/.github/assets/v6-audit-log.jpeg) |

</details>

## 🏗️ 技术栈

| 层级 | 技术 |
|------|------|
| **前端框架** | Next.js 16 (App Router) + React 19 |
| **语言** | TypeScript 5 |
| **样式** | TailwindCSS v4 |
| **数据库** | PostgreSQL 16+ ([Neon](https://neon.tech) / 自托管) |
| **ORM** | Prisma 6 |
| **认证** | Auth.js v5 (邮箱密码 + JWT + RBAC) |
| **AI 引擎** | OpenAI 兼容 SDK (DeepSeek / 通义 / GLM / OpenAI) |
| **文件存储** | S3 兼容对象存储 / 本地存储 |
| **邮件** | Nodemailer (SMTP) |
| **容器化** | Docker 多阶段构建 + Docker Compose |
| **CI/CD** | GitHub Actions → GHCR |

## 🚀 快速开始

### 方式一：Docker 部署（推荐）

```bash
# 拉取镜像
docker pull ghcr.io/okysu/realship:latest

# 或从源码构建
git clone https://github.com/Okysu/realship.git
cd realship
cp .env.example .env  # 编辑 .env 填写配置

# 构建并启动
docker compose build
docker compose --profile setup run --rm migrate  # 初始化数据库
docker compose up -d app
```

访问 `http://localhost:3000` 🎉

### 方式二：本地开发

```bash
# 环境要求：Node.js ≥ 20.9 + PostgreSQL 16+

git clone https://github.com/Okysu/realship.git
cd realship
npm install
cp .env.example .env  # 编辑 .env 填写 DATABASE_URL / AUTH_SECRET

npx prisma db push    # 同步数据库
npm run db:seed       # 可选：写入演示数据
npm run dev           # http://localhost:3000
```

## ⚙️ 环境变量

<details>
<summary>📋 完整配置项（点击展开）</summary>

| 变量 | 必填 | 说明 |
|------|:----:|------|
| `DATABASE_URL` | ✅ | PostgreSQL 连接串（建议 pooled） |
| `DIRECT_URL` | ✅ | PostgreSQL 直连（迁移用） |
| `AUTH_SECRET` | ✅ | 会话签名密钥 — `openssl rand -base64 32` |
| `APP_URL` | 生产 ✅ | 对外访问地址，如 `https://example.com` |
| `STORAGE_DRIVER` | — | `local`（默认）或 `s3` |
| `MAX_UPLOAD_MB` | — | 单文件上传上限，默认 200 |
| `S3_*` | s3 时 ✅ | `S3_ENDPOINT` / `S3_REGION` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` / `S3_BUCKET` |
| `AI_API_KEY` | — | AI 审查端点密钥（留空禁用） |
| `AI_BASE_URL` | — | AI API 地址 |
| `AI_MODEL` | — | AI 模型名称 |
| `SMTP_*` | — | 邮件配置（留空则邮件功能禁用） |

> 💡 AI 与邮件功能均为**可选**，未配置时对应功能优雅降级，不影响主流程。

</details>

## 🎭 角色与功能

Realship 采用三角色 RBAC 模型：

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   管理员     │     │    评委      │     │   参赛者     │
│   ADMIN     │     │   JUDGE     │     │ PARTICIPANT │
├─────────────┤     ├─────────────┤     ├─────────────┤
│ 赛事管理     │     │ 审阅作品     │     │ 提交作品     │
│ 维度配置     │     │ AI 问答     │     │ 查看评审     │
│ 评委分配     │     │ 按维度打分   │     │ 谁看过我     │
│ 审计日志     │     │ 反馈回复     │     │ 反馈申诉     │
│ 发布结果     │     │ 备注留痕     │     │ 排行榜      │
└─────────────┘     └─────────────┘     └─────────────┘
```

| 角色 | 入口 | 核心功能 |
|------|------|----------|
| **游客** | `/competitions` `/showcase` `/ranking` | 查看赛事规则、公开权重、作品展示墙、排行榜 |
| **参赛者** | `/dashboard` | 提交作品（表单+外链+附件）、查看「谁看过我」、反馈申诉 |
| **评委** | `/judge` | 审阅作品 → AI 提问 → 查看材料作答 → 按维度打分 → 备注留痕 |
| **管理员** | `/admin` | 赛事/赛道/阶段/维度管理、均衡分配评委、审计日志、发布结果 |

## 📂 项目结构

```
realship/
├── .github/workflows/    # CI/CD：Docker 镜像构建与发布
├── prisma/               # 数据模型 & 迁移 & 种子数据
├── public/               # 静态资源
├── scripts/              # 开发辅助脚本
├── src/
│   ├── app/              # Next.js App Router 路由
│   │   ├── (public)/     #   游客可访问页面
│   │   ├── (participant)/#   参赛者面板
│   │   ├── (judge)/      #   评委面板
│   │   ├── (admin)/      #   管理后台
│   │   └── api/          #   API 路由
│   ├── components/       # React 组件
│   │   ├── ui/           #   基础 UI 组件库
│   │   ├── forms/        #   表单组件
│   │   ├── review/       #   审阅（埋点追踪）
│   │   ├── showcase/     #   作品展示
│   │   └── audit/        #   审计（谁看过我）
│   ├── lib/              # 工具库
│   │   ├── ai/           #   AI 提问引擎 + 防注入
│   │   ├── scoring/      #   评分聚合 + 排名算法
│   │   ├── storage/      #   存储抽象（S3 / 本地）
│   │   └── validators/   #   Zod 校验器
│   ├── server/actions/   # Server Actions
│   └── auth.ts           # Auth.js 认证配置
├── Dockerfile            # 多阶段构建（4 层）
├── docker-compose.yml    # 容器编排
└── DEPLOY.md             # 完整部署文档
```

## 🐳 Docker 架构

Dockerfile 采用 4 阶段构建，产出最小运行镜像：

```
deps ──► builder ──► runner     （生产运行，非 root）
                 └──► migrator  （数据库迁移，按需执行）
```

```bash
# 构建镜像
docker compose build

# 数据库迁移
docker compose --profile setup run --rm migrate

# 写入演示数据（可选）
docker compose --profile setup run --rm migrate npm run db:seed

# 启动应用
docker compose up -d app

# 自托管数据库（可选）
docker compose --profile local-db up -d db
```

> 📖 完整部署文档请参阅 [DEPLOY.md](./DEPLOY.md)

## 🧪 演示数据

运行 `npm run db:seed` 后可使用以下账号（密码均为 `Password123!`）：

| 角色 | 账号 | 入口 |
|------|------|------|
| 管理员 | `admin@real2026.dev` | `/admin` |
| 评委 | `judge1@real2026.dev` ~ `judge3` | `/judge` |
| 选手 | `player1@real2026.dev` ~ `player5` | `/dashboard` |

种子内置 5 个对照作品：全加分 · 开源组件 · 纯 PPT 概念 · H5 套壳 · 团队作品。

## 🤝 参与贡献

欢迎贡献代码！请遵循以下流程：

1. **Fork** 本仓库
2. 创建特性分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'feat: 添加某个功能'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 发起 **Pull Request**

### 开发规范

- 使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范提交信息
- 代码提交前请运行 `npm run lint` 确保通过检查
- 所有代码注释和文档使用中文

## 📄 许可证

本项目基于 [MIT License](LICENSE) 开源。

## 💬 反馈与支持

- 🐛 **Bug 报告**：[提交 Issue](https://github.com/Okysu/realship/issues/new?labels=bug)
- 💡 **功能建议**：[提交 Issue](https://github.com/Okysu/realship/issues/new?labels=enhancement)
- 📧 **联系方式**：通过 GitHub Issues 与我们沟通

---

<div align="center">

**如果这个项目对你有帮助，请给个 ⭐ Star 支持一下！**

Made with ❤️ by [Okysu](https://github.com/Okysu)

</div>
