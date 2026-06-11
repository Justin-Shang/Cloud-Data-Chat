# Cloud Data Chat ☁️💬

> **用自然语言对话的方式查询你的数据库** — 上传 Excel，像聊天一样问问题。

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-5-000000?logo=express)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)](https://www.postgresql.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle-ORM-C5F74F?logo=drizzle)](https://orm.drizzle.team/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## ✨ 核心特性

| 特性 | 说明 |
|------|------|
| 📤 **Excel 一键上传** | 上传 `.xlsx` 文件，自动解析列名与行数据，存入 PostgreSQL |
| 💬 **自然语言查询** | 用中文 / 英文对话的方式搜索数据，无需写 SQL |
| 🔍 **多关键词 AND 匹配** | 智能分词提取关键信息，支持中英文混合查询 |
| 📊 **数据集管理** | 查看、筛选、删除数据集；浏览每条记录的完整行数据 |
| 🏠 **数据概览仪表盘** | 首页看板展示数据集总数、记录条数、字段数、最近上传 |
| 💾 **对话历史持久化** | 每次查询自动保存到数据库，刷新页面不丢失 |
| 🧩 **类型安全的 Monorepo** | pnpm workspaces 组织，API 契约驱动开发（OpenAPI → Zod → React Query） |
| 🚀 **生产就绪** | Nginx 反向代理配置、50MB 文件上传限制、CORS 支持 |

---

## 🖥️ 截图预览

| 首页仪表盘 | 对话查询 | 数据集管理 |
|:---:|:---:|:---:|
| ![首页](docs/screenshots/home.png) | ![对话](docs/screenshots/chat.png) | ![数据集](docs/screenshots/datasets.png) |

> ⚠️ 截图为占位符，部署后可用真实截图替换。

---

## 🏗️ 架构总览

```
Cloud-Data-Chat/
├── artifacts/                      # 可部署产物
│   ├── api-server/                 # 🖥️ Express 5 API 服务
│   └── data-chat/                  # 🌐 React 前端应用
│       └── src/pages/
│           ├── home.tsx            # 首页仪表盘
│           ├── chat.tsx            # 对话查询页面
│           ├── datasets.tsx        # 数据集列表页
│           └── dataset-viewer.tsx  # 数据浏览页
├── lib/                            # 共享库（monorepo 内部包）
│   ├── api-spec/                   # 📜 OpenAPI 3.1 契约（源头真理）
│   ├── api-zod/                    # ✅ Zod 验证 schema（从 OpenAPI 生成）
│   ├── api-client-react/           # 🔗 React Query 客户端 hooks
│   └── db/                         # 🗄️ 数据库层（Drizzle ORM + PostgreSQL）
│       └── src/schema/
│           ├── datasets.ts         # 数据集表
│           ├── records.ts          # 数据记录表（JSONB 存行数据）
│           └── chat_messages.ts    # 对话消息表
├── scripts/                        # 构建与部署脚本
├── nginx.conf.example              # Nginx 反向代理配置
├── pnpm-workspace.yaml             # Monorepo 工作空间配置
└── package.json                    # 根包管理
```

### 数据流简图

```
用户 ──💬 对话查询──▶ 前端 (React)
                        │
                        ▼
                    API (Express 5) ──🔍 关键词提取──▶ PostgreSQL (JSONB ILIKE)
                        │                                          │
                        ▼                                          ▼
                  返回匹配记录 ◀──── 聊天历史持久化 ◀──── 自动保存到 chat_messages
```

---

## 🧠 核心技术

### 搜索机制

采用**自然语言 → 关键词 → AND 匹配**的方式处理查询：

1. 用户输入：「查找北京地区去年入职的员工」
2. 系统自动剔除停用词（"的、地、了" 等），提取关键词：`北京 去年 入职 员工`
3. 对 PostgreSQL `row_data`（JSONB 类型）逐字段做 `ILIKE` 模糊匹配
4. 所有关键词必须同时命中（AND 语义），返回前 20 条匹配结果
5. 标记每条记录中命中的列字段，前端高亮显示

### 技术栈明细

| 层级 | 技术 | 版本 |
|------|------|------|
| **前端框架** | React + TypeScript + Vite | React 19 / TS 5.9 |
| **UI 组件库** | shadcn/ui + Tailwind CSS v4 | — |
| **状态管理** | @tanstack/react-query | — |
| **路由** | wouter（轻量） | — |
| **后端框架** | Express 5 + pino-http 日志 | — |
| **ORM** | Drizzle ORM | — |
| **数据库** | PostgreSQL 16 | — |
| **文件解析** | xlsx（Excel）、multer（上传） | 50MB 限制 |
| **验证** | Zod / drizzle-zod | — |
| **API 代码生成** | Orval（OpenAPI → hooks + Zod） | — |
| **包管理** | pnpm workspaces | — |
| **日志** | pino | — |

### API 概览

| Endpoint | 方法 | 功能 |
|----------|------|------|
| `/api/healthz` | GET | 健康检查 |
| `/api/datasets` | GET | 数据集列表 |
| `/api/datasets` | POST | 上传 Excel 创建数据集 |
| `/api/datasets/stats` | GET | 数据统计概览 |
| `/api/datasets/:id` | GET | 单个数据集详情 |
| `/api/datasets/:id` | DELETE | 删除数据集 |
| `/api/datasets/:id/records` | GET | 分页浏览记录（支持搜索过滤） |
| `/api/chat/history` | GET | 获取聊天历史 |
| `/api/chat/message` | POST | 发送对话查询 |

完整的 API 契约定义在 [`lib/api-spec/openapi.yaml`](lib/api-spec/openapi.yaml)。

---

## 🚀 快速开始

### 前置要求

- **Node.js** 20+
- **pnpm** 9+
- **PostgreSQL** 16+
- 一个可用的 PostgreSQL 数据库

### 1. 克隆并安装

```bash
git clone https://github.com/Justin-Shang/Cloud-Data-Chat.git
cd Cloud-Data-Chat
pnpm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`，填入你的数据库连接信息：

```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/datachat
SESSION_SECRET=your_random_secret_here
NODE_ENV=development
```

### 3. 初始化数据库

```bash
pnpm --filter @workspace/db run push
```

### 4. 启动开发服务

```bash
# 终端 1：启动 API 服务（端口 8080）
pnpm --filter @workspace/api-server run dev

# 终端 2：启动前端（端口 5173）
pnpm --filter @workspace/data-chat run dev
```

浏览器打开 **http://localhost:5173** 即可使用。

### 5. 生产部署

```bash
# 构建所有包
pnpm run build

# 使用 nginx 反向代理（参考 nginx.conf.example）
# 前端静态文件：artifacts/data-chat/dist/public/
# API 服务端口：8080
```

---

## 📦 Monorepo 包结构

| 包名 | 路径 | 职责 |
|------|------|------|
| `@workspace/api-server` | `artifacts/api-server/` | Express API 服务 |
| `@workspace/data-chat` | `artifacts/data-chat/` | React 前端应用 |
| `@workspace/api-spec` | `lib/api-spec/` | OpenAPI 3.1 规范（真相源头） |
| `@workspace/api-zod` | `lib/api-zod/` | Zod 验证 schema（从 API spec 生成） |
| `@workspace/api-client-react` | `lib/api-client-react/` | React Query hooks（自动生成） |
| `@workspace/db` | `lib/db/` | Drizzle ORM schema + 数据库连接 |

### 代码重新生成

```bash
# 修改 openapi.yaml 后重新生成 API 客户端
pnpm --filter @workspace/api-spec run codegen
```

---

## 🧪 脚本参考

```bash
pnpm run typecheck              # 全项目类型检查
pnpm run build                  # 类型检查 + 构建所有包
pnpm --filter @workspace/db run push   # 推送数据库 schema（开发环境）
pnpm --filter @workspace/api-spec run codegen  # 重新生成 API 客户端
```

---

## 🛠️ 开发指引

### 目录约定

- `lib/` 下的包是共享的纯逻辑库（无运行时依赖）
- `artifacts/` 下的产物是可以独立运行的部署单元
- 每个包的 `package.json` 通过 pnpm workspace `"@workspace/*"` 互相引用
- API 的通信契约由 `lib/api-spec/openapi.yaml` 统一管理，前端类型由 Orval 自动生成

---

## 🧩 Roadmap（想法）

- [ ] 支持 CSV / JSON 格式上传
- [ ] 搜索结果导出（CSV / Excel）
- [ ] 图表示例自动生成（基于查询结果）
- [ ] 数据集之间的关联查询（JOIN 语义）
- [ ] 多用户 / 权限管理
- [ ] 对话分支（回溯历史查询点）

---

## 📄 License

[MIT](LICENSE)

---

## 🤝 贡献

欢迎提 issue 或 PR！如果你有好的想法或遇到了 bug，请先开 issue 讨论。

---

*Made with ☕ and TypeScript by Justin-Shang*
