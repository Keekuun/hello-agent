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
}

export interface LLMClient {
  generate(prompt: string, options?: LLMOptions): Promise<string>;
  chat(messages: ChatMessage[], options?: LLMOptions): Promise<string>;
}

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface MemorySystem {
  addMessage(message: Message): Promise<void>;
  getHistory(limit?: number): Promise<Message[]>;
  saveKnowledge(key: string, value: unknown): Promise<void>;
  getKnowledge(key: string): Promise<unknown>;
  clear(): Promise<void>;
}
