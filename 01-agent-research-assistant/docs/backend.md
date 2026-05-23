# 后端技术详细说明

## 1. 技术栈概览

| 技术 | 版本 | 用途 |
|------|------|------|
| **Node.js** | 18+ | 运行时环境 |
| **Express** | 4.22.2 | HTTP 服务器框架 |
| **TypeScript** | 5.9.3 | 类型安全 |
| **OpenAI SDK** | 4.104.0 | LLM 调用客户端 |
| **better-sqlite3** | 11.10.0 | SQLite 数据库驱动 |
| **node-fetch** | 3.3.2 | HTTP 客户端 |
| **tsx** | 4.22.3 | TypeScript 执行引擎 |
| **Vitest** | 2.1.9 | 测试框架 |

---

## 2. 核心模块详解

### 2.1 入口文件 (index.ts)

```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const port = Number(process.env.PORT ?? 3000);

// 中间件
app.use(cors());                    // 跨域支持
app.use(express.json());            // JSON 解析
app.use('/api', apiRoutes);         // 路由挂载

// 健康检查
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
```

### 2.2 API 路由 (routes.ts)

**职责**: 管理会话生命周期，处理 HTTP 请求

**核心逻辑**:

```typescript
// 会话存储
const agents = new Map<string, ResearchAgent>();

// 创建会话
router.post('/sessions', (_req, res) => {
  const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const agent = createAgent(sessionId);
  agents.set(sessionId, agent);
  res.json({ sessionId });
});

// 执行任务 (SSE 流式)
router.post('/sessions/:sessionId/execute', async (req, res) => {
  const { sessionId } = req.params;
  const { task } = req.body;
  const agent = agents.get(sessionId);

  // 设置 SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // 执行任务，流式返回步骤
  const result = await agent.execute(task, (step) => {
    res.write(`data: ${JSON.stringify(step)}\n\n`);
  });

  // 返回最终结果
  res.write(`data: ${JSON.stringify({ complete: true, result })}\n\n`);
  res.end();
});
```

**会话创建流程**:

```typescript
function createAgent(sessionId: string): ResearchAgent {
  const memory = new SQLiteMemory(getDatabasePath(), sessionId);
  const apiKey = process.env.OPENAI_API_KEY;
  const llm = new OpenAIClient(apiKey, process.env.OPENAI_MODEL, process.env.OPENAI_BASE_URL);

  return new ResearchAgent({
    llm,
    tools: [],
    memory,
    maxIterations: Number(process.env.MAX_ITERATIONS ?? 10),
  }, sessionId);
}
```

---

## 3. Agent 核心模块

### 3.1 ResearchAgent (agent/index.ts)

**职责**: 编排器，协调 LLM、Tools 和 Memory

```typescript
export class ResearchAgent {
  private engine: ReActEngine;
  private memory: Memory;

  constructor(config: AgentConfig, sessionId: string) {
    this.engine = new ReActEngine(config);
    this.memory = config.memory;
  }

  async execute(task: string, onProgress?: (step: ReActStep) => void): Promise<string> {
    // 1. 存储用户消息
    await this.memory.addMessage({
      role: 'user',
      content: task,
      timestamp: new Date().toISOString(),
    });

    // 2. 执行 ReAct 推理
    const result = await this.engine.run(task, onProgress);

    // 3. 存储助手响应
    await this.memory.addMessage({
      role: 'assistant',
      content: result,
      timestamp: new Date().toISOString(),
    });

    return result;
  }

  async getHistory(): Promise<Message[]> {
    return this.memory.getMessages();
  }

  async clearSession(): Promise<void> {
    await this.memory.clear();
  }
}
```

### 3.2 ReActEngine (agent/react-engine.ts)

**职责**: 核心推理引擎，实现 Thought-Action-Observation 循环

**核心算法**:

```typescript
export class ReActEngine {
  async run(task: string, onProgress?: (step: ReActStep) => void): Promise<string> {
    const steps: ReActStep[] = [];

    for (let i = 0; i < this.maxIterations; i++) {
      // 1. 构建 prompt
      const prompt = this.buildPrompt(task, steps);

      // 2. 调用 LLM
      const response = await this.config.llm.generate(prompt, {
        temperature: this.config.temperature ?? 0.7,
      });

      // 3. 解析响应
      const step = this.parseResponse(response);
      steps.push(step);

      // 4. 回调进度
      if (onProgress) {
        onProgress(step);
      }

      // 5. 如果是最终答案，返回
      if (step.finalAnswer) {
        return step.finalAnswer;
      }

      // 6. 执行工具调用
      if (step.action) {
        const observation = await this.executeAction(step.action);
        step.observation = observation;

        // 再次回调（含观察结果）
        if (onProgress) {
          onProgress(step);
        }
      }
    }

    return '抱歉，我无法在合理的步骤内完成这个任务。';
  }
}
```

