import Database from 'better-sqlite3';
import { MemorySystem, Message } from './types';

interface MessageRow {
  id: string;
  session_id: string;
  role: string;
  content: string;
  timestamp: string;
  metadata: string | null;
}

interface MemoryRow {
  id: string;
  session_id: string;
  content: string;
  keywords: string;
  importance: number;
  created_at: string;
}

export class SQLiteMemory implements MemorySystem {
  private db: Database.Database;
  private sessionId: string;

  constructor(dbPath: string, sessionId: string) {
    this.sessionId = sessionId;
    this.db = new Database(dbPath);
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT
      );

      CREATE TABLE IF NOT EXISTS knowledge (
        key TEXT NOT NULL,
        session_id TEXT NOT NULL,
        value TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (key, session_id)
      );

      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        content TEXT NOT NULL,
        keywords TEXT,
        importance INTEGER DEFAULT 5,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_messages_session
      ON messages(session_id, timestamp);

      CREATE INDEX IF NOT EXISTS idx_memories_session
      ON memories(session_id, created_at);

      CREATE INDEX IF NOT EXISTS idx_memories_keywords
      ON memories(keywords);
    `);
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
    const id = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const stmt = this.db.prepare(`
      INSERT INTO memories (id, session_id, content, keywords, importance)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, this.sessionId, content, keywords.join(','), importance);
  }

  async searchMemories(query: string, limit: number = 5): Promise<MemoryRow[]> {
    const keywords = query.split(/\s+/).filter(k => k.length > 1);
    
    if (keywords.length === 0) {
      const stmt = this.db.prepare(`
        SELECT * FROM memories
        ORDER BY importance DESC, created_at DESC
        LIMIT ?
      `);
      return stmt.all(limit) as MemoryRow[];
    }

    const conditions = keywords.map(() => `keywords LIKE ? OR content LIKE ?`).join(' OR ');
    const params = keywords.flatMap(k => [`%${k}%`, `%${k}%`]);
    
    const stmt = this.db.prepare(`
      SELECT * FROM memories
      WHERE ${conditions}
      ORDER BY importance DESC, created_at DESC
      LIMIT ?
    `);

    return stmt.all(...params, limit) as MemoryRow[];
  }

  async getRecentMemories(limit: number = 10): Promise<MemoryRow[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM memories
      ORDER BY created_at DESC
      LIMIT ?
    `);
    return stmt.all(limit) as MemoryRow[];
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