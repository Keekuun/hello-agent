import { useCallback, useState } from 'react';
import { ChatInterface, type AgentStep } from './components/ChatInterface';
import { AgentStatus } from './components/AgentStatus';
import { useAgent, type Skill } from './hooks/useAgent';

export default function App() {
  const {
    sessionId,
    sessions,
    skills,
    error,
    createSession,
    switchSession,
    deleteSession,
    renameSession,
    fetchSessions,
  } = useAgent();
  
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);

  const handleStepsChange = useCallback((next: AgentStep[]) => {
    setSteps(next);
  }, []);

  const handleLoadingChange = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  const handleSelectSkill = useCallback((skill: Skill) => {
    setSelectedSkill(skill);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              智能研究助手 Agent
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              ReAct 推理 · 多轮对话 · 记忆功能
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">
              {sessions.length} 个会话
            </span>
          </div>
        </div>
      </header>
      <main className="mx-auto grid max-w-7xl gap-4 p-4 lg:grid-cols-[1fr_280px]">
        <ChatInterface
          sessionId={sessionId}
          createSession={createSession}
          onStepsChange={handleStepsChange}
          onLoadingChange={handleLoadingChange}
          selectedSkill={selectedSkill}
          onSkillUsed={() => setSelectedSkill(null)}
          onSessionUpdate={fetchSessions}
        />
        <AgentStatus
          sessionId={sessionId}
          sessionError={error}
          steps={steps}
          isLoading={isLoading}
          sessions={sessions}
          skills={skills}
          onCreateSession={createSession}
          onSwitchSession={switchSession}
          onDeleteSession={deleteSession}
          onRenameSession={renameSession}
          onSelectSkill={handleSelectSkill}
        />
      </main>
    </div>
  );
}