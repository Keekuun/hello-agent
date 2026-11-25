import type Database from 'better-sqlite3';

export function initializeDatabaseSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '新会话',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

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

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      filename TEXT NOT NULL,
      mime_type TEXT NOT NULL DEFAULT 'text/plain',
      content_length INTEGER NOT NULL DEFAULT 0,
      chunk_count INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS document_chunks (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      content TEXT NOT NULL,
      keywords TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_messages_session
    ON messages(session_id, timestamp);

    CREATE INDEX IF NOT EXISTS idx_memories_session
    ON memories(session_id, created_at);

    CREATE INDEX IF NOT EXISTS idx_memories_keywords
    ON memories(keywords);

    CREATE INDEX IF NOT EXISTS idx_documents_created
    ON documents(created_at);

    CREATE INDEX IF NOT EXISTS idx_document_chunks_document
    ON document_chunks(document_id, chunk_index);

    CREATE INDEX IF NOT EXISTS idx_document_chunks_keywords
    ON document_chunks(keywords);
  `);
}

export function listSessions(db: Database.Database) {
  return db.prepare(`
    SELECT s.*,
      (SELECT COUNT(*) FROM messages WHERE session_id = s.id) as message_count,
      (SELECT content FROM messages WHERE session_id = s.id AND role = 'user' ORDER BY timestamp ASC LIMIT 1) as first_message
    FROM sessions s
    ORDER BY s.updated_at DESC
  `).all();
}
