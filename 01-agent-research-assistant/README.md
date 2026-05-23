# 01-agent-research-assistant

智能研究助手 Agent，配套教程：[构建你的第一个 AI Agent](https://blog.zkkysqs.tophttps://blog.zkkysqs.top/ai/08-build-first-agent.html)

## 功能

- ReAct 推理循环（Thought → Action → Observation）
- 工具：维基百科、计算器、文件读写、网络搜索（Serper，可选）
- SQLite 会话记忆
- React + SSE 实时进度
- 流式 Markdown 渲染 + 打字机效果
- 可折叠的推理步骤展示
- 智能滚动控制

## 快速开始

### 1. 后端

```bash
cd server
pnpm install
cp .env.example .env
# 编辑 .env，填入 OPENAI_API_KEY
pnpm dev
```

API 默认：`http://localhost:3000`

### 2. 前端

```bash
cd client
pnpm install
pnpm dev
```

浏览器打开：`http://localhost:5173`（已代理 `/api` 到后端）

### 3. 测试

```bash
cd server
pnpm test
```

### 4. Docker 部署

```bash
# 配置 .env 后
docker-compose up -d
# 访问 http://localhost:8080
```

## 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `OPENAI_API_KEY` | 是 | OpenAI 兼容 API Key |
| `OPENAI_MODEL` | 否 | 默认 `deepseek-chat` |
| `OPENAI_BASE_URL` | 否 | 默认 `https://api.deepseek.com` |
| `SERPER_API_KEY` | 否 | 未配置时使用搜索演示数据 |
| `PORT` | 否 | 默认 `3000` |
| `DATABASE_PATH` | 否 | 默认 `./data/agent.db` |

## 目录结构

```
01-agent-research-assistant/
├── server/              # Express + Agent 核心
│   ├── src/
│   │   ├── api/         # REST + SSE 路由
│   │   ├── agent/       # ReAct 推理引擎
│   │   ├── llm/         # LLM 客户端封装
│   │   └── tools/       # 工具注册中心
│   └── package.json
├── client/              # Vite + React UI
│   ├── src/
│   │   ├── components/  # UI 组件
│   │   └── hooks/       # 自定义 Hook
│   └── package.json
├── docs/                # 项目文档
├── docker-compose.yml
└── README.md
```

## 📚 文档

详细文档见 [docs/README.md](./docs/README.md)：

| 文档 | 说明 |
|------|------|
| [文档入口](./docs/README.md) | 项目概述、功能、目录结构、导航 |
| [项目架构](./docs/architecture.md) | 系统架构、时序图、设计决策 |
| [后端技术](./docs/backend.md) | Express 服务、Agent 核心、工具系统 |
| [前端技术](./docs/frontend.md) | React 组件、状态管理、SSE 通信 |
| [AI 技术](./docs/ai-technology.md) | ReAct 原理、技术演进、升级路线 |

## 🔜 后续优化

| 优先级 | 功能 | 说明 |
|--------|------|------|
| ⭐⭐⭐ | 多轮对话 | 支持上下文连续对话，记住之前的交流内容 |
| ⭐⭐⭐ | 记忆功能 | 长期记忆支持，向量数据库存储历史知识 |
| ⭐⭐⭐ | 历史消息展示 | 侧边栏显示历史会话列表，支持切换和继续 |
| ⭐⭐ | 会话管理 | 新建/删除/重命名会话 |
| ⭐⭐ | 导出功能 | 导出对话为 Markdown/PDF |
| ⭐⭐ | Function Calling | 使用 LLM 原生工具调用替代文本解析 |
| ⭐ | RAG 知识库 | 支持上传文档，基于文档问答 |
| ⭐ | 多 Agent 协作 | 研究员 + 编辑 + 审核员分工协作 |
| ⭐ | 语音输入 | 支持语音转文字输入 |

## 远程仓库

代码同步至：<https://github.com/Keekuun/hello-agent>