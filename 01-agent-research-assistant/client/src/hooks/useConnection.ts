import { useState, useEffect, useCallback, useRef } from 'react';

interface UseConnectionOptions {
  checkInterval?: number;
  maxRetries?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onReconnectFailed?: () => void;
}

export function useConnection(options: UseConnectionOptions = {}) {
  const { checkInterval = 30000, maxRetries = 5, onConnect, onDisconnect, onReconnectFailed } = options;
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const checkTimerRef = useRef<number | null>(null);
  const retryTimerRef = useRef<number | null>(null);
  const isConnectedRef = useRef<boolean | null>(null);
  const isReconnectingRef = useRef(false);
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);
  const onReconnectFailedRef = useRef(onReconnectFailed);

  onConnectRef.current = onConnect;
  onDisconnectRef.current = onDisconnect;
  onReconnectFailedRef.current = onReconnectFailed;

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current !== null) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/health', {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const wasDisconnected = isConnectedRef.current === false;
        isConnectedRef.current = true;
        setIsConnected(true);
        isReconnectingRef.current = false;
        setIsReconnecting(false);
        setRetryCount(0);
        clearRetryTimer();
        if (wasDisconnected) {
          onConnectRef.current?.();
        }
        return true;
      }
      throw new Error('Health check failed');
    } catch {
      const wasConnected = isConnectedRef.current !== false;
      isConnectedRef.current = false;
      setIsConnected(false);
      if (wasConnected) {
        onDisconnectRef.current?.();
      }
      return false;
    }
  }, [clearRetryTimer]);

  const startReconnect = useCallback(() => {
    if (isReconnectingRef.current) return;

    isReconnectingRef.current = true;
    setIsReconnecting(true);
    setRetryCount(0);

    const attemptReconnect = (attempt: number) => {
      if (attempt >= maxRetries) {
        isReconnectingRef.current = false;
        setIsReconnecting(false);
        onReconnectFailedRef.current?.();
        return;
      }

      const delay = attempt === 0 ? 0 : Math.min(1000 * Math.pow(2, attempt - 1), 30000);

      retryTimerRef.current = window.setTimeout(async () => {
        if (isConnectedRef.current === true) {
          isReconnectingRef.current = false;
          setIsReconnecting(false);
          setRetryCount(0);
          return;
        }

        setRetryCount(attempt + 1);
        const success = await checkConnection();

        if (!success) {
          attemptReconnect(attempt + 1);
        }
      }, delay);
    };

    attemptReconnect(0);
  }, [maxRetries, checkConnection]);

  const checkAndReconnect = useCallback(async () => {
    const success = await checkConnection();
    if (!success && !isReconnectingRef.current) {
      startReconnect();
    }
    return success;
  }, [checkConnection, startReconnect]);

  useEffect(() => {
    void checkAndReconnect();

    checkTimerRef.current = window.setInterval(() => {
      void checkAndReconnect();
    }, checkInterval);

    const handleOnline = () => {
      void checkAndReconnect();
    };

    const handleOffline = () => {
      const wasConnected = isConnectedRef.current !== false;
      isConnectedRef.current = false;
      setIsConnected(false);
      if (wasConnected) {
        onDisconnectRef.current?.();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      if (checkTimerRef.current !== null) {
        clearInterval(checkTimerRef.current);
      }
      clearRetryTimer();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkInterval, checkAndReconnect, clearRetryTimer]);

  return {
    isConnected: isConnected === true,
    isDisconnected: isConnected === false,
    isReconnecting,
    retryCount,
    checkConnection: checkAndReconnect,
    retryNow: startReconnect,
  };
}
