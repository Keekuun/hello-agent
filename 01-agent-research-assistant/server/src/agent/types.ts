export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface ReActStep {
  thought: string;
  action?: {
    tool: string;
    input: unknown;
    toolCallId?: string;
  };
  observation?: unknown;
  finalAnswer?: string;
}

export interface Tool {
  name: string;
  description: string;
  parameters: ToolParameterSchema;
  execute: (input: unknown) => Promise<unknown>;
}

export interface ToolParameterSchema {
  type: 'object';
  properties: Record<
    string,
    {
      type: string;
      description?: string;
      enum?: string[];
      default?: number | string;
    }
  >;
  required?: string[];
}

export interface AgentConfig {
  llm: LLMClient;
  tools: Tool[];
  memory: MemorySystem;
  maxIterations?: number;
  temperature?: number;
  /** 默认 true：优先使用 LLM 原生 Function Calling */
  useFunctionCalling?: boolean;
}

export interface ToolCallRequest {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface LLMToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: ToolParameterSchema;
  };
}

export interface LLMChatResult {
  content: string | null;
  toolCalls?: ToolCallRequest[];
}

export interface LLMClient {
  generate(prompt: string, options?: LLMOptions): Promise<string>;
  chat(messages: ChatMessage[], options?: LLMOptions): Promise<string>;
  /** 可选：原生 Function Calling；未实现时 ReAct 回退到文本解析 */
  chatWithTools?(messages: ChatMessage[], options?: LLMOptions): Promise<LLMChatResult>;
}

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
  tools?: LLMToolDefinition[];
  toolChoice?: 'auto' | 'none' | 'required';
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ToolCallRequest[];
  tool_call_id?: string;
  name?: string;
}

export interface MemorySystem {
  addMessage(message: Message): Promise<void>;
  getHistory(limit?: number): Promise<Message[]>;
  saveKnowledge(key: string, value: unknown): Promise<void>;
  getKnowledge(key: string): Promise<unknown>;
  clear(): Promise<void>;
}
