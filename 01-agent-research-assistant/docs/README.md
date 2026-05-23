# 智能研究助手 Agent - 项目文档

基于 **ReAct（Reasoning + Acting）** 推理框架的全栈 AI Agent 应用。用户输入研究任务后，Agent 自动多轮推理、调用外部工具，最终生成结构化研究报告。

配套教程：[构建你的第一个 AI Agent](https://blog.zkkysqs.top/ai/08-build-first-agent.html)

---

## 文档导航

| 文档 | 说明 |
|------|------|
| [项目架构](./architecture.md) | 系统架构、时序图、数据流、部署、关键设计决策 |
| [后端技术](./backend.md) | Express 服务、Agent 核心、工具系统、记忆系统 |
| [前端技术](./frontend.md) | React 组件、状态管理、SSE 通信、样式与动画 |
| [AI 技术](./ai-technology.md) | 技术演进、ReAct 原理、主流 Agent 对比、升级路线 |

---

## 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                      Client (React)                         │
│   ChatInterface → StepsProcess → StreamingMarkdown          │
└───────────────────────────┬─────────────────────────────────┘
                            │ SSE + REST
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Server (Express)                        │
│   API Routes → ResearchAgent → ReActEngine                  │
│                           ↓                                 │
│              LLM Client + ToolRegistry + Memory             │
└─────────────────────────────────────────────────────────────┘
```

---

## 核心功能

| 功能 | 描述 |
|------|------|
| **ReAct 推理循环** | Thought → Action → Observation 多轮迭代，最多 10 轮 |
| **工具调用** | 网络搜索 (Serper)、维基百科、计算器、文件读写 |
| **多 LLM 支持** | OpenAI SDK + baseURL，兼容 DeepSeek、本地模型等 |
| **流式输出** | SSE 实时推送每个推理步骤 |
| **打字机效果** | 最终答案逐字显示 + 实时 Markdown 渲染 |
| **可折叠步骤展示** | 思考 / 工具调用 / 观察结果可展开收起 |
| **持久化记忆** | SQLite 存储会话历史和知识 |
| **智能滚动** | 输出时自动滚动，用户上翻时暂停，支持一键回底 |
| **Docker 部署** | 前后端独立容器，Nginx 反向代理 |

---

## 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | React 18 + Vite + Tailwind CSS + Framer Motion |
| **后端** | Express + TypeScript + OpenAI SDK |
| **数据库** | SQLite (better-sqlite3) |
| **AI** | ReAct 推理 + 多 LLM 支持 (DeepSeek / OpenAI) |
| **部署** | Docker + Nginx |

---

## 目录结构

```
01-agent-research-assistant/
├── README.md                       # 快速开始
├── docs/                           # 项目文档（本目录）
│   ├── README.md                   # 文档入口
│   ├── architecture.md             # 架构与设计
│   ├── backend.md                  # 后端详解
│   ├── frontend.md                 # 前端详解
│   └── ai-technology.md            # AI 技术详解
├── Dockerfile
├── docker-compose.yml
│
├── server/                         # 后端服务
│   ├── src/
│   │   ├── index.ts                # Express 入口
│   │   ├── api/routes.ts           # REST + SSE 路由
│   │   ├── agent/
│   │   │   ├── types.ts            # 核心类型定义
│   │   │   ├── index.ts            # ResearchAgent 编排器
│   │   │   ├── react-engine.ts     # ReAct 推理引擎
│   │   │   ├── memory.ts           # SQLite 持久化记忆
│   │   │   └── in-memory-memory.ts # 内存记忆（测试）
│   │   ├── llm/openai-client.ts    # LLM 客户端封装
│   │   └── tools/                  # 工具注册中心
│   │       ├── index.ts
│   │       ├── search.ts
│   │       ├── wikipedia.ts
│   │       ├── calculator.ts
│   │       └── file.ts
│   └── package.json
│
└── client/                         # 前端应用
    ├── src/
    │   ├── App.tsx
    │   ├── hooks/useAgent.ts
    │   └── components/
    │       ├── ChatInterface.tsx
    │       ├── AgentStatus.tsx
    │       ├── StreamingMarkdown.tsx
    │       ├── MarkdownRenderer.tsx
    │       └── TypewriterText.tsx
    └── vite.config.ts
```

---

## 快速开始

详见项目根目录 [README.md](../README.md)。

```bash
# 后端
cd server && pnpm install && cp .env.example .env && pnpm dev

# 前端
cd client && pnpm install && pnpm dev

# 访问 http://localhost:5173
```

---

## 改进路线图

详见 [AI 技术 - 升级路线建议](./ai-technology.md#42-升级路线建议)。

| 阶段 | 重点 |
|------|------|
| **Phase 1** | Function Calling、RAG、错误重试 |
| **Phase 2** | LangGraph、MCP 协议、向量数据库 |
| **Phase 3** | 用户认证、监控日志、高可用部署 |
| **Phase 4** | 多 Agent 协作、可视化编排、自动评估 |

---

## 参考资料

| 资源 | 链接 |
|------|------|
| ReAct 论文 | https://arxiv.org/abs/2210.03629 |
| LangChain | https://js.langchain.com/ |
| LangGraph | https://langchain-ai.github.io/langgraph/ |
| MCP 协议 | https://modelcontextprotocol.io/ |
| OpenAI Function Calling | https://platform.openai.com/docs/guides/function-calling |
