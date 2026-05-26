# 02-agent-writing-studio

基于 **Slate + Y.js** 的博客/文章协同编辑器，配套 hello-agent 系列第二章。

## 功能

### 一期
- 块编辑器：标题、段落、列表、引用、代码块、分隔线、图片
- Markdown 快捷键与 `/` 命令菜单
- 分屏预览（GFM + 代码高亮）
- 导出 Markdown / HTML、复制到剪贴板
- Front matter 元数据（slug、状态、标签、封面）
- 自动保存 + 版本快照
- **AI 写作助手**：润色、扩写、插入提纲；通过 tools 直接修改文档块
- Better Auth 邮箱登录

### 二期
- Hocuspocus 实时协同（多标签/多人）
- Awareness 在线头像
- 分享链接（只读 / 可编辑 token）

## 技术栈

| 层级 | 技术 |
|------|------|
| 全栈 | Next.js 16 App Router + React 19 |
| 样式 | Tailwind CSS v4 |
| 编辑器 | Slate + slate-react + @slate-yjs/core + Yjs |
| 协同 | @hocuspocus/server / provider |
| 数据库 | PostgreSQL + Drizzle ORM |
| 认证 | Better Auth |
| AI | Vercel AI SDK |

## 环境要求

- `package.json` → `engines.node`: **>=20.9.0**（Next.js 16）
- 根目录 `.nvmrc`: **22**（供 nvm / fnm 选用，可选）

```bash
node -v   # >= v20.9.0
```

若 `globals.css` 报 `Cannot find @tailwindcss/oxide-win32-x64-msvc`，在项目根执行：

```bash
Remove-Item -Recurse -Force node_modules, apps\web\.next -ErrorAction SilentlyContinue
pnpm install
```

## 快速开始

```bash
cd 02-agent-writing-studio

# 启动 Postgres
docker compose up -d

# 安装依赖
pnpm install

# 配置环境（放在 monorepo 根目录，Next 会自动加载）
cp .env.example .env.local
# 编辑 .env.local

# 推送数据库 schema
pnpm db:push

# 启动 Web + 协同服务
pnpm dev
```

- 前端：http://localhost:3100（`apps/web` 默认端口 3100）
- 协同 WebSocket：ws://localhost:1234

开启协同时设置：

```env
NEXT_PUBLIC_ENABLE_COLLAB=true
NEXT_PUBLIC_COLLAB_WS_URL=ws://localhost:1234
```

## 目录结构

```
02-agent-writing-studio/
  apps/web/           # Next.js 应用
  packages/shared/    # 共享类型与 Zod schema
  collab-server/      # Hocuspocus 协同服务
  docker-compose.yml
```

## 测试

```bash
pnpm test
```

## 相关

- [01-agent-research-assistant](../01-agent-research-assistant/) — ReAct 研究助手
