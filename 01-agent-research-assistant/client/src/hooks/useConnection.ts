import { useState, useEffect, useCallback, useRef } from 'react';

interface UseConnectionOptions {
  checkInterval?: number;
  maxRetries?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function useConnection(options: UseConnectionOptions = {}) {
  const { checkInterval = 30000, maxRetries = 5, onConnect, onDisconnect } = options;
  const [isConnected, setIsConnected] = useState(true);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const checkTimerRef = useRef<number | null>(null);
  const retryTimerRef = useRef<number | null>(null);

  const checkConnection = useCallback(async () => {
    try {
      const response = await fetch('/health', { 
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        if (!isConnected) {
          setIsConnected(true);
          setIsReconnecting(false);
          setRetryCount(0);
          onConnect?.();
        }
        return true;
      }
      throw new Error('Health check failed');
    } catch {
      if (isConnected) {
        setIsConnected(false);
        onDisconnect?.();
      }
      return false;
    }
  }, [isConnected, onConnect, onDisconnect]);

  const reconnect = useCallback(async () => {
    if (isReconnecting) return;
    
    setIsReconnecting(true);
    
    const attemptReconnect = async (attempt: number) => {
      if (attempt >= maxRetries) {
        setIsReconnecting(false);
        return;
      }

      const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
      
      retryTimerRef.current = window.setTimeout(async () => {
        setRetryCount(attempt + 1);
        const success = await checkConnection();
        
        if (!success) {
          attemptReconnect(attempt + 1);
        } else {
          setIsReconnecting(false);
          setRetryCount(0);
        }
      }, delay);
    };

    attemptReconnect(0);
  }, [isReconnecting, maxRetries, checkConnection]);

  useEffect(() => {
    checkConnection();
    
    checkTimerRef.current = window.setInterval(checkConnection, checkInterval);
    
    const handleOnline = () => {
      checkConnection();
    };
    
    const handleOffline = () => {
      setIsConnected(false);
      onDisconnect?.();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      if (checkTimerRef.current) clearInterval(checkTimerRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkInterval, checkConnection, onDisconnect]);

  useEffect(() => {
    if (!isConnected && !isReconnecting) {
      reconnect();
    }
  }, [isConnected, isReconnecting, reconnect]);

  return { isConnected, isReconnecting, retryCount, checkConnection };
}