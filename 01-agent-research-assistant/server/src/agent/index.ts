import { AgentConfig, Message, ReActStep } from './types';
import { ReActEngine } from './react-engine';

export class ResearchAgent {
  private config: AgentConfig;
  private engine: ReActEngine;
  private sessionId: string;

  constructor(config: AgentConfig, sessionId: string) {
    this.config = config;
    this.sessionId = sessionId;
    this.engine = new ReActEngine(config);
  }

  async execute(
    task: string,
    onProgress?: (step: ReActStep) => void
  ): Promise<string> {
    console.log(`🎯 开始任务: ${task}`);

    await this.config.memory.addMessage({
      id: this.generateId(),
      role: 'user',
      content: task,
      timestamp: new Date(),
    });

    const result = await this.engine.run(task, onProgress);

    await this.config.memory.addMessage({
      id: this.generateId(),
      role: 'assistant',
      content: result,
      timestamp: new Date(),
    });

    return result;
  }

  async getHistory(limit = 20): Promise<Message[]> {
    return this.config.memory.getHistory(limit);
  }

  async clearSession(): Promise<void> {
    await this.config.memory.clear();
  }

  getSessionId(): string {
    return this.sessionId;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }
}