**Prompt 构建**:

```typescript
private buildPrompt(task: string, previousSteps: ReActStep[]): string {
  const toolsDescription = this.tools.getDescription();

  const history = previousSteps.map((step, i) => {
    let text = `Step ${i + 1}:\nThought: ${step.thought}\n`;
    if (step.action) {
      text += `Action: ${step.action.tool}[${JSON.stringify(step.action.input)}]\n`;
    }
    if (step.observation !== undefined) {
      text += `Observation: ${JSON.stringify(step.observation)}\n`;
    }
    if (step.finalAnswer) {
      text += `Final Answer: ${step.finalAnswer}\n`;
    }
    return text;
  }).join('\n');

  return `你是一个智能研究助手。你可以使用以下工具来完成研究任务：

可用工具：
${toolsDescription}

【重要】你必须严格按照以下格式输出，每次只输出一步：

格式1 - 使用工具：
Thought: 分析当前情况，决定下一步
Action: 工具名[{"query": "搜索内容"}]

格式2 - 给出最终答案：
Thought: 我已经收集到足够信息
Final Answer: 你的最终答案

${history ? `已完成的步骤:\n${history}\n` : ''}
研究任务: ${task}

Thought:`;
}
```

**响应解析策略**:

```typescript
parseResponse(response: string): ReActStep {
  // 提取 Thought
  const thoughtMatch = response.match(/Thought:\s*(.+?)(?=Action:|Final Answer:|$)/s);
  const thought = thoughtMatch ? thoughtMatch[1].trim() : response.trim();

  // 检查 Final Answer
  const finalAnswerMatch = response.match(/Final Answer:\s*(.+)/s);
  if (finalAnswerMatch) {
    return { thought, finalAnswer: finalAnswerMatch[1].trim() };
  }

  // 尝试多种 Action 格式
  // 格式1: Action: toolName[{...}]
  let actionMatch = response.match(/Action:\s*(\w+)\[([\s\S]+?)\]/s);
  
  // 格式2: Action: toolName({...})
  if (!actionMatch) {
    actionMatch = response.match(/Action:\s*(\w+)\(([\s\S]+?)\)/s);
  }
  
  // 格式3: Action: toolName: {...}
  if (!actionMatch) {
    actionMatch = response.match(/Action:\s*(\w+):\s*([\s\S]+?)(?=Observation:|$)/s);
  }
  
  // 格式4: Action: toolName input
  if (!actionMatch) {
    actionMatch = response.match(/Action:\s*(\w+)\s+([\s\S]+?)(?=Observation:|$)/s);
  }

  // 中文格式: 行动：toolName[...]
  if (!actionMatch) {
    actionMatch = response.match(/行动[：:]\s*(\w+)[\s\[({]+([\s\S]+?)[\s\])}]/);
  }

  if (actionMatch) {
    const toolName = actionMatch[1].trim();
    let inputStr = actionMatch[2].trim();
    let toolInput;

    try {
      toolInput = JSON.parse(inputStr);
    } catch {
      // 兜底：提取 query 参数
      const queryMatch = inputStr.match(/["']?query["']?\s*[:=]\s*["']([^"']+)["']/i);
      toolInput = queryMatch ? { query: queryMatch[1] } : { query: inputStr };
    }

    return { thought, action: { tool: toolName, input: toolInput } };
  }

  throw new Error('Invalid response format: missing Action or Final Answer');
}
```

---

## 4. LLM 客户端 (llm/openai-client.ts)

**职责**: 封装 OpenAI SDK，支持多 LLM 切换

```typescript
import OpenAI from 'openai';
import { LLMClient, LLMOptions, ChatMessage } from '../agent/types';

export class OpenAIClient implements LLMClient {
  private client: OpenAI;
  private defaultModel: string;

  constructor(apiKey: string, model = 'gpt-4o-mini', baseURL?: string) {
    this.client = new OpenAI({ apiKey, baseURL });
    this.defaultModel = model;
  }

  async generate(prompt: string, options?: LLMOptions): Promise<string> {
    const completion = await this.client.chat.completions.create({
      model: options?.model || this.defaultModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2000,
    });

    return completion.choices[0]?.message?.content ?? '';
  }

  async chat(messages: ChatMessage[], options?: LLMOptions): Promise<string> {
    const completion = await this.client.chat.completions.create({
      model: options?.model || this.defaultModel,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2000,
    });

    return completion.choices[0]?.message?.content ?? '';
  }
}
```

