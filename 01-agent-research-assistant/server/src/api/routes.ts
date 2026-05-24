import express from 'express';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import { ResearchAgent } from '../agent';
import { OpenAIClient } from '../llm/openai-client';
import { SQLiteMemory } from '../agent/memory';

const router = express.Router();
const agents = new Map<string, ResearchAgent>();

function getDatabasePath(): string {
  const dbPath = process.env.DATABASE_PATH ?? './data/agent.db';
  const dir = path.dirname(path.resolve(dbPath));
  fs.mkdirSync(dir, { recursive: true });
  return dbPath;
}

function getDb(): Database.Database {
  const db = new Database(getDatabasePath());
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '新会话',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  return db;
}

function createAgent(sessionId: string): ResearchAgent {
  const memory = new SQLiteMemory(getDatabasePath(), sessionId);
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const llm = new OpenAIClient(apiKey, process.env.OPENAI_MODEL, process.env.OPENAI_BASE_URL);

  return new ResearchAgent(
    {
      llm,
      tools: [],
      memory,
      maxIterations: Number(process.env.MAX_ITERATIONS ?? 10),
    },
    sessionId
  );
}

async function generateTitle(task: string): Promise<string> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return task.substring(0, 20);

    const llm = new OpenAIClient(apiKey, process.env.OPENAI_MODEL, process.env.OPENAI_BASE_URL);
    const response = await llm.generate(
      `请为以下对话生成一个简短的标题（不超过15个字，不要引号）：\n\n${task.substring(0, 200)}`,
      { temperature: 0.3, maxTokens: 50 }
    );
    
    const title = response.replace(/['"「」【】]/g, '').trim();
    return title.substring(0, 20) || task.substring(0, 20);
  } catch {
    return task.substring(0, 20);
  }
}

// 创建会话
router.post('/sessions', (req, res) => {
  try {
    const { title } = req.body as { title?: string };
    const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    const db = getDb();
    db.prepare('INSERT INTO sessions (id, title) VALUES (?, ?)').run(sessionId, title || '新会话');
    db.close();

    const agent = createAgent(sessionId);
    agents.set(sessionId, agent);
    res.json({ sessionId, title: title || '新会话' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: message });
  }
});

// 获取会话列表
router.get('/sessions', (_req, res) => {
  try {
    const db = getDb();
    const sessions = db.prepare(`
      SELECT s.*, 
        (SELECT COUNT(*) FROM messages WHERE session_id = s.id) as message_count,
        (SELECT content FROM messages WHERE session_id = s.id AND role = 'user' ORDER BY timestamp ASC LIMIT 1) as first_message
      FROM sessions s
      ORDER BY s.updated_at DESC
    `).all();
    db.close();
    res.json(sessions);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: message });
  }
});

// 获取单个会话
router.get('/sessions/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const db = getDb();
    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
    db.close();
    
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json(session);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: message });
  }
});

// 更新会话标题
router.patch('/sessions/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const { title } = req.body as { title?: string };
    
    const db = getDb();
    db.prepare('UPDATE sessions SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(title || '新会话', sessionId);
    db.close();
    
    res.json({ ok: true, title });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: message });
  }
});

// 执行任务 (SSE 流式)
router.post('/sessions/:sessionId/execute', async (req, res) => {
  const { sessionId } = req.params;
  const { task } = req.body as { task?: string };

  if (!task?.trim()) {
    res.status(400).json({ error: 'task is required' });
    return;
  }

  let agent = agents.get(sessionId);

  if (!agent) {
    try {
      agent = createAgent(sessionId);
      agents.set(sessionId, agent);
    } catch {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
  }

  const db = getDb();
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId) as any;
  const isFirstMessage = !session || session.title === '新会话';
  db.prepare('UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(sessionId);
  db.close();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const result = await agent.execute(task, (step) => {
      res.write(`data: ${JSON.stringify(step)}\n\n`);
    });

    res.write(`data: ${JSON.stringify({ complete: true, result })}\n\n`);
    res.end();

    if (isFirstMessage) {
      generateTitle(task).then(title => {
        const db = getDb();
        db.prepare('UPDATE sessions SET title = ? WHERE id = ?').run(title, sessionId);
        db.close();
      }).catch(err => console.warn('Failed to generate title:', err));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
    res.end();
  }
});

// 获取会话历史
router.get('/sessions/:sessionId/history', async (req, res) => {
  const { sessionId } = req.params;
  let agent = agents.get(sessionId);

  if (!agent) {
    try {
      agent = createAgent(sessionId);
      agents.set(sessionId, agent);
    } catch {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
  }

  const history = await agent.getHistory();
  res.json(history);
});

// 删除会话
router.delete('/sessions/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const agent = agents.get(sessionId);

  if (agent) {
    await agent.clearSession();
    agents.delete(sessionId);
  }

  const db = getDb();
  db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
  db.close();

  res.json({ ok: true });
});

// 获取技能列表
router.get('/skills', (_req, res) => {
  const skills = [
    {
      id: 'research',
      name: '深度研究',
      icon: '🔬',
      description: '深入研究某个主题，提供详细的分析报告',
      prompt: '请对以下主题进行深入研究，提供详细的分析报告，包括背景、现状、发展趋势和关键要点：',
    },
    {
      id: 'summarize',
      name: '内容总结',
      icon: '📝',
      description: '总结长文本的核心内容',
      prompt: '请总结以下内容的核心要点，用简洁的bullet points列出：',
    },
    {
      id: 'translate',
      name: '翻译润色',
      icon: '🌐',
      description: '翻译并润色文本',
      prompt: '请将以下内容翻译成中文，并进行润色，使其更加通顺自然：',
    },
    {
      id: 'code',
      name: '代码助手',
      icon: '💻',
      description: '编写和解释代码',
      prompt: '请帮我编写或解释以下代码，提供详细的注释和说明：',
    },
    {
      id: 'compare',
      name: '对比分析',
      icon: '⚖️',
      description: '对比分析多个选项',
      prompt: '请对以下选项进行详细的对比分析，列出各自的优缺点，并给出推荐：',
    },
    {
      id: 'brainstorm',
      name: '头脑风暴',
      icon: '💡',
      description: '创意发散思维',
      prompt: '请围绕以下主题进行头脑风暴，提供多个创意方向和可行性分析：',
    },
    {
      id: 'interview',
      name: '面试助手',
      icon: '🎯',
      description: '模拟面试、准备面试问题、提供回答建议',
      prompt: '我正在准备面试。请帮我：\n1. 分析这个岗位的核心要求\n2. 列出常见面试问题\n3. 提供回答思路和示例\n\n岗位/公司信息：',
    },
    {
      id: 'explain',
      name: '概念解释',
      icon: '📚',
      description: '用简单易懂的方式解释复杂概念',
      prompt: '请用简单易懂的方式解释以下概念，包括：\n1. 核心定义\n2. 通俗类比\n3. 实际应用场景\n4. 相关概念对比\n\n概念：',
    },
  ];
  res.json(skills);
});

export default router;