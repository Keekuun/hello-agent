import { MemorySystem, Message } from './types';

/** 无 SQLite 依赖，用于单元测试与本地快速验证 */
export class InMemoryMemory implements MemorySystem {
  private messages: Message[] = [];
  private knowledge = new Map<string, unknown>();

  async addMessage(message: Message): Promise<void> {
    this.messages.push(message);
  }

  async getHistory(limit = 20): Promise<Message[]> {
    return this.messages.slice(-limit);
  }

  async saveKnowledge(key: string, value: unknown): Promise<void> {
    this.knowledge.set(key, value);
  }

  async getKnowledge(key: string): Promise<unknown> {
    return this.knowledge.get(key) ?? null;
  }

  async clear(): Promise<void> {
    this.messages = [];
    this.knowledge.clear();
  }
}
