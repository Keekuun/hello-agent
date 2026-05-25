import { describe, it, expect } from 'vitest';
import {
  getHttpErrorMessage,
  isSafePublicMessage,
  toUserMessage,
} from '../safeErrorMessage';

describe('safeErrorMessage', () => {
  it('maps 5xx status to generic message', () => {
    expect(getHttpErrorMessage(500, '获取会话列表失败')).toBe('服务暂时不可用，请稍后重试');
  });

  it('maps 404 status to session message', () => {
    expect(getHttpErrorMessage(404, '获取会话列表失败')).toBe('会话不存在或已失效');
  });

  it('allows predefined public messages', () => {
    expect(isSafePublicMessage('无法加载会话列表')).toBe(true);
  });

  it('blocks internal error details', () => {
    expect(
      isSafePublicMessage('Could not locate the bindings file. Tried: D:\\code\\...')
    ).toBe(false);
  });

  it('returns fallback for internal Error messages', () => {
    expect(
      toUserMessage(new Error('OPENAI_API_KEY is not configured'), '操作失败，请稍后重试')
    ).toBe('操作失败，请稍后重试');
  });

  it('returns safe server message as-is', () => {
    expect(
      toUserMessage(new Error('无法加载会话列表'), '操作失败，请稍后重试')
    ).toBe('无法加载会话列表');
  });
});
