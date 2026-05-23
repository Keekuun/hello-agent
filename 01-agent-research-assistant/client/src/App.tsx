import { useCallback, useState, useEffect } from 'react';
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
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 sm:px-6 py-3 sm:py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-100">
              智能研究助手 Agent
            </h1>
            <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              ReAct 推理 · 多轮对话 · 记忆功能
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden sm:inline text-xs text-slate-400 dark:text-slate-500">
              {sessions.length} 个会话
            </span>
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
              title={isDark ? '切换到亮色模式' : '切换到暗色模式'}
            >
              {isDark ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl gap-4 p-2 sm:p-4 lg:grid lg:grid-cols-[1fr_280px]">
        <ChatInterface
          sessionId={sessionId}
          createSession={createSession}
          onStepsChange={handleStepsChange}
          onLoadingChange={handleLoadingChange}
          selectedSkill={selectedSkill}
          onSkillUsed={() => setSelectedSkill(null)}
          onSessionUpdate={fetchSessions}
        />
        <div className="hidden lg:block">
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
        </div>
      </main>
    </div>
  );
}