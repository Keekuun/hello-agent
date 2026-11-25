import { describe, it, expect } from 'vitest';
import { OpenAIClient } from '../openai-client';

describe('OpenAIClient tool argument parsing', () => {
  it('parses valid JSON tool arguments via private helper contract', async () => {
    // 通过 chatWithTools 的内部路径验证：用最小 stub 拦截 SDK
    const client = new OpenAIClient('test-key', 'test-model');

    const create = async () => ({
      choices: [
        {
          message: {
            content: null,
            tool_calls: [
              {
                id: 'call_1',
                type: 'function',
                function: {
                  name: 'calculator',
                  arguments: '{"expression":"1+1"}',
                },
              },
            ],
          },
        },
      ],
    });

    (client as unknown as { client: { chat: { completions: { create: typeof create } } } }).client =
      {
        chat: {
          completions: {
            create,
          },
        },
      };

    const result = await client.chatWithTools(
      [{ role: 'user', content: '算一下' }],
      {
        tools: [
          {
            type: 'function',
            function: {
              name: 'calculator',
              description: 'math',
              parameters: {
                type: 'object',
                properties: {
                  expression: { type: 'string' },
                },
                required: ['expression'],
              },
            },
          },
        ],
      }
    );

    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls?.[0]).toEqual({
      id: 'call_1',
      name: 'calculator',
      arguments: { expression: '1+1' },
    });
  });

  it('keeps raw arguments when JSON is invalid', async () => {
    const client = new OpenAIClient('test-key', 'test-model');

    const create = async () => ({
      choices: [
        {
          message: {
            content: 'thinking',
            tool_calls: [
              {
                id: 'call_bad',
                type: 'function',
                function: {
                  name: 'wikipedia',
                  arguments: '{not-json',
                },
              },
            ],
          },
        },
      ],
    });

    (client as unknown as { client: { chat: { completions: { create: typeof create } } } }).client =
      {
        chat: {
          completions: {
            create,
          },
        },
      };

    const result = await client.chatWithTools([{ role: 'user', content: '查一下' }]);

    expect(result.content).toBe('thinking');
    expect(result.toolCalls?.[0].arguments).toEqual({ raw: '{not-json' });
  });
});
