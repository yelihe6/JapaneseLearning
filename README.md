# Japanese Kana Trainer

日语假名学习应用，支持平假名、片假名的认读、听写与测验，含登录注册、多语言（中/英/日）及个人资料管理。

## 功能特性

- **假名学习**：平假名、片假名图表与发音
- **练习模式**：填空、听写、测验
- **问候语**：常用日语问候学习
- **用户系统**：注册、登录、登出、个人资料
- **多语言**：中文、English、日本語

## 技术栈

- **前端**：React 18 + TypeScript + Vite + Tailwind CSS
- **后端**：Node.js + Express + Prisma + SQLite
- **认证**：JWT（HttpOnly Cookie）

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
```

### 2. 启动认证后端

```bash
cd project/auth-server

# 安装依赖
npm install

# 复制环境变量并配置 JWT 密钥
cp .env.example .env
# 编辑 .env，至少修改 JWT_ACCESS_SECRET 和 JWT_REFRESH_SECRET

# 初始化数据库
npx prisma generate
npx prisma migrate dev --name init

# 启动后端（默认 http://localhost:4000）
npm run dev
```

### 3. 启动前端

```bash
cd project

# 安装依赖（首次需执行）
npm install

# 启动开发服务器（默认 http://localhost:5173）
npm run dev
```

> 若从旧版本升级，建议执行 `npm install` 以同步依赖（已移除未使用的 `@supabase/supabase-js`）。

前端会将 `/api` 请求代理到后端，无需额外 CORS 配置。

## 项目结构

```
project/
├── src/                 # 前端源码
│   ├── components/     # 假名图表、测验、练习等组件
│   ├── contexts/       # Auth、Language 上下文
│   ├── pages/          # 登录页、个人资料页
│   ├── services/       # API、语音、存储等
│   ├── i18n/           # 多语言文案
│   └── data/           # 假名、问候语数据
├── auth-server/        # 认证后端
│   ├── src/
│   │   ├── routes/     # 注册、登录、刷新等路由
│   │   └── auth/      # JWT、Cookie、密码哈希
│   └── prisma/         # 数据库 Schema
├── index.html
├── package.json
└── vite.config.ts
```

## 脚本说明

### 前端 (project/)

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm run preview` | 预览构建结果 |
| `npm run lint` | ESLint 检查 |
| `npm run typecheck` | TypeScript 类型检查 |

### 后端 (project/auth-server/)

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm run start` | 启动生产服务器 |
| `npx prisma studio` | 数据库可视化 |

## 环境变量

后端需配置 `.env`，参考 `project/auth-server/.env.example`：

- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`：JWT 密钥（至少 16 位）
- `FRONTEND_ORIGIN`：前端地址，用于 CORS
- `DATABASE_URL`：SQLite 路径，默认 `file:./dev.db`

## 其他说明

- **网站图标**：`index.html` 中的 favicon 使用外部链接。若链接过期，可将 `favicon.ico` 放入 `project/public/` 并修改为 `href="/favicon.ico"`。
- **推送至 GitHub**：详见 [GITHUB_SETUP.md](./GITHUB_SETUP.md)。

## 许可证

MIT License
