import { useCallback, useState, useEffect, useRef } from 'react';
import { toast } from '../components/Toast';
import { getHttpErrorMessage, toUserMessage } from '../utils/safeErrorMessage';

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

export interface MemoryItem {
  id: string;
  session_id: string;
  content: string;
  keywords: string;
  importance: number;
  created_at: string;
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  filename: string;
  mime_type: string;
  content_length: number;
  chunk_count: number;
  created_at: string;
}

async function readPublicError(response: Response, fallback: string): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    if (data.error && typeof data.error === 'string') {
      return toUserMessage(new Error(data.error), fallback);
    }
  } catch {
    // ignore parse errors
  }
  return getHttpErrorMessage(response.status, fallback);
}

export function useAgent() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [error, setError] = useState<string | null>(null);
  const initErrorShownRef = useRef(false);

  const fetchSessions = useCallback(async () => {
    const response = await fetch(`${API_BASE}/sessions`);
    if (!response.ok) {
      throw new Error(await readPublicError(response, '无法加载会话列表'));
    }
    const data = await response.json();
    setSessions(data as Session[]);
  }, []);

  const fetchSkills = useCallback(async () => {
    const response = await fetch(`${API_BASE}/skills`);
    if (!response.ok) {
      throw new Error(await readPublicError(response, '无法加载技能列表'));
    }
    const data = await response.json();
    setSkills(data as Skill[]);
  }, []);

  const fetchMemories = useCallback(async () => {
    const response = await fetch(`${API_BASE}/memories`);
    if (!response.ok) {
      throw new Error(await readPublicError(response, '无法加载长期记忆'));
    }
    const data = await response.json();
    setMemories(data as MemoryItem[]);
  }, []);

  const createSession = useCallback(async (title?: string) => {
    try {
      const response = await fetch(`${API_BASE}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title || '新会话' }),
      });

      if (!response.ok) {
        throw new Error(await readPublicError(response, '创建会话失败，请稍后重试'));
      }

      const data = (await response.json()) as { sessionId: string; title: string };
      setSessionId(data.sessionId);
      setError(null);
      await fetchSessions();
      return data.sessionId;
    } catch (err) {
      const message = toUserMessage(err, '创建会话失败，请稍后重试');
      setError(message);
      toast.error(message);
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

      if (!response.ok) {
        throw new Error(await readPublicError(response, '删除会话失败，请稍后重试'));
      }

      if (sessionId === id) {
        setSessionId(null);
      }
      await fetchSessions();
    } catch (err) {
      const message = toUserMessage(err, '删除会话失败，请稍后重试');
      console.error('Failed to delete session:', err);
      toast.error(message);
    }
  }, [sessionId, fetchSessions]);

  const renameSession = useCallback(async (id: string, title: string) => {
    try {
      const response = await fetch(`${API_BASE}/sessions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) {
        throw new Error(await readPublicError(response, '更新会话失败，请稍后重试'));
      }
      await fetchSessions();
    } catch (err) {
      const message = toUserMessage(err, '更新会话失败，请稍后重试');
      console.error('Failed to rename session:', err);
      toast.error(message);
    }
  }, [fetchSessions]);

  const deleteMemory = useCallback(async (id: string) => {
    try {
      const response = await fetch(`${API_BASE}/memories/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(await readPublicError(response, '删除记忆失败，请稍后重试'));
      }
      await fetchMemories();
      toast.success('已删除记忆');
    } catch (err) {
      const message = toUserMessage(err, '删除记忆失败，请稍后重试');
      console.error('Failed to delete memory:', err);
      toast.error(message);
    }
  }, [fetchMemories]);

  const clearMemories = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/memories`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(await readPublicError(response, '清空记忆失败，请稍后重试'));
      }
      await fetchMemories();
      toast.success('已清空全部记忆');
    } catch (err) {
      const message = toUserMessage(err, '清空记忆失败，请稍后重试');
      console.error('Failed to clear memories:', err);
      toast.error(message);
    }
  }, [fetchMemories]);

  const fetchDocuments = useCallback(async () => {
    const response = await fetch(`${API_BASE}/documents`);
    if (!response.ok) {
      throw new Error(await readPublicError(response, '无法加载知识库文档'));
    }
    const data = await response.json();
    setDocuments(data as KnowledgeDocument[]);
  }, []);

  const uploadDocument = useCallback(async (file: File) => {
    try {
      const content = await file.text();
      const response = await fetch(`${API_BASE}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: file.name.replace(/\.[^.]+$/, '') || file.name,
          filename: file.name,
          mimeType: file.type || 'text/plain',
          content,
        }),
      });

      if (!response.ok) {
        throw new Error(await readPublicError(response, '上传文档失败，请稍后重试'));
      }

      await fetchDocuments();
      toast.success(`已上传：${file.name}`);
      return true;
    } catch (err) {
      const message = toUserMessage(err, '上传文档失败，请稍后重试');
      console.error('Failed to upload document:', err);
      toast.error(message);
      return false;
    }
  }, [fetchDocuments]);

  const deleteDocument = useCallback(async (id: string) => {
    try {
      const response = await fetch(`${API_BASE}/documents/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(await readPublicError(response, '删除文档失败，请稍后重试'));
      }
      await fetchDocuments();
      toast.success('已删除文档');
    } catch (err) {
      const message = toUserMessage(err, '删除文档失败，请稍后重试');
      console.error('Failed to delete document:', err);
      toast.error(message);
    }
  }, [fetchDocuments]);

  const clearDocuments = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/documents`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(await readPublicError(response, '清空知识库失败，请稍后重试'));
      }
      await fetchDocuments();
      toast.success('已清空知识库');
    } catch (err) {
      const message = toUserMessage(err, '清空知识库失败，请稍后重试');
      console.error('Failed to clear documents:', err);
      toast.error(message);
    }
  }, [fetchDocuments]);

  useEffect(() => {
    void (async () => {
      const results = await Promise.allSettled([
        fetchSessions(),
        fetchSkills(),
        fetchMemories(),
        fetchDocuments(),
      ]);
      const failures = results.filter((result) => result.status === 'rejected');
      if (failures.length > 0 && !initErrorShownRef.current) {
        initErrorShownRef.current = true;
        failures.forEach((result) => {
          if (result.status === 'rejected') {
            console.error('Failed to initialize agent data:', result.reason);
          }
        });
        toast.error('服务暂时不可用，请稍后重试');
      }
    })();
  }, [fetchSessions, fetchSkills, fetchMemories, fetchDocuments]);

  return {
    sessionId,
    sessions,
    skills,
    memories,
    documents,
    error,
    createSession,
    switchSession,
    deleteSession,
    renameSession,
    fetchSessions,
    fetchMemories,
    deleteMemory,
    clearMemories,
    fetchDocuments,
    uploadDocument,
    deleteDocument,
    clearDocuments,
  };
}
