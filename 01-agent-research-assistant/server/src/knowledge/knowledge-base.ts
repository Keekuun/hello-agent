import Database from 'better-sqlite3';
import { initializeDatabaseSchema } from '../db/schema';
import { extractSearchTerms } from '../agent/memory';

export interface DocumentRecord {
  id: string;
  title: string;
  filename: string;
  mime_type: string;
  content_length: number;
  chunk_count: number;
  created_at: string;
}

export interface DocumentChunkRecord {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  keywords: string;
  created_at: string;
  score?: number;
  document_title?: string;
}

export interface AddDocumentInput {
  title: string;
  content: string;
  filename?: string;
  mimeType?: string;
}

export interface SearchChunkResult {
  documentId: string;
  documentTitle: string;
  chunkIndex: number;
  content: string;
  score: number;
}

const DEFAULT_CHUNK_SIZE = 800;
const DEFAULT_CHUNK_OVERLAP = 120;
const MAX_DOCUMENT_CHARS = 200_000;
const MAX_CHUNKS_IN_CONTEXT = 5;
const MAX_CHUNK_PREVIEW_CHARS = 600;
const MAX_KEYWORDS_PER_CHUNK = 24;

const ALLOWED_EXTENSIONS = new Set(['.txt', '.md', '.markdown', '.json', '.csv']);

export function assertSupportedFilename(filename: string): void {
  const lower = filename.toLowerCase();
  const dotIndex = lower.lastIndexOf('.');
  const extension = dotIndex >= 0 ? lower.slice(dotIndex) : '';
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new Error(`不支持的文件类型: ${extension || '(无扩展名)'}，请上传 txt/md/json/csv`);
  }
}

/** 按字符切块，保留重叠，尽量在段落/句子边界断开 */
export function splitIntoChunks(
  text: string,
  chunkSize = DEFAULT_CHUNK_SIZE,
  overlap = DEFAULT_CHUNK_OVERLAP
): string[] {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  if (normalized.length <= chunkSize) {
    return [normalized];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    let end = Math.min(normalized.length, start + chunkSize);

    if (end < normalized.length) {
      const window = normalized.slice(start, end);
      const breakCandidates = [
        window.lastIndexOf('\n\n'),
        window.lastIndexOf('\n'),
        window.lastIndexOf('。'),
        window.lastIndexOf('！'),
        window.lastIndexOf('？'),
        window.lastIndexOf('. '),
        window.lastIndexOf('; '),
        window.lastIndexOf('；'),
      ].filter((index) => index >= Math.floor(chunkSize * 0.4));

      if (breakCandidates.length > 0) {
        end = start + Math.max(...breakCandidates) + 1;
      }
    }

    const chunk = normalized.slice(start, end).trim();
    if (chunk) {
      chunks.push(chunk);
    }

    if (end >= normalized.length) {
      break;
    }

    start = Math.max(0, end - overlap);
  }

  return chunks;
}

export function buildChunkKeywords(content: string): string[] {
  return extractSearchTerms(content).slice(0, MAX_KEYWORDS_PER_CHUNK);
}

