import type { AgentStep } from './ChatInterface';

interface AgentStatusProps {
  sessionId: string | null;
  sessionError: string | null;
  steps: AgentStep[];
  isLoading: boolean;
}

export function AgentStatus({
  sessionId,
  sessionError,
  steps,
  isLoading,
}: AgentStatusProps) {
  return (
    <aside className="flex h-[calc(100vh-8rem)] flex-col rounded-xl border bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-800">Agent 状态</h2>
      <p className="mt-1 truncate text-xs text-slate-500">
        会话: {sessionId ?? '未连接'}
      </p>
      {sessionError && (
        <p className="mt-2 rounded bg-red-50 p-2 text-xs text-red-600">
          {sessionError}
        </p>
      )}
      <div className="mt-4 flex-1 space-y-3 overflow-y-auto text-xs">
        {steps.length === 0 && !isLoading && (
          <p className="text-slate-400">发送任务后在此查看 ReAct 步骤</p>
        )}
        {steps.map((step, index) => (
          <div
            key={`${index}-${step.thought.slice(0, 20)}`}
            className="rounded-lg border border-slate-100 bg-slate-50 p-3"
          >
            <p className="font-medium text-slate-700">💭 {step.thought}</p>
            {step.action && (
              <p className="mt-1 text-slate-600">
                🔧 {step.action.tool}
                <span className="block truncate opacity-80">
                  {JSON.stringify(step.action.input)}
                </span>
              </p>
            )}
            {step.observation !== undefined && (
              <p className="mt-1 truncate text-slate-500">
                👁️ {JSON.stringify(step.observation)}
              </p>
            )}
            {step.finalAnswer && (
              <p className="mt-1 text-green-700">✅ {step.finalAnswer}</p>
            )}
          </div>
        ))}
        {isLoading && (
          <p className="animate-pulse text-slate-500">Agent 正在思考...</p>
        )}
      </div>
    </aside>
  );
}
