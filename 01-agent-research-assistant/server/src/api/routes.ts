import express from 'express';
import path from 'path';
import fs from 'fs';
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

router.post('/sessions', (_req, res) => {
  try {
    const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const agent = createAgent(sessionId);
    agents.set(sessionId, agent);
    res.json({ sessionId });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: message });
  }
});

router.post('/sessions/:sessionId/execute', async (req, res) => {
  const { sessionId } = req.params;
  const { task } = req.body as { task?: string };

  if (!task?.trim()) {
    res.status(400).json({ error: 'task is required' });
    return;
  }

  const agent = agents.get(sessionId);

  if (!agent) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const result = await agent.execute(task, (step) => {
      res.write(`data: ${JSON.stringify(step)}\n\n`);
    });

    res.write(`data: ${JSON.stringify({ complete: true, result })}\n\n`);
    res.end();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
    res.end();
  }
});

router.get('/sessions/:sessionId/history', async (req, res) => {
  const { sessionId } = req.params;
  const agent = agents.get(sessionId);

  if (!agent) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  const history = await agent.getHistory();
  res.json(history);
});

router.delete('/sessions/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const agent = agents.get(sessionId);

  if (!agent) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  await agent.clearSession();
  agents.delete(sessionId);
  res.json({ ok: true });
});

export default router;
