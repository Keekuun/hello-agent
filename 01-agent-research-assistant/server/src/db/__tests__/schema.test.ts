import { describe, it, expect, vi } from 'vitest';
import { initializeDatabaseSchema, listSessions } from '../schema';

describe('database schema', () => {
  it('initializes core tables and indexes', () => {
    const exec = vi.fn();
    initializeDatabaseSchema({ exec } as never);

    expect(exec).toHaveBeenCalledOnce();
    const sql = exec.mock.calls[0]?.[0] as string;
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS sessions');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS messages');
    expect(sql).toContain('idx_messages_session');
  });

  it('lists sessions with message_count and first_message', () => {
    const rows = [
      {
        id: 's1',
        title: '测试会话',
        message_count: 2,
        first_message: '第一条消息',
      },
    ];
    const all = vi.fn().mockReturnValue(rows);
    const prepare = vi.fn().mockReturnValue({ all });
    const db = { prepare } as never;

    const sessions = listSessions(db);

    expect(prepare).toHaveBeenCalledOnce();
    expect(prepare).toHaveBeenCalledWith(expect.stringContaining('FROM sessions s'));
    expect(prepare).toHaveBeenCalledWith(expect.stringContaining('message_count'));
    expect(all).toHaveBeenCalledOnce();
    expect(sessions).toEqual(rows);
  });
});
