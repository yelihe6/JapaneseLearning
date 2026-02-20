# Kana Auth Server

Node.js + Express + Prisma + SQLite + JWT (HttpOnly Cookie) 认证后端

## Quick Start

```bash
# 1) 安装依赖
npm install

# 2) 创建 .env（复制 .env.example 并修改 JWT 密钥）
cp .env.example .env
# 编辑 .env，至少修改 JWT_*_SECRET

# 3) 生成 Prisma Client 并初始化数据库
npx prisma generate
npx prisma migrate dev --name init

# 4) 启动开发服务器
npm run dev
```

服务器默认运行在 `http://localhost:4000`

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 注册（email, password, displayName?） |
| POST | `/api/auth/login` | 登录（email, password） |
| GET  | `/api/auth/me` | 获取当前登录用户（需 cookie） |
| POST | `/api/auth/refresh` | 刷新 access token（需 refresh cookie） |
| POST | `/api/auth/logout` | 登出（清除 cookie） |
| GET  | `/health` | 健康检查 |

## Cookie 策略

- `access_token`：HttpOnly，15 分钟
- `refresh_token`：HttpOnly，30 天
- SameSite: lax
- Secure: false（开发环境）

## 前端接入要点

1. **CORS + credentials**
   ```js
   fetch('http://localhost:4000/api/auth/login', {
     method: 'POST',
     credentials: 'include',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ email, password }),
   })
   ```

2. **不需要手动存 token**：后端通过 HttpOnly Cookie 自动携带

3. **判断登录态**：调用 `/api/auth/me`，若 401 则未登录

4. **登出**：调用 `/api/auth/logout`，后端会清除 cookie

## 环境变量

参考 `.env.example`：

```env
PORT=4000
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:5173
JWT_ACCESS_SECRET=...（至少 16 位）
JWT_REFRESH_SECRET=...（至少 16 位）
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=30d
COOKIE_SECURE=false
COOKIE_DOMAIN=
DATABASE_URL="file:./dev.db"
```

## 开发工具

```bash
npm run typecheck   # TypeScript 类型检查
npm run build      # 构建产物到 dist/
npm run start      # 启动生产服务器
npx prisma studio  # 数据库可视化
```

## 安全要点

- 密码使用 bcrypt 哈希
- Refresh token 在数据库哈希存储，支持吊销
- JWT 密钥请务必使用强随机值
- 生产环境请设置 `COOKIE_SECURE=true` 并启用 HTTPS