export class KnowledgeBase {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    initializeDatabaseSchema(this.db);
  }

  close(): void {
    this.db.close();
  }

  addDocument(input: AddDocumentInput): DocumentRecord {
    const content = input.content?.trim() ?? '';
    if (!content) {
      throw new Error('文档内容不能为空');
    }
    if (content.length > MAX_DOCUMENT_CHARS) {
      throw new Error(`文档过长（最多 ${MAX_DOCUMENT_CHARS} 字符）`);
    }

    const title = (input.title || input.filename || '未命名文档').trim().slice(0, 120);
    const filename = (input.filename || `${title}.txt`).trim().slice(0, 200);
    assertSupportedFilename(filename);

    const chunks = splitIntoChunks(content);
    if (chunks.length === 0) {
      throw new Error('文档切块失败，请检查内容');
    }

    const documentId = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const mimeType = input.mimeType || guessMimeType(filename);

    const insertDocument = this.db.prepare(`
      INSERT INTO documents (id, title, filename, mime_type, content_length, chunk_count)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertChunk = this.db.prepare(`
      INSERT INTO document_chunks (id, document_id, chunk_index, content, keywords)
      VALUES (?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction(() => {
      insertDocument.run(
        documentId,
        title,
        filename,
        mimeType,
        content.length,
        chunks.length
      );

      chunks.forEach((chunk, index) => {
        const keywords = buildChunkKeywords(chunk).join(',');
        insertChunk.run(
          `${documentId}-c${index}`,
          documentId,
          index,
          chunk,
          keywords
        );
      });
    });

    transaction();

    return this.getDocument(documentId)!;
  }

  listDocuments(limit = 50): DocumentRecord[] {
    return this.db
      .prepare(
        `
        SELECT id, title, filename, mime_type, content_length, chunk_count, created_at
        FROM documents
        ORDER BY created_at DESC
        LIMIT ?
      `
      )
      .all(limit) as DocumentRecord[];
  }

  getDocument(documentId: string): DocumentRecord | undefined {
    return this.db
      .prepare(
        `
        SELECT id, title, filename, mime_type, content_length, chunk_count, created_at
        FROM documents
        WHERE id = ?
      `
      )
      .get(documentId) as DocumentRecord | undefined;
  }

  deleteDocument(documentId: string): boolean {
    const transaction = this.db.transaction(() => {
      this.db.prepare('DELETE FROM document_chunks WHERE document_id = ?').run(documentId);
      const result = this.db.prepare('DELETE FROM documents WHERE id = ?').run(documentId);
      return result.changes > 0;
    });
    return transaction();
  }

  clearAll(): void {
    const transaction = this.db.transaction(() => {
      this.db.prepare('DELETE FROM document_chunks').run();
      this.db.prepare('DELETE FROM documents').run();
    });
    transaction();
  }

  search(query: string, limit = MAX_CHUNKS_IN_CONTEXT): SearchChunkResult[] {
    const terms = extractSearchTerms(query);
    if (terms.length === 0) {
      return [];
    }

    const rows = this.db
      .prepare(
        `
        SELECT
          c.id,
          c.document_id,
          c.chunk_index,
          c.content,
          c.keywords,
          d.title as document_title
        FROM document_chunks c
        JOIN documents d ON d.id = c.document_id
      `
      )
      .all() as Array<DocumentChunkRecord & { document_title: string }>;

    if (rows.length === 0) {
      return [];
    }

    const lowerTerms = terms.map((term) => term.toLowerCase());

    const scored = rows
      .map((row) => {
        const haystack = `${row.document_title}\n${row.keywords}\n${row.content}`.toLowerCase();
        let score = 0;
        for (const term of lowerTerms) {
          if (!haystack.includes(term)) continue;
          // 标题/关键词命中权重更高
          if (row.document_title.toLowerCase().includes(term)) score += 3;
          if ((row.keywords || '').toLowerCase().includes(term)) score += 2;
          if (row.content.toLowerCase().includes(term)) score += 1;
        }
        return { row, score };
      })
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score || left.row.chunk_index - right.row.chunk_index)
      .slice(0, limit);

    return scored.map(({ row, score }) => ({
      documentId: row.document_id,
      documentTitle: row.document_title || '未命名文档',
      chunkIndex: row.chunk_index,
      content: row.content,
      score,
    }));
  }

  buildKnowledgeContext(query: string, limit = MAX_CHUNKS_IN_CONTEXT): string {
    const hits = this.search(query, limit);
    if (hits.length === 0) {
      return '';
    }

    const lines = hits.map((hit, index) => {
      const preview =
        hit.content.length > MAX_CHUNK_PREVIEW_CHARS
          ? `${hit.content.slice(0, MAX_CHUNK_PREVIEW_CHARS)}...`
          : hit.content;
      return `${index + 1}. 《${hit.documentTitle}》#${hit.chunkIndex}\n${preview}`;
    });

    return `\n相关知识库片段（请优先依据这些内容回答；不足时可调用 knowledge_search）:\n${lines.join('\n\n')}\n`;
  }
}

function guessMimeType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.md') || lower.endsWith('.markdown')) return 'text/markdown';
  if (lower.endsWith('.json')) return 'application/json';
  if (lower.endsWith('.csv')) return 'text/csv';
  return 'text/plain';
}

export const KnowledgeBaseLimits = {
  DEFAULT_CHUNK_SIZE,
  DEFAULT_CHUNK_OVERLAP,
  MAX_DOCUMENT_CHARS,
  MAX_CHUNKS_IN_CONTEXT,
  ALLOWED_EXTENSIONS,
} as const;