**支持的 LLM**:

| LLM | baseURL | 模型名 |
|-----|---------|--------|
| OpenAI | https://api.openai.com/v1 | gpt-4o-mini, gpt-4o |
| DeepSeek | https://api.deepseek.com | deepseek-chat, deepseek-coder |
| 本地模型 | http://localhost:11434/v1 | 自定义 |
| 兼容 API | 自定义 | 自定义 |

---

## 5. 工具系统 (tools/)

### 5.1 工具注册中心 (tools/index.ts)

```typescript
export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  constructor(extraTools: Tool[] = []) {
    this.register(new SearchTool());
    this.register(new WikipediaTool());
    this.register(new CalculatorTool());
    this.register(new FileTool());
    extraTools.forEach((tool) => this.register(tool));
  }

  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  getDescription(): string {
    return this.getAll()
      .map((tool) => `- ${tool.name}: ${tool.description}`)
      .join('\n');
  }

  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }
}
```

### 5.2 工具接口定义

```typescript
export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      default?: any;
    }>;
    required: string[];
  };
  execute(input: unknown): Promise<unknown>;
}
```

### 5.3 具体工具实现

#### Wikipedia 工具

```typescript
export class WikipediaTool implements Tool {
  name = 'wikipedia';
  description = '查询维基百科获取详细的百科知识和背景信息';

  async execute(input: unknown): Promise<unknown> {
    const { query, language = 'zh' } = input as WikipediaInput;

    // 1. 搜索页面
    const searchResponse = await fetch(
      `https://${language}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`
    );
    const searchData = await searchResponse.json();

    // 2. 获取页面内容
    const pageTitle = searchData.query.search[0].title;
    const contentResponse = await fetch(
      `https://${language}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=extracts&exintro=true&explaintext=true&format=json&origin=*`
    );
    const contentData = await contentResponse.json();

    return {
      success: true,
      title: pageTitle,
      summary: page.extract?.substring(0, 1000),
      url: `https://${language}.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}`,
    };
  }
}
```

#### 搜索工具

```typescript
export class SearchTool implements Tool {
  name = 'web_search';
  description = '在互联网上搜索信息，获取最新的新闻、文章和数据';

  async execute(input: unknown): Promise<unknown> {
    const { query, num_results = 5 } = input as SearchInput;
    const apiKey = process.env.SERPER_API_KEY;

    if (!apiKey) {
      // 返回演示数据
      return {
        success: true,
        mock: true,
        results: [{ title: `${query} - 示例`, snippet: '配置 SERPER_API_KEY 后可获取真实结果' }],
      };
    }

    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, num: num_results }),
    });

    const data = await response.json();
    return {
      success: true,
      results: data.organic?.slice(0, num_results),
    };
  }
}
```

#### 计算器工具

```typescript
export class CalculatorTool implements Tool {
  name = 'calculator';
  description = '执行数学计算，支持基本运算和数学函数';

  async execute(input: unknown): Promise<unknown> {
    const { expression } = input as { expression: string };

    // 安全验证：只允许数学字符
    const sanitized = expression.replace(/[^0-9+\-*/().%\s]/g, '');
    if (sanitized !== expression) {
      throw new Error('表达式包含不允许的字符');
    }

    // 使用 Function 沙箱执行
    const result = new Function(`return (${sanitized})`)();
    return { success: true, expression, result };
  }
}
```

#### 文件工具

```typescript
export class FileTool implements Tool {
  name = 'file';
  description = '读写文件，文件存储在 data/ 目录下';

  async execute(input: unknown): Promise<unknown> {
    const { action, filename, content } = input as FileInput;
    const dataDir = path.resolve(process.cwd(), 'data');
    const filePath = path.resolve(dataDir, filename);

    // 安全检查：防止路径遍历
    if (!filePath.startsWith(dataDir)) {
      throw new Error('不允许访问 data/ 目录之外的文件');
    }

    switch (action) {
      case 'read':
        return { success: true, content: fs.readFileSync(filePath, 'utf-8') };
      case 'write':
        fs.writeFileSync(filePath, content);
        return { success: true, message: `文件 ${filename} 已写入` };
      case 'list':
        return { success: true, files: fs.readdirSync(dataDir) };
    }
  }
}
```

---

## 6. 记忆系统 (memory.ts)

### 6.1 SQLite 记忆

```typescript
export class SQLiteMemory implements Memory {
  private db: Database.Database;
  private sessionId: string;

