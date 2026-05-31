# syntax=docker/dockerfile:1
# ============================================================
# Real 评选平台 · 多阶段构建
# Next.js 16（standalone 输出）+ Prisma 6 + Node 20（Debian slim）
# 产物：最小运行镜像（仅 standalone + 静态资源 + Prisma 引擎）
# ============================================================

# ---- 1) 依赖层：安装全部依赖（含 devDependencies，构建需要）----
FROM node:20-bookworm-slim AS deps
WORKDIR /app
# Prisma 查询引擎运行期依赖 openssl
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ---- 2) 构建层：prisma generate + next build（standalone）----
FROM node:20-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# 生成 Prisma Client（含与本镜像匹配的 Debian/openssl3 查询引擎二进制）
RUN npx prisma generate
# 构建期占位变量：Next/Auth 构建时无需真实密钥与数据库，运行时由 env 覆盖。
ENV NEXT_TELEMETRY_DISABLED=1 \
    AUTH_SECRET=build-time-placeholder-overridden-at-runtime \
    DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder \
    DIRECT_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
RUN npm run build

# ---- 3) 迁移层（按需执行）：含 Prisma CLI 与 tsx，用于 db push 与 seed ----
FROM builder AS migrator
ENV NODE_ENV=production
# 默认动作：将 schema 同步到数据库（首次部署或 schema 变更后执行）
# seed 另行：docker compose --profile setup run --rm migrate npm run db:seed
CMD ["npx", "prisma", "db", "push", "--skip-generate"]

# ---- 4) 运行层：仅 standalone 产物，最小镜像、非 root 运行 ----
FROM node:20-bookworm-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
# 非 root 用户
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -m nextjs

# Next standalone：自带精简 node_modules + server.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# 显式补齐 Prisma 引擎（standalone 文件追踪偶尔漏拷 .prisma 引擎二进制）
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# 本地存储驱动（STORAGE_DRIVER=local）的落盘目录；
# 生产建议挂载数据卷持久化，或改用 S3（STORAGE_DRIVER=s3）。
RUN mkdir -p uploads && chown nextjs:nodejs uploads

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
