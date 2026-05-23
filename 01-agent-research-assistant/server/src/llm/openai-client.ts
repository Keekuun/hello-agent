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