  constructor(dbPath: string, sessionId: string) {
    this.db = new Database(dbPath);
    this.sessionId = sessionId;
    this.init();
  }

  private init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        metadata TEXT
      );
      
      CREATE TABLE IF NOT EXISTS knowledge (
        session_id TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        PRIMARY KEY (session_id, key)
      );
    `);
  }

  async addMessage(message: Message): Promise<void> {
    const stmt = this.db.prepare(
      'INSERT INTO messages (id, session_id, role, content, timestamp) VALUES (?, ?, ?, ?, ?)'
    );
    stmt.run(
      `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      this.sessionId,
      message.role,
      message.content,
      message.timestamp
    );
  }

  async getMessages(): Promise<Message[]> {
    const stmt = this.db.prepare(
      'SELECT role, content, timestamp FROM messages WHERE session_id = ? ORDER BY timestamp'
    );
    return stmt.all(this.sessionId) as Message[];
  }

  async clear(): Promise<void> {
    this.db.prepare('DELETE FROM messages WHERE session_id = ?').run(this.sessionId);
    this.db.prepare('DELETE FROM knowledge WHERE session_id = ?').run(this.sessionId);
  }
}
```

### 6.2 内存记忆 (测试用)

```typescript
export class InMemoryMemory implements Memory {
  private messages: Message[] = [];
  private knowledge = new Map<string, string>();

  async addMessage(message: Message): Promise<void> {
    this.messages.push(message);
  }

  async getMessages(): Promise<Message[]> {
    return [...this.messages];
  }

  async clear(): Promise<void> {
    this.messages = [];
    this.knowledge.clear();
  }
}
```

---

## 7. 类型定义 (agent/types.ts)

```typescript
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMClient {
  generate(prompt: string, options?: LLMOptions): Promise<string>;
  chat(messages: ChatMessage[], options?: LLMOptions): Promise<string>;
}

export interface ReActStep {
  thought: string;
  action?: {
    tool: string;
    input: unknown;
  };
  observation?: unknown;
  finalAnswer?: string;
}

export interface AgentConfig {
  llm: LLMClient;
  tools: Tool[];
  memory: Memory;
  maxIterations?: number;
  temperature?: number;
}

export interface Memory {
  addMessage(message: Message): Promise<void>;
  getMessages(): Promise<Message[]>;
  clear(): Promise<void>;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
```

---

## 8. 环境变量配置

```bash
# .env 配置
OPENAI_API_KEY=sk-xxx           # API Key
OPENAI_MODEL=deepseek-chat      # 模型名
OPENAI_BASE_URL=https://api.deepseek.com  # API 地址
SERPER_API_KEY=xxx              # 搜索 API Key (可选)
PORT=3000                       # 服务端口
NODE_ENV=development            # 环境
DATABASE_PATH=./data/agent.db   # 数据库路径
MAX_ITERATIONS=10               # 最大推理轮数
```

---

## 9. 测试策略

### 9.1 单元测试

```typescript
// react-engine.test.ts
describe('ReActEngine', () => {
  it('should parse action response correctly', async () => {
    const mockLLM: LLMClient = {
      generate: async () => `Thought: 我需要搜索
Action: web_search[{"query": "test"}]`,
      chat: async () => '',
    };

    const engine = new ReActEngine({
      llm: mockLLM,
      tools: [],
      memory: new InMemoryMemory(),
    });

    const result = await engine.run('test task');
    expect(result).toBeDefined();
  });
});
```

### 9.2 测试命令

```bash
# 运行所有测试
pnpm test

# 运行特定测试
pnpm test react-engine.test.ts

# 覆盖率报告
pnpm test --coverage
```

---

## 10. 性能优化

| 优化点 | 策略 | 效果 |
|--------|------|------|
| 数据库查询 | 使用 prepared statements | 减少解析开销 |
| 工具注册 | 单例模式，启动时初始化 | 避免重复创建 |
| LLM 调用 | 设置 max_tokens 限制 | 控制成本和延迟 |
| 文件操作 | 路径白名单验证 | 安全性保障 |
| 内存管理 | 会话 Map 定期清理 | 避免内存泄漏 |

---

## 11. 已知问题与改进方向

| 问题 | 影响 | 解决方案 |
|------|------|----------|
| 文本解析不稳定 | 不同 LLM 输出格式差异 | 使用 Function Calling |
| 无错误重试 | 网络波动导致失败 | 添加重试机制 |
| 会话内存占用 | 长时间运行内存增长 | 定期清理过期会话 |
| 工具无超时 | 工具执行卡死 | 添加超时机制 |
| 无并发限制 | 高并发性能差 | 添加队列和限流 |