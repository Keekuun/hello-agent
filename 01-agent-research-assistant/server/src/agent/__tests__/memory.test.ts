import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { extractSearchTerms, SQLiteMemory } from '../memory';
import { MemoryManager } from '../memory-manager';
import type { LLMClient } from '../types';

describe('extractSearchTerms', () => {
  it('extracts chinese and english tokens', () => {
    const terms = extractSearchTerms('请帮我写一段前端组件代码，使用 React');
    expect(terms).toContain('前端');
    expect(terms).toContain('React');
  });

  it('returns empty for blank query', () => {
    expect(extractSearchTerms('   ')).toEqual([]);
  });
});

describe('SQLiteMemory long-term memories', () => {
  let dbPath: string;
  let memoryA: SQLiteMemory;
  let memoryB: SQLiteMemory;

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `agent-memory-test-${Date.now()}-${Math.random()}.db`);
    memoryA = new SQLiteMemory(dbPath, 'session-a');
    memoryB = new SQLiteMemory(dbPath, 'session-b');
  });

  afterEach(() => {
    memoryA.close();
    memoryB.close();
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  });

  it('stores memories and searches across sessions', async () => {
    await memoryA.addMemory('用户是一名前端开发者', ['前端', '开发者'], 8);
    await memoryB.addMemory('用户正在学习 TypeScript', ['TypeScript', '学习'], 7);

    const hits = await memoryB.searchMemories('前端开发 React');
    expect(hits.some((row) => row.content.includes('前端开发者'))).toBe(true);

    const list = await memoryA.listMemories();
    expect(list.length).toBe(2);
  });

  it('deduplicates identical memory content', async () => {
    await memoryA.addMemory('用户偏好简洁回答', ['偏好'], 6);
    await memoryA.addMemory('用户偏好简洁回答', ['偏好', '简洁'], 9);

    const list = await memoryA.listMemories();
    expect(list).toHaveLength(1);
    expect(list[0].importance).toBe(9);
  });

  it('deletes a memory by id', async () => {
    await memoryA.addMemory('可删除的记忆', ['测试'], 5);
    const [row] = await memoryA.listMemories();
    expect(await memoryA.deleteMemory(row.id)).toBe(true);
    expect(await memoryA.listMemories()).toHaveLength(0);
  });
});

describe('MemoryManager', () => {
  let dbPath: string;
  let memory: SQLiteMemory;

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `agent-memory-mgr-${Date.now()}-${Math.random()}.db`);
    memory = new SQLiteMemory(dbPath, 'session-mgr');
  });

  afterEach(() => {
    memory.close();
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  });

  it('buildMemoryContext only injects relevant memories', async () => {
    await memory.addMemory('用户是一名前端开发者', ['前端', '开发者'], 8);
    await memory.addMemory('用户喜欢喝美式咖啡', ['咖啡', '美式'], 6);

    const llm: LLMClient = {
      generate: async () => '[]',
      chat: async () => '',
    };
    const manager = new MemoryManager(memory, llm);
    const context = await manager.buildMemoryContext('请帮我写一段前端组件代码');

    expect(context).toContain('前端开发者');
    expect(context).not.toContain('美式咖啡');
  });

  it('skips trivial greetings when extracting memories', async () => {
    let called = false;
    const llm: LLMClient = {
      generate: async () => {
        called = true;
        return '[{"content":"should not save","keywords":["x"],"importance":9}]';
      },
      chat: async () => '',
    };
    const manager = new MemoryManager(memory, llm);
    await manager.extractAndSaveMemories('你好', '你好！有什么可以帮你的吗？这是一段足够长的回复内容用来测试。'.repeat(2));
    expect(called).toBe(false);
    expect(await memory.listMemories()).toHaveLength(0);
  });

  it('extracts and saves high-importance memories', async () => {
    const llm: LLMClient = {
      generate: async () =>
        JSON.stringify([
          { content: '用户正在准备前端面试', keywords: ['面试', '前端'], importance: 8 },
          { content: '无关闲聊', keywords: ['闲聊'], importance: 2 },
        ]),
      chat: async () => '',
    };
    const manager = new MemoryManager(memory, llm);
    await manager.extractAndSaveMemories(
      '我下周要去面试前端岗位',
      '好的，我可以帮你准备常见前端面试题，包括 React、TypeScript 和系统设计相关内容。'
    );

    const list = await memory.listMemories();
    expect(list).toHaveLength(1);
    expect(list[0].content).toContain('前端面试');
  });
});
