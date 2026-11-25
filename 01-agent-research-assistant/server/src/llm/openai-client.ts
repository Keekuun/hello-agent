import OpenAI from 'openai';
import { LLMClient, LLMOptions, ChatMessage } from '../agent/types';
import { getRetryConfigFromEnv, withRetry } from '../utils/retry';

export class OpenAIClient implements LLMClient {
  private client: OpenAI;
  private defaultModel: string;
  private maxAttempts: number;
  private initialDelayMs: number;

  constructor(apiKey: string, model = 'gpt-4o-mini', baseURL?: string) {
    this.client = new OpenAI({ apiKey, baseURL });
    this.defaultModel = model;
    const retryConfig = getRetryConfigFromEnv();
    this.maxAttempts = retryConfig.maxAttempts;
    this.initialDelayMs = retryConfig.initialDelayMs;
  }

  async generate(prompt: string, options?: LLMOptions): Promise<string> {
    return withRetry(
      async (attempt) => {
        if (attempt > 1) {
          console.warn(`LLM generate 重试第 ${attempt} 次`);
        }
        const completion = await this.client.chat.completions.create({
          model: options?.model || this.defaultModel,
          messages: [{ role: 'user', content: prompt }],
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 2000,
        });

        return completion.choices[0]?.message?.content ?? '';
      },
      {
        maxAttempts: this.maxAttempts,
        initialDelayMs: this.initialDelayMs,
      }
    );
  }

  async chat(messages: ChatMessage[], options?: LLMOptions): Promise<string> {
    return withRetry(
      async (attempt) => {
        if (attempt > 1) {
          console.warn(`LLM chat 重试第 ${attempt} 次`);
        }
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
      },
      {
        maxAttempts: this.maxAttempts,
        initialDelayMs: this.initialDelayMs,
      }
    );
  }
}
