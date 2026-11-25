import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { KnowledgeBase } from '../../knowledge/knowledge-base';
import { KnowledgeSearchTool } from '../knowledge-search';

const tempDirs: string[] = [];

function createTempDbPath(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-tool-'));
  tempDirs.push(dir);
  return path.join(dir, 'test.db');
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('KnowledgeSearchTool', () => {
  it('returns matching document chunks', async () => {
    const dbPath = createTempDbPath();
    const knowledgeBase = new KnowledgeBase(dbPath);
    knowledgeBase.addDocument({
      title: '产品手册',
      filename: 'manual.md',
      content: '知识库问答支持上传 Markdown 文档，并在对话中自动检索相关片段。',
    });
    knowledgeBase.close();

    const tool = new KnowledgeSearchTool(dbPath);
    const result = (await tool.execute({ query: 'Markdown 知识库', top_k: 3 })) as {
      success: boolean;
      count: number;
      results: Array<{ document_title: string }>;
    };

    expect(result.success).toBe(true);
    expect(result.count).toBeGreaterThan(0);
    expect(result.results[0]?.document_title).toBe('产品手册');
  });

  it('rejects empty query', async () => {
    const tool = new KnowledgeSearchTool(createTempDbPath());
    const result = (await tool.execute({ query: '  ' })) as {
      success: boolean;
      error?: string;
    };
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/query/);
  });
});
