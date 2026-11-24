import { SQLiteMemory } from './memory';
import { LLMClient } from './types';

interface MemoryExtract {
  content: string;
  keywords: string[];
  importance: number;
}

const MIN_IMPORTANCE_TO_SAVE = 5;
const MAX_MEMORIES_IN_CONTEXT = 5;
const MIN_RESPONSE_LENGTH_FOR_EXTRACT = 40;
const TRIVIAL_TASK_PATTERN = /^(你好|您好|hi|hello|hey|测试|test|ping)[!！.。\s]*$/i;

export class MemoryManager {
  private memory: SQLiteMemory;
  private llm: LLMClient;

  constructor(memory: SQLiteMemory, llm: LLMClient) {
    this.memory = memory;
    this.llm = llm;
  }

  async extractAndSaveMemories(userMessage: string, assistantResponse: string): Promise<void> {
    if (TRIVIAL_TASK_PATTERN.test(userMessage.trim())) {
      return;
    }

    if (assistantResponse.trim().length < MIN_RESPONSE_LENGTH_FOR_EXTRACT) {
      return;
    }

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
]

若没有值得长期保存的信息，返回空数组 []。`;

      const response = await this.llm.generate(extractPrompt, {
        temperature: 0.3,
        maxTokens: 500,
      });

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return;
      }

      const extracts: MemoryExtract[] = JSON.parse(jsonMatch[0]);

      for (const extract of extracts) {
        if (extract.content && extract.importance >= MIN_IMPORTANCE_TO_SAVE) {
          await this.memory.addMemory(
            extract.content,
            extract.keywords || [],
            extract.importance
          );
        }
      }
    } catch (error) {
      console.warn('Failed to extract memories:', error);
    }
  }

  async getRelevantMemories(query: string): Promise<string[]> {
    const memories = await this.memory.searchMemories(query, MAX_MEMORIES_IN_CONTEXT);
    return memories.map((memory) => memory.content);
  }

  /**
   * 仅注入与当前任务相关的记忆，避免把无关的近期记忆塞进新会话。
   */
  async buildMemoryContext(task: string): Promise<string> {
    const relevantMemories = await this.getRelevantMemories(task);

    if (relevantMemories.length === 0) {
      return '';
    }

    return `\n相关记忆（来自之前的对话）:\n${relevantMemories.map((memory) => `- ${memory}`).join('\n')}\n`;
  }
}
