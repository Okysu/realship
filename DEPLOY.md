# 部署文档 · Realship 评选平台

本平台基于 **Next.js 16（standalone）+ Prisma 6 + PostgreSQL**，推荐用 Docker 部署。
本文覆盖三种路径：① Docker + 外部数据库（推荐）② Docker 全自托管 ③ 裸 Node。

---

## 1. 架构概览

```
                 ┌──────────────────────────────────────┐
   浏览器 ──HTTPS──▶  反向代理(Nginx/Caddy) ──▶ app:3000   │
                 │       (Next.js standalone, Node 20)    │
                 └───────────┬───────────────┬───────────┘
                             │               │
                   PostgreSQL│               │对象存储(可选)
                  (Neon / 自托管)        (R2 / B2 / MinIO / 本地卷)
```

- **应用**：单进程 Node 服务（`server.js`），监听 `3000`。无状态，可水平扩展（多副本需用 S3 存储，见下）。
- **数据库**：任意 PostgreSQL 16+。云上推荐 [Neon](https://neon.tech)；也可用 compose 内置库自托管。
- **文件存储**：`local`（写入容器内 `uploads/`，需挂载卷）或 `s3`（S3 兼容，**多副本/生产推荐**）。
- **可选能力**：AI 提问式审查（OpenAI 兼容端点）、SMTP 邮件（重置密码 / 注册验证码）。三者均可留空降级。

---

## 2. 前置条件

| 组件 | 版本 | 说明 |
|---|---|---|
| Docker | 24+ | 含 Docker Compose v2（`docker compose`） |
| PostgreSQL | 16+ | 外部（Neon）或用内置 `local-db` profile |
| 域名 + TLS | — | 生产必备；由反向代理终止 HTTPS |

> 不用 Docker 也可（见 §7），需本机 Node 20+ 与 PostgreSQL。

---

## 3. 环境变量速查

复制样例并填写：

```bash
cp .env.example .env
```

| 变量 | 必填 | 说明 |
|---|:--:|---|
| `DATABASE_URL` | ✅ | 运行时连接（建议 pooled / pgbouncer），勿带 `channel_binding` |
| `DIRECT_URL` | ✅ | 迁移 / `db push` 直连（unpooled） |
| `AUTH_SECRET` | ✅ | 会话签名密钥，`openssl rand -base64 32` 生成 |
| `APP_URL` | 生产✅ | 对外绝对地址（邮件链接用），如 `https://real.example.com` |
| `STORAGE_DRIVER` | — | `local`（默认）或 `s3` |
| `MAX_UPLOAD_MB` | — | 单文件上限，默认 200 |
| `S3_ENDPOINT` 等 | s3 时✅ | `S3_REGION / S3_FORCE_PATH_STYLE / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY / S3_BUCKET` |
| `AI_API_KEY` `AI_BASE_URL` `AI_MODEL` | — | AI 审查端点；留空则禁用 AI 提问 |
| `AI_AGENTS` | — | 多 agent 交叉评分（JSON 数组），优先于单组 |
| `SMTP_*` | — | `SMTP_HOST/PORT/SECURE/USER/PASS/FROM`；留空则邮件功能降级禁用 |

> ⚠️ **安全**：`.env` 已被 `.gitignore` 与 `.dockerignore` 双重忽略，绝不会进入仓库或镜像。务必使用全新随机的 `AUTH_SECRET` 与独立的数据库 / 密钥凭据。

---

## 4. 路径一：Docker + 外部数据库（推荐）

适用于数据库托管在 Neon 等云服务。

```bash
# 1) 准备环境变量
cp .env.example .env
#    填写 DATABASE_URL / DIRECT_URL（指向你的 Neon 库）
#    填写 AUTH_SECRET、APP_URL，按需填 S3 / AI / SMTP

# 2) 构建镜像
docker compose build

# 3) 同步数据库 schema（首次部署 / schema 变更后执行）
docker compose --profile setup run --rm migrate

# 4)（可选）写入演示种子数据
docker compose --profile setup run --rm migrate npm run db:seed

# 5) 启动应用
docker compose up -d app

# 6) 查看日志 / 状态
docker compose logs -f app
```

访问 `http://<服务器IP>:3000`（生产请置于反向代理后，见 §8）。

---

## 5. 路径二：Docker 全自托管（含内置 PostgreSQL）

无外部数据库时，用 `local-db` profile 启动内置 Postgres。

```bash
# 1) .env 中把数据库指向内置库：
#    DATABASE_URL="postgresql://real:real@db:5432/real"
#    DIRECT_URL="postgresql://real:real@db:5432/real"
#    （并设置 AUTH_SECRET、APP_URL）

# 2) 启动数据库
docker compose --profile local-db up -d db

# 3) 同步 schema（+ 可选 seed）
docker compose --profile setup --profile local-db run --rm migrate
docker compose --profile setup --profile local-db run --rm migrate npm run db:seed

# 4) 启动应用
docker compose up -d app
```

> 内置库数据持久化在 `pgdata` 卷。生产自托管务必改强密码并配置定期备份（§9）。

---

## 6. 数据库 schema 与种子

- 本项目采用 **`prisma db push`** 工作流（无 migration 文件），schema 即 `prisma/schema.prisma`。
- **每次 schema 变更后**重新执行第 3 步的 `migrate`，将变更同步到库。
- `npm run db:seed` 写入演示赛事 / 账号，**仅用于演示环境**，生产首次部署可跳过。

---

## 7. 路径三：不使用 Docker（裸 Node）

```bash
npm ci
cp .env.example .env        # 填写变量
npx prisma generate
npx prisma db push          # 同步 schema（用 DIRECT_URL）
npm run build               # 产出 .next/standalone
npm start                   # 或：node .next/standalone/server.js
```

建议用 `pm2` / `systemd` 守护进程，并置于反向代理后。

---

## 8. 反向代理与 HTTPS

平台已设 `trustHost: true`，可直接置于反向代理之后。注意上传上限需放宽到 ≥ `MAX_UPLOAD_MB`。

**Caddy（自动 HTTPS，最简）：**

```caddy
real.example.com {
    reverse_proxy localhost:3000
    request_body {
        max_size 210MB
    }
}
```

**Nginx：**

```nginx
server {
    listen 443 ssl http2;
    server_name real.example.com;
    # ssl_certificate / ssl_certificate_key ...

    client_max_body_size 210M;   # ≥ MAX_UPLOAD_MB，留余量

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;     # 大文件上传
    }
}
```

> 配好域名后，把 `.env` 的 `APP_URL` 改为 `https://real.example.com` 并重启 `app`。

---

## 9. 持久化、备份与运维

- **上传文件**：`local` 驱动落在 `uploads` 卷；S3 驱动落在对象存储。多副本部署必须用 S3。
- **数据库备份**（内置库示例）：
  ```bash
  docker compose exec db pg_dump -U real real > backup-$(date +%F).sql
  ```
  Neon 等云服务用其自带的分支 / PITR 能力。
- **日志**：`docker compose logs -f app`。
- **审计**：平台内置 `AuditLog`，敏感管理操作全程留痕（管理员后台「审计日志」查看）。

---

## 10. 升级 / 重新部署

```bash
git pull
docker compose build
docker compose --profile setup run --rm migrate   # 若 schema 有变更
docker compose up -d app                           # 滚动替换
```

---

## 11. 上线安全清单

- [ ] `AUTH_SECRET` 为全新随机值（勿复用样例 / 开发值）
- [ ] 数据库、AI、SMTP、S3 凭据均为**生产独立**且未泄露（开发期出现过的凭据应轮换）
- [ ] `APP_URL` 指向真实 HTTPS 域名
- [ ] 反向代理启用 HTTPS，`client_max_body_size` ≥ `MAX_UPLOAD_MB`
- [ ] 生产用 `STORAGE_DRIVER=s3`（或确保 `uploads` 卷已持久化 + 备份）
- [ ] 数据库已配置定期备份
- [ ] 未执行 `db:seed`（除非确需演示数据）
- [ ] 首位管理员账号已创建并改用强密码

---

## 12. 故障排查

| 现象 | 排查 |
|---|---|
| 启动报 Prisma 引擎 / openssl 错误 | 镜像基于 Debian + openssl 已内置；若自改基础镜像，确认 `openssl` 已安装、引擎平台匹配 |
| 上传大文件失败 | 反向代理放宽 body 上限；检查 `MAX_UPLOAD_MB` |
| 邮件不发送 | 确认 `SMTP_*` 已填且端口/加密匹配；留空时该功能为「降级禁用」属正常 |
| AI 提问不出现 | 检查 `AI_API_KEY/AI_BASE_URL/AI_MODEL`；三者任一缺失即整体禁用 |
| 登录后跳回登录页 | 确认 `AUTH_SECRET` 在构建后未变更、`APP_URL`/反代 `X-Forwarded-Proto` 正确 |
| 重新 seed 后旧会话异常 | 旧 JWT 指向已删用户，登出重登即可 |
