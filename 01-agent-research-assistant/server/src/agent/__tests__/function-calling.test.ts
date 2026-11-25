import { describe, it, expect } from 'vitest';
import { ReActEngine } from '../react-engine';
import {
  ChatMessage,
  LLMChatResult,
  LLMClient,
  LLMOptions,
} from '../types';
import { InMemoryMemory } from '../in-memory-memory';
import { ToolRegistry } from '../../tools';

class FunctionCallingMockLLM implements LLMClient {
  private results: LLMChatResult[];
  private index = 0;
  public lastMessages: ChatMessage[] = [];
  public lastOptions: LLMOptions | undefined;

  constructor(results: LLMChatResult[]) {
    this.results = results;
  }

  async generate(): Promise<string> {
    throw new Error('generate should not be called when chatWithTools is available');
  }

  async chat(): Promise<string> {
    return '';
  }

  async chatWithTools(messages: ChatMessage[], options?: LLMOptions): Promise<LLMChatResult> {
    this.lastMessages = messages;
    this.lastOptions = options;
    const result = this.results[this.index] ?? this.results.at(-1)!;
    this.index += 1;
    return result;
  }
}

class FallingBackMockLLM implements LLMClient {
  async generate(): Promise<string> {
    return `Thought: 直接回答
Final Answer: 回退文本解析成功`;
  }

  async chat(): Promise<string> {
    return this.generate();
  }

  async chatWithTools(): Promise<LLMChatResult> {
    throw new Error('simulated tool API failure');
  }
}

describe('ReActEngine Function Calling', () => {
  it('uses native tool calls then returns final answer', async () => {
    const llm = new FunctionCallingMockLLM([
      {
        content: '需要计算表达式',
        toolCalls: [
          {
            id: 'call_calc_1',
            name: 'calculator',
            arguments: { expression: '2+2' },
          },
        ],
      },
      {
        content: '2+2 等于 4',
      },
    ]);

    const engine = new ReActEngine({
      llm,
      tools: [],
      memory: new InMemoryMemory(),
      maxIterations: 5,
    });

    const result = await engine.run('计算 2 + 2');

    expect(result).toContain('4');
    expect(llm.lastOptions?.tools?.some((tool) => tool.function.name === 'calculator')).toBe(
      true
    );
    expect(llm.lastMessages.some((message) => message.role === 'tool')).toBe(true);
  });

  it('stepFromToolResult maps tool call to action', () => {
    const engine = new ReActEngine({
      llm: new FunctionCallingMockLLM([]),
      tools: [],
      memory: new InMemoryMemory(),
    });

    const step = engine.stepFromToolResult({
      content: '查百科',
      toolCalls: [
        {
          id: 'call_wiki_1',
          name: 'wikipedia',
          arguments: { query: 'ReAct' },
        },
      ],
    });

    expect(step.action?.tool).toBe('wikipedia');
    expect(step.action?.input).toEqual({ query: 'ReAct' });
    expect(step.action?.toolCallId).toBe('call_wiki_1');
    expect(step.thought).toBe('查百科');
  });

  it('falls back to text parsing when chatWithTools throws', async () => {
    const engine = new ReActEngine({
      llm: new FallingBackMockLLM(),
      tools: [],
      memory: new InMemoryMemory(),
      maxIterations: 3,
    });

    const result = await engine.run('随便问一句');
    expect(result).toContain('回退文本解析成功');
  });

  it('can disable function calling via config', async () => {
    const llm = new FunctionCallingMockLLM([
      {
        content: '不应走到这里',
      },
    ]);

    // generate is required when FC disabled — wrap a text-only llm
    const textOnly: LLMClient = {
      generate: async () =>
        `Thought: ok\nFinal Answer: 已关闭 Function Calling`,
      chat: async () => '',
      chatWithTools: llm.chatWithTools.bind(llm),
    };

    const engine = new ReActEngine({
      llm: textOnly,
      tools: [],
      memory: new InMemoryMemory(),
      useFunctionCalling: false,
      maxIterations: 2,
    });

    const result = await engine.run('测试关闭');
    expect(result).toContain('已关闭 Function Calling');
    expect(llm.lastMessages).toHaveLength(0);
  });
});

describe('ToolRegistry.toOpenAITools', () => {
  it('exports OpenAI-compatible tool definitions', () => {
    const registry = new ToolRegistry();
    const tools = registry.toOpenAITools();

    expect(tools.length).toBeGreaterThanOrEqual(4);
    expect(tools.every((tool) => tool.type === 'function')).toBe(true);
    expect(tools.some((tool) => tool.function.name === 'web_search')).toBe(true);
    expect(tools.find((tool) => tool.function.name === 'calculator')?.function.parameters).toEqual(
      expect.objectContaining({
        type: 'object',
        required: ['expression'],
      })
    );
  });
});
