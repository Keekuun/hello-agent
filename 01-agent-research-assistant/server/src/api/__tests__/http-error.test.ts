import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Response } from 'express';
import {
  PublicError,
  logServerError,
  respondWithError,
  writeSseError,
} from '../http-error';

function createMockResponse() {
  const res = {
    statusCode: 200,
    body: null as unknown,
    written: '',
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: unknown) {
      this.body = data;
      return this;
    },
    write(data: string) {
      this.written += data;
      return true;
    },
    end: vi.fn(),
  };

  return res as Response & {
    statusCode: number;
    body: unknown;
    written: string;
    end: ReturnType<typeof vi.fn>;
  };
}

describe('http-error', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs server errors without exposing details to caller', () => {
    logServerError('GET /sessions', new Error('Could not locate bindings file'));

    expect(console.error).toHaveBeenCalled();
    const logged = vi.mocked(console.error).mock.calls[0]?.join(' ') ?? '';
    expect(logged).toContain('Could not locate bindings file');
  });

  it('respondWithError returns only public message', () => {
    const res = createMockResponse();

    respondWithError(
      res,
      500,
      'GET /sessions',
      new Error('Could not locate bindings file'),
      PublicError.LOAD_SESSIONS_FAILED
    );

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: PublicError.LOAD_SESSIONS_FAILED });
  });

  it('writeSseError writes sanitized SSE payload', () => {
    const res = createMockResponse();

    writeSseError(res, 'POST /execute', new Error('OPENAI_API_KEY is not configured'));

    expect(res.written).toBe(
      `data: ${JSON.stringify({ error: PublicError.EXECUTE_FAILED })}\n\n`
    );
    expect(res.end).toHaveBeenCalledOnce();
  });
});
