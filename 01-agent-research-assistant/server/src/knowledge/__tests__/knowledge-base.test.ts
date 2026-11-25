import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  KnowledgeBase,
  splitIntoChunks,
  assertSupportedFilename,
} from '../knowledge-base';

const tempDirs: string[] = [];

function createTempDbPath(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-test-'));
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

describe('splitIntoChunks', () => {
  it('returns single chunk for short text', () => {
    expect(splitIntoChunks('短文本', 100, 20)).toEqual(['短文本']);
  });

  it('splits long text with overlap and keeps content continuity', () => {
    const text = Array.from({ length: 40 }, (_, index) => `段落${index}：这是一段用于切块测试的内容。`).join(
      '\n\n'
    );
    const chunks = splitIntoChunks(text, 120, 30);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.length > 0)).toBe(true);
    expect(chunks.join('')).toContain('段落0');
    expect(chunks.join('')).toContain('段落39');
  });
});

describe('assertSupportedFilename', () => {
  it('accepts supported extensions', () => {
    expect(() => assertSupportedFilename('notes.md')).not.toThrow();
    expect(() => assertSupportedFilename('data.JSON')).not.toThrow();
  });

  it('rejects unsupported extensions', () => {
    expect(() => assertSupportedFilename('secret.pdf')).toThrow(/不支持的文件类型/);
  });
});

describe('KnowledgeBase', () => {
  it('stores documents, searches by keywords, and builds context', () => {
    const dbPath = createTempDbPath();
    const knowledgeBase = new KnowledgeBase(dbPath);

    const document = knowledgeBase.addDocument({
      title: '前端组件规范',
      filename: 'frontend.md',
      content: [
        'React 组件应保持单一职责。',
        '推荐使用 TypeScript 编写 props 类型。',
        '样式优先使用 Tailwind CSS 工具类。',
      ].join('\n\n'),
    });

    expect(document.chunk_count).toBeGreaterThanOrEqual(1);
    expect(knowledgeBase.listDocuments()).toHaveLength(1);

    const hits = knowledgeBase.search('React 组件 TypeScript');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.documentTitle).toBe('前端组件规范');
    expect(hits[0]?.content).toMatch(/React|TypeScript|组件/);

    const context = knowledgeBase.buildKnowledgeContext('React 组件');
    expect(context).toContain('相关知识库片段');
    expect(context).toContain('前端组件规范');

    knowledgeBase.close();
  });

  it('deletes a document and its chunks', () => {
    const dbPath = createTempDbPath();
    const knowledgeBase = new KnowledgeBase(dbPath);

    const document = knowledgeBase.addDocument({
      title: '临时文档',
      filename: 'tmp.txt',
      content: '这是一段关于知识库删除测试的内容，包含关键词检索。',
    });

    expect(knowledgeBase.deleteDocument(document.id)).toBe(true);
    expect(knowledgeBase.listDocuments()).toHaveLength(0);
    expect(knowledgeBase.search('知识库删除')).toHaveLength(0);

    knowledgeBase.close();
  });

  it('rejects empty content', () => {
    const dbPath = createTempDbPath();
    const knowledgeBase = new KnowledgeBase(dbPath);

    expect(() =>
      knowledgeBase.addDocument({
        title: '空',
        filename: 'empty.txt',
        content: '   ',
      })
    ).toThrow(/不能为空/);

    knowledgeBase.close();
  });
});
