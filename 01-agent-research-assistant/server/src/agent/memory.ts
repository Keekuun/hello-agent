import Database from 'better-sqlite3';
import { MemorySystem, Message } from './types';
import { initializeDatabaseSchema } from '../db/schema';

interface MessageRow {
  id: string;
  session_id: string;
  role: string;
  content: string;
  timestamp: string;
  metadata: string | null;
}

export interface MemoryRow {
  id: string;
  session_id: string;
  content: string;
  keywords: string;
  importance: number;
  created_at: string;
}

const MIN_SEARCH_TERM_LENGTH = 2;
const MAX_SEARCH_TERMS = 24;

/** 从查询中提取可用于 LIKE 匹配的词（支持中文连续文本） */
export function extractSearchTerms(query: string): string[] {
  const normalized = query.trim();
  if (!normalized) return [];

  const terms = new Set<string>();

  for (const part of normalized.split(/[\s,，。！？、；;:：]+/).filter(Boolean)) {
    if (part.length >= MIN_SEARCH_TERM_LENGTH) {
      terms.add(part);
    }
  }

  const englishTokens = normalized.match(/[a-zA-Z0-9_]{2,}/g) ?? [];
  for (const token of englishTokens) {
    terms.add(token);
  }

  // 中文连续文本拆成 2/3 字片，提升「前端组件」一类查询的召回
  const chineseSequences = normalized.match(/[\u4e00-\u9fff]+/g) ?? [];
  for (const sequence of chineseSequences) {
    if (sequence.length >= MIN_SEARCH_TERM_LENGTH && sequence.length <= 8) {
      terms.add(sequence);
    }
    for (let index = 0; index < sequence.length - 1; index += 1) {
      terms.add(sequence.slice(index, index + 2));
      if (index + 3 <= sequence.length) {
        terms.add(sequence.slice(index, index + 3));
      }
    }
  }

  // 英文词优先保留，其次短中文片，避免长句挤掉有效关键词
  return Array.from(terms)
    .sort((left, right) => {
      const leftIsAscii = /^[a-zA-Z0-9_]+$/.test(left);
      const rightIsAscii = /^[a-zA-Z0-9_]+$/.test(right);
      if (leftIsAscii !== rightIsAscii) {
        return leftIsAscii ? -1 : 1;
      }
      return left.length - right.length || left.localeCompare(right);
    })
    .slice(0, MAX_SEARCH_TERMS);
}

export class SQLiteMemory implements MemorySystem {
  private db: Database.Database;
  private sessionId: string;

  constructor(dbPath: string, sessionId: string) {
    this.sessionId = sessionId;
    this.db = new Database(dbPath);
    initializeDatabaseSchema(this.db);
  }

  async addMessage(message: Message): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO messages (id, session_id, role, content, timestamp, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      message.id,
      this.sessionId,
      message.role,
      message.content,
      message.timestamp.toISOString(),
      message.metadata ? JSON.stringify(message.metadata) : null
    );
  }

  async getHistory(limit = 20): Promise<Message[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM messages
      WHERE session_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    const rows = stmt.all(this.sessionId, limit) as MessageRow[];

    return rows.reverse().map((row) => ({
      id: row.id,
      role: row.role as Message['role'],
      content: row.content,
      timestamp: new Date(row.timestamp),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }));
  }

  async getRecentMessages(count = 10): Promise<Message[]> {
    return this.getHistory(count);
  }

  async getAllSessionMessages(): Promise<Message[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM messages
      WHERE session_id = ?
      ORDER BY timestamp ASC
    `);

    const rows = stmt.all(this.sessionId) as MessageRow[];

    return rows.map((row) => ({
      id: row.id,
      role: row.role as Message['role'],
      content: row.content,
      timestamp: new Date(row.timestamp),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }));
  }

  async addMemory(content: string, keywords: string[] = [], importance: number = 5): Promise<void> {
    const normalized = content.trim();
    if (!normalized) return;

    const existing = this.db.prepare(`
      SELECT id FROM memories
      WHERE content = ?
      LIMIT 1
    `).get(normalized) as { id: string } | undefined;

    if (existing) {
      this.db.prepare(`
        UPDATE memories
        SET importance = MAX(importance, ?),
            keywords = CASE
              WHEN length(?) > length(COALESCE(keywords, '')) THEN ?
              ELSE keywords
            END
        WHERE id = ?
      `).run(importance, keywords.join(','), keywords.join(','), existing.id);
      return;
    }

    const id = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const stmt = this.db.prepare(`
      INSERT INTO memories (id, session_id, content, keywords, importance)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, this.sessionId, normalized, keywords.join(','), importance);
  }

  /**
   * 跨会话语义弱检索：按关键词/内容匹配，按重要性排序。
   * 长期记忆默认全局可见，因此不按 session_id 过滤。
   */
  async searchMemories(query: string, limit: number = 5): Promise<MemoryRow[]> {
    const terms = extractSearchTerms(query);

    if (terms.length === 0) {
      return this.listMemories(limit);
    }

    const conditions = terms.map(() => `(keywords LIKE ? OR content LIKE ?)`).join(' OR ');
    const params = terms.flatMap((term) => [`%${term}%`, `%${term}%`]);

    const stmt = this.db.prepare(`
      SELECT * FROM memories
      WHERE ${conditions}
      ORDER BY importance DESC, created_at DESC
      LIMIT ?
    `);

    return stmt.all(...params, limit) as MemoryRow[];
  }

  async listMemories(limit: number = 50): Promise<MemoryRow[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM memories
      ORDER BY importance DESC, created_at DESC
      LIMIT ?
    `);
    return stmt.all(limit) as MemoryRow[];
  }

  async getRecentMemories(limit: number = 10): Promise<MemoryRow[]> {
    return this.listMemories(limit);
  }

  async deleteMemory(id: string): Promise<boolean> {
    const result = this.db.prepare(`DELETE FROM memories WHERE id = ?`).run(id);
    return result.changes > 0;
  }

  async clearAllMemories(): Promise<void> {
    this.db.prepare(`DELETE FROM memories`).run();
  }

  async saveKnowledge(key: string, value: unknown): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO knowledge (key, session_id, value)
      VALUES (?, ?, ?)
    `);

    stmt.run(key, this.sessionId, JSON.stringify(value));
  }

  async getKnowledge(key: string): Promise<unknown> {
    const stmt = this.db.prepare(`
      SELECT value FROM knowledge
      WHERE key = ? AND session_id = ?
    `);

    const row = stmt.get(key, this.sessionId) as { value: string } | undefined;

    return row ? JSON.parse(row.value) : null;
  }

  async clear(): Promise<void> {
    this.db
      .prepare(`DELETE FROM messages WHERE session_id = ?`)
      .run(this.sessionId);
    this.db
      .prepare(`DELETE FROM knowledge WHERE session_id = ?`)
      .run(this.sessionId);
  }

  async clearMemories(): Promise<void> {
    this.db
      .prepare(`DELETE FROM memories WHERE session_id = ?`)
      .run(this.sessionId);
  }

  getSessionId(): string {
    return this.sessionId;
  }

  close(): void {
    this.db.close();
  }
}
