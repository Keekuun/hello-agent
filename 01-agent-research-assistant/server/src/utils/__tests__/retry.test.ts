import { describe, it, expect, vi } from 'vitest';
import {
  getRetryConfigFromEnv,
  isRetryableError,
  withRetry,
} from '../retry';

describe('isRetryableError', () => {
  it('retries on common network and rate-limit errors', () => {
    expect(isRetryableError(new Error('fetch failed'))).toBe(true);
    expect(isRetryableError(new Error('ECONNRESET'))).toBe(true);
    expect(isRetryableError(new Error('Too Many Requests'))).toBe(true);
    expect(isRetryableError({ status: 429 })).toBe(true);
    expect(isRetryableError({ status: 503 })).toBe(true);
  });

  it('does not retry on client errors', () => {
    expect(isRetryableError(new Error('Invalid API key'))).toBe(false);
    expect(isRetryableError({ status: 401 })).toBe(false);
    expect(isRetryableError({ status: 400 })).toBe(false);
  });
});

describe('withRetry', () => {
  it('returns on first success', async () => {
    const operation = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(operation, { maxAttempts: 3, sleep: async () => undefined });
    expect(result).toBe('ok');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('retries retryable failures then succeeds', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('timeout'), { status: 503 }))
      .mockRejectedValueOnce(Object.assign(new Error('timeout'), { status: 503 }))
      .mockResolvedValue('recovered');

    const onRetry = vi.fn();
    const result = await withRetry(operation, {
      maxAttempts: 3,
      initialDelayMs: 10,
      sleep: async () => undefined,
      onRetry,
    });

    expect(result).toBe('recovered');
    expect(operation).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  it('stops immediately on non-retryable errors', async () => {
    const operation = vi.fn().mockRejectedValue(Object.assign(new Error('bad request'), { status: 400 }));

    await expect(
      withRetry(operation, { maxAttempts: 5, sleep: async () => undefined })
    ).rejects.toThrow('bad request');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('throws last error after exhausting attempts', async () => {
    const operation = vi.fn().mockRejectedValue(Object.assign(new Error('down'), { status: 502 }));

    await expect(
      withRetry(operation, { maxAttempts: 3, sleep: async () => undefined })
    ).rejects.toThrow('down');
    expect(operation).toHaveBeenCalledTimes(3);
  });
});

describe('getRetryConfigFromEnv', () => {
  it('reads env overrides with sane defaults', () => {
    expect(getRetryConfigFromEnv({})).toEqual({
      maxAttempts: 3,
      initialDelayMs: 300,
    });
    expect(
      getRetryConfigFromEnv({
        RETRY_MAX_ATTEMPTS: '5',
        RETRY_INITIAL_DELAY_MS: '100',
      })
    ).toEqual({
      maxAttempts: 5,
      initialDelayMs: 100,
    });
  });
});
