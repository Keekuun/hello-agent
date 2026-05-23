import Database from 'better-sqlite3';
import { MemorySystem, Message } from './types';

interface MessageRow {
  id: string;
  role: string;
  content: string;
  timestamp: string;
  metadata: string | null;
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

      CREATE INDEX IF NOT EXISTS idx_messages_session
      ON messages(session_id, timestamp);
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

  close(): void {
    this.db.close();
  }
}
