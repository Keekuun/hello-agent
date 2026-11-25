export interface RetryOptions {
  /** 最大尝试次数（含首次），默认 3 */
  maxAttempts?: number;
  /** 初始延迟毫秒，默认 300 */
  initialDelayMs?: number;
  /** 退避倍数，默认 2 */
  backoffFactor?: number;
  /** 最大延迟毫秒，默认 5000 */
  maxDelayMs?: number;
  /** 自定义是否可重试；默认使用 isRetryableError */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  /** 重试前钩子，便于日志 */
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
  /** 可注入的 sleep，便于测试 */
  sleep?: (ms: number) => Promise<void>;
}

const RETRYABLE_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

const RETRYABLE_MESSAGE_PATTERN =
  /timeout|timed out|ECONNRESET|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|socket hang up|network|rate limit|Too Many Requests|overloaded|temporar|unavailable|fetch failed|503|502|429/i;

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const candidate = error as {
    status?: number;
    statusCode?: number;
    response?: { status?: number };
  };
  return candidate.status ?? candidate.statusCode ?? candidate.response?.status;
}

/** 判断网络波动、限流、5xx 等是否值得重试 */
export function isRetryableError(error: unknown): boolean {
  if (error == null) return false;

  const status = extractStatus(error);
  if (typeof status === 'number' && RETRYABLE_STATUS.has(status)) {
    return true;
  }

  const message =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : typeof error === 'string'
        ? error
        : JSON.stringify(error);

  return RETRYABLE_MESSAGE_PATTERN.test(message);
}

export async function withRetry<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
  const initialDelayMs = Math.max(0, options.initialDelayMs ?? 300);
  const backoffFactor = options.backoffFactor ?? 2;
  const maxDelayMs = Math.max(initialDelayMs, options.maxDelayMs ?? 5000);
  const shouldRetry = options.shouldRetry ?? ((error) => isRetryableError(error));
  const sleep = options.sleep ?? defaultSleep;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      const hasMoreAttempts = attempt < maxAttempts;
      if (!hasMoreAttempts || !shouldRetry(error, attempt)) {
        throw error;
      }

      const delayMs = Math.min(
        maxDelayMs,
        Math.round(initialDelayMs * backoffFactor ** (attempt - 1))
      );
      options.onRetry?.(error, attempt, delayMs);
      await sleep(delayMs);
    }
  }

  throw lastError;
}

export function getRetryConfigFromEnv(env: NodeJS.ProcessEnv = process.env): {
  maxAttempts: number;
  initialDelayMs: number;
} {
  const maxAttempts = Number(env.RETRY_MAX_ATTEMPTS ?? 3);
  const initialDelayMs = Number(env.RETRY_INITIAL_DELAY_MS ?? 300);

  return {
    maxAttempts: Number.isFinite(maxAttempts) && maxAttempts > 0 ? maxAttempts : 3,
    initialDelayMs:
      Number.isFinite(initialDelayMs) && initialDelayMs >= 0 ? initialDelayMs : 300,
  };
}
