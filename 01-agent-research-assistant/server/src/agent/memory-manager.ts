import { SQLiteMemory } from './memory';
import { LLMClient } from './types';

interface MemoryExtract {
  content: string;
  keywords: string[];
  importance: number;
}

export class MemoryManager {
  private memory: SQLiteMemory;
  private llm: LLMClient;

  constructor(memory: SQLiteMemory, llm: LLMClient) {
    this.memory = memory;
    this.llm = llm;
  }

  async extractAndSaveMemories(userMessage: string, assistantResponse: string): Promise<void> {
    try {
      const extractPrompt = `从以下对话中提取关键信息，用于长期记忆。这些信息应该对未来的对话有用。

用户: ${userMessage}

助手: ${assistantResponse.substring(0, 1000)}

请以 JSON 数组格式返回提取的记忆，每个记忆包含:
- content: 信息内容（简洁明了）
- keywords: 关键词数组（用于检索）
- importance: 重要性（1-10，10最重要）

只返回 JSON，不要其他内容。示例:
[
  {"content": "用户是一名前端开发者", "keywords": ["前端", "开发者", "职业"], "importance": 8},
  {"content": "用户正在学习 React", "keywords": ["React", "学习", "前端"], "importance": 7}
]`;

      const response = await this.llm.generate(extractPrompt, {
        temperature: 0.3,
        maxTokens: 500,
      });

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const extracts: MemoryExtract[] = JSON.parse(jsonMatch[0]);
        
        for (const extract of extracts) {
          if (extract.content && extract.importance >= 5) {
            await this.memory.addMemory(
              extract.content,
              extract.keywords || [],
              extract.importance
            );
          }
        }
      }
    } catch (error) {
      console.warn('Failed to extract memories:', error);
    }
  }

  async getRelevantMemories(query: string): Promise<string[]> {
    const memories = await this.memory.searchMemories(query, 5);
    return memories.map(m => m.content);
  }

  async getRecentContext(): Promise<string[]> {
    const memories = await this.memory.getRecentMemories(5);
    return memories.map(m => m.content);
  }

  async buildMemoryContext(task: string): Promise<string> {
    const relevantMemories = await this.getRelevantMemories(task);
    const recentContext = await this.getRecentContext();
    
    const allMemories = [...new Set([...relevantMemories, ...recentContext])];
    
    if (allMemories.length === 0) {
      return '';
    }

    return `\n相关记忆（来自之前的对话）:\n${allMemories.map(m => `- ${m}`).join('\n')}\n`;
  }
}