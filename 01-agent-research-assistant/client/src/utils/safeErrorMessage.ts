const INTERNAL_ERROR_PATTERN =
  /bindings|NODE_MODULE|ENOENT|EACCES|ECONNREFUSED|stack trace|\.(?:ts|js):\d+|at\s+\S+\s+\(|SQLITE_|OPENAI_API_KEY|Could not locate/i;

const SAFE_PUBLIC_MESSAGES = new Set([
  '服务暂时不可用，请稍后重试',
  '会话不存在或已失效',
  '请输入任务内容',
  '任务执行失败，请稍后重试',
  '创建会话失败，请稍后重试',
  '无法加载会话列表',
  '无法加载会话信息',
  '更新会话失败，请稍后重试',
  '无法加载历史消息',
  '删除会话失败，请稍后重试',
  '获取会话列表失败',
  '获取技能列表失败',
  '删除会话失败',
  '重命名失败',
  '请求失败',
  '（无回复）',
]);

export function isSafePublicMessage(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed || trimmed.length > 120) return false;
  if (INTERNAL_ERROR_PATTERN.test(trimmed)) return false;
  if (SAFE_PUBLIC_MESSAGES.has(trimmed)) return true;
  return !/[\\/:]/.test(trimmed) && !trimmed.includes('Error:');
}

export function toUserMessage(error: unknown, fallback = '操作失败，请稍后重试'): string {
  if (!(error instanceof Error)) return fallback;
  const message = error.message.trim();
  if (!message) return fallback;
  return isSafePublicMessage(message) ? message : fallback;
}

export function getHttpErrorMessage(status: number, fallback: string): string {
  if (status >= 500) return '服务暂时不可用，请稍后重试';
  if (status === 404) return '会话不存在或已失效';
  return fallback;
}
