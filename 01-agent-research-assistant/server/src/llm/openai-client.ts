import OpenAI from 'openai';
import {
  LLMClient,
  LLMOptions,
  ChatMessage,
  LLMChatResult,
  ToolCallRequest,
} from '../agent/types';

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
    const result = await this.chatWithTools(messages, {
      ...options,
      tools: undefined,
      toolChoice: 'none',
    });
    return result.content ?? '';
  }

  async chatWithTools(messages: ChatMessage[], options?: LLMOptions): Promise<LLMChatResult> {
    const tools =
      options?.tools && options.tools.length > 0
        ? (options.tools as unknown as OpenAI.Chat.Completions.ChatCompletionTool[])
        : undefined;

    const completion = await this.client.chat.completions.create({
      model: options?.model || this.defaultModel,
      messages: messages.map((message) => this.toApiMessage(message)),
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2000,
      ...(tools
        ? {
            tools,
            tool_choice: options?.toolChoice ?? 'auto',
          }
        : {}),
    });

    const message = completion.choices[0]?.message;
    if (!message) {
      return { content: null };
    }

    const toolCalls = this.parseToolCalls(message.tool_calls);
    return {
      content: message.content ?? null,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  }

  private toApiMessage(
    message: ChatMessage
  ): OpenAI.Chat.Completions.ChatCompletionMessageParam {
    if (message.role === 'tool') {
      return {
        role: 'tool',
        tool_call_id: message.tool_call_id ?? '',
        content: message.content ?? '',
      };
    }

    if (message.role === 'assistant' && message.tool_calls && message.tool_calls.length > 0) {
      return {
        role: 'assistant',
        content: message.content,
        tool_calls: message.tool_calls.map((toolCall) => ({
          id: toolCall.id,
          type: 'function' as const,
          function: {
            name: toolCall.name,
            arguments: JSON.stringify(toolCall.arguments ?? {}),
          },
        })),
      };
    }

    return {
      role: message.role,
      content: message.content ?? '',
    };
  }

  private parseToolCalls(
    toolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[] | undefined
  ): ToolCallRequest[] {
    if (!toolCalls || toolCalls.length === 0) {
      return [];
    }

    return toolCalls
      .filter((toolCall) => toolCall.type === 'function')
      .map((toolCall) => {
        const functionCall = toolCall.function;
        let parsedArguments: Record<string, unknown> = {};

        try {
          const raw = functionCall.arguments?.trim() || '{}';
          const value = JSON.parse(raw) as unknown;
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            parsedArguments = value as Record<string, unknown>;
          } else {
            parsedArguments = { value };
          }
        } catch {
          parsedArguments = { raw: functionCall.arguments ?? '' };
        }

        return {
          id: toolCall.id,
          name: functionCall.name,
          arguments: parsedArguments,
        };
      });
  }
}
