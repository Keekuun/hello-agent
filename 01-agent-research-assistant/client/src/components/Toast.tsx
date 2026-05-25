import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export type ToastType = 'error' | 'success' | 'warning' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

type ToastListener = (item: Omit<ToastItem, 'id'>) => void;

const listeners = new Set<ToastListener>();

const TOAST_DURATION_MS = 4500;

function emit(item: Omit<ToastItem, 'id'>) {
  listeners.forEach((listener) => listener(item));
}

export const toast = {
  error: (message: string) => emit({ message, type: 'error' }),
  success: (message: string) => emit({ message, type: 'success' }),
  warning: (message: string) => emit({ message, type: 'warning' }),
  info: (message: string) => emit({ message, type: 'info' }),
};

const typeStyles: Record<ToastType, string> = {
  error:
    'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/90 dark:text-red-200',
  success:
    'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/90 dark:text-green-200',
  warning:
    'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950/90 dark:text-yellow-200',
  info:
    'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/90 dark:text-blue-200',
};

const typeIcons: Record<ToastType, string> = {
  error: '✕',
  success: '✓',
  warning: '!',
  info: 'i',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((item: Omit<ToastItem, 'id'>) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { ...item, id }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_DURATION_MS);
  }, []);

  useEffect(() => {
    listeners.add(addToast);
    return () => {
      listeners.delete(addToast);
    };
  }, [addToast]);

  return (
    <>
      {children}
      <div
        className="pointer-events-none fixed top-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0 sm:pr-4"
        aria-live="polite"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, x: 24, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm shadow-lg ${typeStyles[item.type]}`}
            >
              <span
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black/10 text-xs font-bold dark:bg-white/10"
                aria-hidden
              >
                {typeIcons[item.type]}
              </span>
              <p className="flex-1 leading-snug">{item.message}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
