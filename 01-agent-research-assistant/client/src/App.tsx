import { useCallback, useState } from 'react';
import { ChatInterface, type AgentStep } from './components/ChatInterface';
import { AgentStatus } from './components/AgentStatus';
import { useAgent } from './hooks/useAgent';

export default function App() {
  const { sessionId, error, createSession } = useAgent();
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleStepsChange = useCallback((next: AgentStep[]) => {
    setSteps(next);
  }, []);

  const handleLoadingChange = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white px-6 py-4 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">
          智能研究助手 Agent
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          ReAct 循环 · 维基百科 · 计算器 · 文件工具
        </p>
      </header>
      <main className="mx-auto grid max-w-6xl gap-4 p-4 lg:grid-cols-[1fr_320px]">
        <ChatInterface
          sessionId={sessionId}
          createSession={createSession}
          onStepsChange={handleStepsChange}
          onLoadingChange={handleLoadingChange}
        />
        <AgentStatus
          sessionId={sessionId}
          sessionError={error}
          steps={steps}
          isLoading={isLoading}
        />
      </main>
    </div>
  );
}
