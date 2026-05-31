# Docker 部署指南

本文档提供快速 Docker 部署步骤。完整部署文档请参考 [DEPLOY.md](./DEPLOY.md)。

## 快速开始

### 1. 环境准备

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填写以下关键配置：
# - DATABASE_URL: PostgreSQL 数据库连接
# - DIRECT_URL: PostgreSQL 直连（用于迁移）
# - AUTH_SECRET: 随机生成的密钥
# - APP_URL: 应用访问地址
```

### 2. Docker 构建与启动

```bash
# 构建镜像
docker compose build

# 同步数据库 schema（首次部署执行）
docker compose --profile setup run --rm migrate

# 启动应用
docker compose up -d app

# 查看日志
docker compose logs -f app
```

### 3. 验证部署

访问 `http://localhost:3000` 验证应用是否正常运行。

## 配置说明

### 文件存储

- **本地存储**（开发默认）：上传文件保存在容器内 `uploads/` 目录
- **S3 存储**（生产推荐）：配置 `STORAGE_DRIVER=s3` 及相关 S3 环境变量

### AI 功能（可选）

配置 `AI_API_KEY`、`AI_BASE_URL`、`AI_MODEL` 启用 AI 提问功能。留空则禁用。

### 邮件功能（可选）

配置 `SMTP_*` 相关变量启用邮件通知。留空则邮件功能降级禁用。

## 生产部署建议

1. **使用外部数据库**：推荐使用 Neon 等托管 PostgreSQL 服务
2. **启用 S3 存储**：多实例部署时必须使用 S3
3. **配置反向代理**：使用 Nginx 或 Caddy 处理 HTTPS
4. **定期备份**：数据库和上传文件需要定期备份

## 常见问题

**Q: 启动报 Prisma 引擎错误？**  
A: 确认基础镜像已安装 `openssl`，引擎平台匹配。

**Q: 上传大文件失败？**  
A: 检查反向代理 `client_max_body_size` 和 `MAX_UPLOAD_MB` 配置。

**Q: AI 提问不出现？**  
A: 检查 `AI_API_KEY`、`AI_BASE_URL`、`AI_MODEL` 是否配置正确。

---

详细部署文档请参考 [DEPLOY.md](./DEPLOY.md)。
