import { AgentConfig, Message, ReActStep } from './types';
import { ReActEngine } from './react-engine';
import { MemoryManager } from './memory-manager';
import { SQLiteMemory } from './memory';

export class ResearchAgent {
  private config: AgentConfig;
  private engine: ReActEngine;
  private sessionId: string;
  private memoryManager: MemoryManager;

  constructor(config: AgentConfig, sessionId: string) {
    this.config = config;
    this.sessionId = sessionId;
    this.engine = new ReActEngine(config);
    this.memoryManager = new MemoryManager(
      config.memory as SQLiteMemory,
      config.llm
    );
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

    const memoryContext = await this.memoryManager.buildMemoryContext(task);
    
    const result = await this.engine.run(task, onProgress, memoryContext);

    await this.config.memory.addMessage({
      id: this.generateId(),
      role: 'assistant',
      content: result,
      timestamp: new Date(),
    });

    this.memoryManager.extractAndSaveMemories(task, result).catch(err => {
      console.warn('Memory extraction failed:', err);
    });

    return result;
  }

  async getHistory(limit = 20): Promise<Message[]> {
    return this.config.memory.getHistory(limit);
  }

  async getRecentMessages(count = 10): Promise<Message[]> {
    const memory = this.config.memory as SQLiteMemory;
    return memory.getRecentMessages(count);
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