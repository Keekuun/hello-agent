import { useCallback, useState, useEffect } from 'react';

const API_BASE = '/api';

export interface Session {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  first_message?: string;
}

export interface Skill {
  id: string;
  name: string;
  icon: string;
  description: string;
  prompt: string;
}

export function useAgent() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/sessions`);
      if (!response.ok) throw new Error('获取会话列表失败');
      const data = await response.json();
      setSessions(data as Session[]);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    }
  }, []);

  const fetchSkills = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/skills`);
      if (!response.ok) throw new Error('获取技能列表失败');
      const data = await response.json();
      setSkills(data as Skill[]);
    } catch (err) {
      console.error('Failed to fetch skills:', err);
    }
  }, []);

  const createSession = useCallback(async (title?: string) => {
    try {
      const response = await fetch(`${API_BASE}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title || '新会话' }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? '创建会话失败');
      }

      const data = (await response.json()) as { sessionId: string; title: string };
      setSessionId(data.sessionId);
      setError(null);
      await fetchSessions();
      return data.sessionId;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      return null;
    }
  }, [fetchSessions]);

  const switchSession = useCallback(async (id: string) => {
    setSessionId(id);
    setError(null);
    return id;
  }, []);

  const deleteSession = useCallback(async (id: string) => {
    try {
      const response = await fetch(`${API_BASE}/sessions/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('删除会话失败');

      if (sessionId === id) {
        setSessionId(null);
      }
      await fetchSessions();
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  }, [sessionId, fetchSessions]);

  const renameSession = useCallback(async (id: string, title: string) => {
    try {
      const response = await fetch(`${API_BASE}/sessions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) throw new Error('重命名失败');
      await fetchSessions();
    } catch (err) {
      console.error('Failed to rename session:', err);
    }
  }, [fetchSessions]);

  useEffect(() => {
    fetchSessions();
    fetchSkills();
  }, [fetchSessions, fetchSkills]);

  return {
    sessionId,
    sessions,
    skills,
    error,
    createSession,
    switchSession,
    deleteSession,
    renameSession,
    fetchSessions,
  };
}