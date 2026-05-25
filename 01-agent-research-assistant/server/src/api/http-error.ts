import type { Response } from 'express';

export const PublicError = {
  INTERNAL: '服务暂时不可用，请稍后重试',
  SESSION_NOT_FOUND: '会话不存在或已失效',
  TASK_REQUIRED: '请输入任务内容',
  EXECUTE_FAILED: '任务执行失败，请稍后重试',
  CREATE_SESSION_FAILED: '创建会话失败，请稍后重试',
  LOAD_SESSIONS_FAILED: '无法加载会话列表',
  LOAD_SESSION_FAILED: '无法加载会话信息',
  UPDATE_SESSION_FAILED: '更新会话失败，请稍后重试',
  LOAD_HISTORY_FAILED: '无法加载历史消息',
  DELETE_SESSION_FAILED: '删除会话失败，请稍后重试',
} as const;

export function logServerError(context: string, error: unknown): void {
  if (error instanceof Error) {
    console.error(`[${context}] ${error.message}`, error.stack);
    return;
  }
  console.error(`[${context}]`, error);
}

export function respondWithError(
  res: Response,
  status: number,
  context: string,
  error: unknown,
  publicMessage: string
): void {
  logServerError(context, error);
  res.status(status).json({ error: publicMessage });
}

export function writeSseError(
  res: Response,
  context: string,
  error: unknown,
  publicMessage: string = PublicError.EXECUTE_FAILED
): void {
  logServerError(context, error);
  res.write(`data: ${JSON.stringify({ error: publicMessage })}\n\n`);
  res.end();
}
