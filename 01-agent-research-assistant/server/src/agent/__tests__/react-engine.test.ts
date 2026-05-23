import { describe, it, expect } from 'vitest';
import { ReActEngine } from '../react-engine';
import { LLMClient } from '../types';
import { InMemoryMemory } from '../in-memory-memory';

class MockLLM implements LLMClient {
  private responses: string[];
  private index = 0;

  constructor(responses: string[]) {
    this.responses = responses;
  }

  async generate(): Promise<string> {
    const response = this.responses[this.index] ?? this.responses.at(-1)!;
    this.index += 1;
    return response;
  }

  async chat(): Promise<string> {
    return this.generate();
  }
}

describe('ReActEngine', () => {
  it('parses calculator action and returns final answer', async () => {
    const llm = new MockLLM([
      `Thought: 需要计算表达式
Action: calculator[{"expression":"2+2"}]`,
      `Thought: 已得到结果
Final Answer: 2+2 等于 4`,
    ]);

    const memory = new InMemoryMemory();
    const engine = new ReActEngine({
      llm,
      tools: [],
      memory,
      maxIterations: 5,
    });

    const result = await engine.run('计算 2 + 2');

    expect(result).toContain('4');
  });

  it('parseResponse extracts action', () => {
    const engine = new ReActEngine({
      llm: new MockLLM([]),
      tools: [],
      memory: new InMemoryMemory(),
    });

    const step = engine.parseResponse(
      'Thought: test\nAction: wikipedia[{"query":"AI"}]'
    );

    expect(step.action?.tool).toBe('wikipedia');
    expect(step.action?.input).toEqual({ query: 'AI' });
  });
});
