import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MarkdownRenderer } from './MarkdownRenderer';
import { StreamingMarkdown } from './StreamingMarkdown';
import type { Skill } from '../hooks/useAgent';

export interface AgentStep {
  thought: string;
  action?: { tool: string; input: unknown };
  observation?: unknown;
  finalAnswer?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  steps?: AgentStep[];
  timestamp: string;
}

interface ChatInterfaceProps {
  sessionId: string | null;
  createSession: (title?: string) => Promise<string | null>;
  onStepsChange: (steps: AgentStep[]) => void;
  onLoadingChange: (loading: boolean) => void;
  selectedSkill?: Skill | null;
  onSkillUsed?: () => void;
  onSessionUpdate?: () => void;
}

const messageCache = new Map<string, Message[]>();

function CopyButton({ content, className = '' }: { content: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors ${className}`}
      title="复制内容"
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-500">已复制</span>
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span>复制</span>
        </>
      )}
    </button>
  );
}

function ExportButton({ messages }: { messages: Message[] }) {
  const handleExportMarkdown = () => {
    const md = messages.map(msg => {
      const time = new Date(msg.timestamp).toLocaleString('zh-CN');
      if (msg.role === 'user') {
        return `## 用户\n*${time}*\n\n${msg.content}\n`;
      } else {
        return `## 助手\n*${time}*\n\n${msg.content}\n`;
      }
    }).join('\n---\n\n');

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `对话记录_${new Date().toLocaleDateString('zh-CN')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (messages.length === 0) return null;

  return (
    <button
      onClick={handleExportMarkdown}
      className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
      title="导出为 Markdown"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      <span>导出</span>
    </button>
  );
}

function StepItem({ step, index }: { step: AgentStep; index: number }) {
  const [expanded, setExpanded] = useState(false);

  const getToolIcon = (tool: string) => {
    switch (tool) {
      case 'wikipedia': return '📖';
      case 'web_search': return '🔍';
      case 'calculator': return '🔢';
      case 'file': return '📁';
      default: return '🔧';
    }
  };

  const getToolName = (tool: string) => {
    switch (tool) {
      case 'wikipedia': return '维基百科';
      case 'web_search': return '网络搜索';
      case 'calculator': return '计算器';
      case 'file': return '文件工具';
      default: return tool;
    }
  };

  const formatObservation = (obs: unknown): string => {
    if (typeof obs === 'string') return obs;
    if (typeof obs === 'object' && obs !== null) {
      const obj = obs as any;
      if (obj.title && obj.summary) {
        return `📖 ${obj.title}\n${obj.summary.substring(0, 200)}...`;
      }
      if (obj.results && Array.isArray(obj.results)) {
        return `找到 ${obj.count || obj.results.length} 条结果`;
      }
      if (obj.error) return `❌ ${obj.error}`;
      return JSON.stringify(obs).substring(0, 150) + '...';
    }
    return String(obs);
  };

  return (
    <div className="border-l-2 border-slate-200 dark:border-slate-600 pl-3 py-1">
      <div
        className="flex items-start gap-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 rounded p-1.5 -ml-1 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-slate-400 text-xs mt-0.5 shrink-0">
          {expanded ? '▼' : '▶'}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">步骤 {index + 1}</span>
            {step.action && (
              <span className="inline-flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">
                {getToolIcon(step.action.tool)} {getToolName(step.action.tool)}
              </span>
            )}
            {step.finalAnswer && (
              <span className="inline-flex items-center gap-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded">
                ✅ 完成
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-1">
            {step.thought}
          </p>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 ml-4 space-y-2 text-xs overflow-hidden">
              <div className="bg-slate-100 dark:bg-slate-700 rounded p-2">
                <div className="font-medium text-slate-500 dark:text-slate-400 mb-1">💭 思考</div>
                <p className="text-slate-700 dark:text-slate-300 break-words">{step.thought}</p>
              </div>

              {step.action && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-2">
                  <div className="font-medium text-blue-500 dark:text-blue-400 mb-1">
                    {getToolIcon(step.action.tool)} 调用工具: {getToolName(step.action.tool)}
                  </div>
                  <pre className="text-blue-700 dark:text-blue-300 whitespace-pre-wrap break-all text-xs overflow-hidden">
                    {JSON.stringify(step.action.input, null, 2)}
                  </pre>
                </div>
              )}

              {step.observation !== undefined && (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded p-2">
                  <div className="font-medium text-amber-500 dark:text-amber-400 mb-1">👁️ 观察结果</div>
                  <p className="text-amber-700 dark:text-amber-300 whitespace-pre-wrap break-words">
                    {formatObservation(step.observation)}
                  </p>
                </div>
              )}

              {step.finalAnswer && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded p-2">
                  <div className="font-medium text-green-500 dark:text-green-400 mb-1">✅ 最终答案</div>
                  <p className="text-green-700 dark:text-green-300 line-clamp-3 break-words">{step.finalAnswer}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StepsProcess({ steps, isRunning }: { steps: AgentStep[]; isRunning: boolean }) {
  const [expanded, setExpanded] = useState(true);

  if (steps.length === 0 && !isRunning) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isRunning ? (
            <motion.div
              className="h-3 w-3 border-2 border-blue-500 border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          ) : (
            <span className="text-green-500 text-xs">✓</span>
          )}
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
            {isRunning ? 'Agent 正在思考...' : `已完成 ${steps.length} 个步骤`}
          </span>
        </div>
        <span className="text-xs text-slate-400">
          {expanded ? '收起' : '展开'}
        </span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-1 max-h-52 overflow-y-auto">
              {steps.map((step, i) => (
                <StepItem key={i} step={step} index={i} />
              ))}
              {isRunning && (
                <div className="flex items-center gap-2 text-xs text-slate-400 pl-3 py-1">
                  <motion.span
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    思考中...
                  </motion.span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function ChatInterface({
  sessionId,
  createSession,
  onStepsChange,
  onLoadingChange,
  selectedSkill,
  onSkillUsed,
  onSessionUpdate,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAnswer, setPendingAnswer] = useState<string | null>(null);
  const [pendingSteps, setPendingSteps] = useState<AgentStep[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isSwitchingSession, setIsSwitchingSession] = useState(false);
  const currentSessionIdRef = useRef<string | null>(null);
  const isLoadingSessionRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isAutoScrollRef = useRef(true);

  const loadMessages = useCallback(async (sid: string) => {
    if (messageCache.has(sid)) {
      setMessages(messageCache.get(sid)!);
      return;
    }

    try {
      const res = await fetch(`/api/sessions/${sid}/history`);
      const history = await res.json();
      
      if (Array.isArray(history) && history.length > 0) {
        const formattedMessages: Message[] = history.map((msg, i) => ({
          id: `history-${sid}-${i}`,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: msg.timestamp || new Date().toISOString(),
        }));
        setMessages(formattedMessages);
        messageCache.set(sid, formattedMessages);
      } else {
        setMessages([]);
        messageCache.set(sid, []);
      }
    } catch (err) {
      console.warn('Failed to fetch history:', err);
      setMessages([]);
    }
  }, []);

  useEffect(() => {
    if (sessionId && sessionId !== currentSessionIdRef.current && !isLoadingSessionRef.current) {
      isLoadingSessionRef.current = true;
      setIsSwitchingSession(true);
      
      setPendingAnswer(null);
      setPendingSteps([]);
      setIsTyping(false);
      
      loadMessages(sessionId).finally(() => {
        currentSessionIdRef.current = sessionId;
        isLoadingSessionRef.current = false;
        
        requestAnimationFrame(() => {
          scrollContainerRef.current?.scrollTo({
            top: scrollContainerRef.current.scrollHeight,
            behavior: 'instant'
          });
          setTimeout(() => setIsSwitchingSession(false), 150);
        });
      });
    }
  }, [sessionId, loadMessages]);

  useEffect(() => {
    onLoadingChange(isLoading);
  }, [isLoading, onLoadingChange]);

  useEffect(() => {
    if (selectedSkill && sessionId) {
      setInput(selectedSkill.prompt);
      onSkillUsed?.();
      inputRef.current?.focus();
    }
  }, [selectedSkill, sessionId, onSkillUsed]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? 'smooth' : 'instant'
      });
      isAutoScrollRef.current = true;
      setShowScrollButton(false);
    }
  }, []);

  const checkScrollPosition = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isNearBottom = distanceFromBottom < 150;

    if (isNearBottom) {
      isAutoScrollRef.current = true;
      setShowScrollButton(false);
    } else {
      isAutoScrollRef.current = false;
      if (scrollHeight > clientHeight + 200) {
        setShowScrollButton(true);
      }
    }
  }, []);

  const handleScroll = useCallback(() => {
    checkScrollPosition();
  }, [checkScrollPosition]);

  useEffect(() => {
    if (isAutoScrollRef.current && !isLoadingSessionRef.current) {
      scrollToBottom();
    }
  }, [messages, pendingAnswer, pendingSteps, isLoading, isTyping, scrollToBottom]);

  const handleTypewriterComplete = useCallback(() => {
    setIsTyping(false);
  }, []);

  const finalizeMessage = useCallback((content: string, steps?: AgentStep[]) => {
    const assistantMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content,
      steps,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => {
      const updated = [...prev, assistantMessage];
      if (currentSessionIdRef.current) {
        messageCache.set(currentSessionIdRef.current, updated);
      }
      return updated;
    });
    setPendingAnswer(null);
    setPendingSteps([]);
    setIsTyping(false);
    onSessionUpdate?.();
  }, [onSessionUpdate]);

  const handleResend = useCallback((content: string) => {
    setInput(content);
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
    if (e.key === 'Escape') {
      setInput('');
    }
  }, [input, sessionId, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || !sessionId) return;

    const task = input.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: task,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => {
      const updated = [...prev, userMessage];
      if (currentSessionIdRef.current) {
        messageCache.set(currentSessionIdRef.current, updated);
      }
      return updated;
    });
    setInput('');
    setIsLoading(true);
    setPendingAnswer(null);
    setPendingSteps([]);
    setIsTyping(false);
    isAutoScrollRef.current = true;
    onStepsChange([]);

    try {
      const response = await fetch(`/api/sessions/${sessionId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task }),
      });

      if (!response.ok || !response.body) {
        throw new Error('请求失败');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const steps: AgentStep[] = [];
      let finalAnswer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          try {
            const data = JSON.parse(line.slice(6)) as
              | AgentStep
              | { complete?: boolean; result?: string; error?: string };

            if ('error' in data && data.error) {
              throw new Error(data.error);
            }

            if ('complete' in data && data.complete && data.result) {
              finalAnswer = data.result;
              continue;
            }

            if ('thought' in data) {
              const existingIndex = steps.findIndex(
                (s) =>
                  s.thought === data.thought &&
                  s.action?.tool === data.action?.tool &&
                  !s.observation &&
                  data.observation !== undefined
              );

              if (existingIndex >= 0 && data.observation !== undefined) {
                steps[existingIndex] = { ...steps[existingIndex], ...data };
              } else {
                steps.push(data);
              }
              onStepsChange([...steps]);
              setPendingSteps([...steps]);

              if (data.finalAnswer) {
                finalAnswer = data.finalAnswer;
              }
            }
          } catch (parseError) {
            console.warn('Failed to parse SSE data:', parseError);
          }
        }
      }

      if (finalAnswer) {
        setPendingAnswer(finalAnswer);
        setIsTyping(true);
        setIsLoading(false);
      } else {
        finalizeMessage('（无回复）', steps);
        setIsLoading(false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const errorMsg: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `出错了: ${message}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      setIsLoading(false);
    }
  };

  return (
    <section className="flex h-[calc(100vh-8rem)] flex-col rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      {messages.length > 0 && (
        <div className={`flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-4 py-2 bg-white dark:bg-slate-900 shrink-0 transition-opacity duration-150 ${isSwitchingSession ? 'opacity-0' : 'opacity-100'}`}>
          <span className="text-xs text-slate-400">
            {messages.length} 条消息
          </span>
          <div className="flex items-center gap-3">
            <CopyButton content={messages.map(m => `${m.role === 'user' ? '用户' : '助手'}: ${m.content}`).join('\n\n')} />
            <ExportButton messages={messages} />
          </div>
        </div>
      )}

      <div
        ref={scrollContainerRef}
        className={`flex-1 overflow-y-auto transition-opacity duration-150 ${isSwitchingSession ? 'scrollbar-hidden' : ''}`}
        onScroll={handleScroll}
      >
        <div className={`p-4 space-y-4 transition-opacity duration-150 ${isSwitchingSession ? 'opacity-0' : 'opacity-100'}`}>
          {messages.length === 0 && !isLoading && !isSwitchingSession && (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center animate-fade-in">
              <div className="text-5xl mb-4">🤖</div>
              <h3 className="text-lg font-medium text-slate-700 dark:text-slate-200 mb-2">
                智能研究助手
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6">
                输入任何问题，我会自动搜索、分析并给出详细答案。
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <kbd className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-600 text-slate-500">
                  Enter
                </kbd>
                <span className="text-xs text-slate-400">发送</span>
                <kbd className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-600 text-slate-500">
                  Shift+Enter
                </kbd>
                <span className="text-xs text-slate-400">换行</span>
                <kbd className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-600 text-slate-500">
                  /
                </kbd>
                <span className="text-xs text-slate-400">聚焦输入框</span>
              </div>
            </div>
          )}

          {messages.map((msg, index) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in group`}
              style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
            >
              <div
                className={`max-w-[85%] ${
                  msg.role === 'user'
                    ? 'rounded-lg bg-blue-500 text-white px-4 py-3'
                    : 'space-y-2'
                }`}
              >
                {msg.role === 'user' ? (
                  <div className="relative">
                    <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                    <button
                      onClick={() => handleResend(msg.content)}
                      className="absolute -bottom-5 right-0 opacity-0 group-hover:opacity-100 text-xs text-blue-200 hover:text-white transition-opacity"
                      title="重新发送"
                    >
                      🔄 重新发送
                    </button>
                  </div>
                ) : (
                  <>
                    {msg.steps && msg.steps.length > 0 && (
                      <StepsProcess steps={msg.steps} isRunning={false} />
                    )}
                    <div className="rounded-lg bg-slate-50 dark:bg-slate-800 px-4 py-3 text-slate-900 dark:text-slate-100 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-400">Agent 回复</span>
                        <CopyButton content={msg.content} />
                      </div>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <MarkdownRenderer content={msg.content} />
                      </div>
                    </div>
                  </>
                )}
                <span className={`block text-xs mt-1 ${msg.role === 'user' ? 'text-blue-200 text-right' : 'text-slate-400'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}

          {(isLoading || pendingAnswer) && (
            <div className="flex justify-start animate-fade-in">
              <div className="max-w-[85%] space-y-2 w-full">
                {(pendingSteps.length > 0 || isLoading) && (
                  <StepsProcess steps={pendingSteps} isRunning={isLoading && !pendingAnswer} />
                )}
                {pendingAnswer && (
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-800 px-4 py-3 text-slate-900 dark:text-slate-100 shadow-sm">
                    {isTyping ? (
                      <StreamingMarkdown
                        content={pendingAnswer}
                        speed={5}
                        onComplete={handleTypewriterComplete}
                      />
                    ) : (
                      <>
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <MarkdownRenderer content={pendingAnswer} />
                        </div>
                        <button
                          onClick={() => finalizeMessage(pendingAnswer, pendingSteps)}
                          className="mt-3 text-xs text-blue-500 hover:text-blue-400"
                        >
                          ✓ 完成
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="relative border-t border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-900 shrink-0">
        <AnimatePresence>
          {showScrollButton && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              onClick={() => scrollToBottom()}
              className="absolute -top-10 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500 text-white text-xs shadow-lg hover:bg-blue-600 transition-colors"
              title="滚动到底部"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              <span>回到底部</span>
            </motion.button>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit}>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入问题... (Enter 发送，Shift+Enter 换行)"
              className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              disabled={isLoading || !sessionId}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim() || !sessionId}
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}