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

    // 暂时禁用跨会话记忆，避免新会话有历史记忆
    // const memoryContext = await this.memoryManager.buildMemoryContext(task);
    const memoryContext = '';
    const conversationContext = await this.buildConversationContext();
    
    const result = await this.engine.run(task, onProgress, memoryContext, conversationContext);

    await this.config.memory.addMessage({
      id: this.generateId(),
      role: 'assistant',
      content: result,
      timestamp: new Date(),
    });

    // 暂时禁用记忆提取
    // this.memoryManager.extractAndSaveMemories(task, result).catch(err => {
    //   console.warn('Memory extraction failed:', err);
    // });

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

  private async buildConversationContext(): Promise<string> {
    const history = await this.config.memory.getHistory(12);
    if (history.length <= 1) return '';

    const priorMessages = history.slice(0, -1);
    return priorMessages
      .map((message) => {
        const roleLabel = message.role === 'user' ? '用户' : '助手';
        const content =
          message.content.length > 1200
            ? `${message.content.slice(0, 1200)}...`
            : message.content;
        return `${roleLabel}: ${content}`;
      })
      .join('\n\n');
  }
}