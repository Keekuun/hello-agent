import { useCallback, useState } from 'react';

const API_BASE = '/api';

export function useAgent() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createSession = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/sessions`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? '创建会话失败');
      }

      const data = (await response.json()) as { sessionId: string };
      setSessionId(data.sessionId);
      setError(null);
      return data.sessionId;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      return null;
    }
  }, []);

  return { sessionId, error, createSession };
}
