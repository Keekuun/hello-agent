import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AgentStep } from './ChatInterface';
import type { Session, Skill } from '../hooks/useAgent';

interface AgentStatusProps {
  sessionId: string | null;
  sessionError: string | null;
  steps: AgentStep[];
  isLoading: boolean;
  sessions: Session[];
  skills: Skill[];
  onCreateSession: (title?: string) => Promise<string | null>;
  onSwitchSession: (id: string) => Promise<string | null>;
  onDeleteSession: (id: string) => Promise<void>;
  onRenameSession: (id: string, title: string) => Promise<void>;
  onSelectSkill: (skill: Skill) => void;
}

export function AgentStatus({
  sessionId,
  sessionError,
  steps,
  isLoading,
  sessions,
  skills,
  onCreateSession,
  onSwitchSession,
  onDeleteSession,
  onRenameSession,
  onSelectSkill,
}: AgentStatusProps) {
  const [activeTab, setActiveTab] = useState<'sessions' | 'skills'>('sessions');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleStartEdit = (session: Session) => {
    setEditingId(session.id);
    setEditTitle(session.title);
  };

  const handleSaveEdit = async () => {
    if (editingId && editTitle.trim()) {
      await onRenameSession(editingId, editTitle.trim());
      setEditingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirmDeleteId === id) {
      await onDeleteSession(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return '昨天';
    } else if (days < 7) {
      return `${days}天前`;
    } else {
      return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <aside className="flex h-[calc(100vh-8rem)] flex-col rounded-xl border bg-white shadow-sm overflow-hidden">
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('sessions')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'sessions'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          会话历史
        </button>
        <button
          onClick={() => setActiveTab('skills')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'skills'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          技能库
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'sessions' ? (
          <div className="p-3">
            <button
              onClick={() => onCreateSession()}
              className="w-full mb-3 flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
            >
              <span className="text-lg">+</span>
              <span>新建会话</span>
            </button>

            <div className="space-y-1">
              <AnimatePresence>
                {sessions.map((session) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className={`group relative rounded-lg p-2.5 cursor-pointer transition-colors ${
                      sessionId === session.id
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                    onClick={() => onSwitchSession(session.id)}
                  >
                    {editingId === session.id ? (
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className="flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          autoFocus
                        />
                        <button
                          onClick={handleSaveEdit}
                          className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          保存
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm">
                                {session.title.length > 0 ? '💬' : '📝'}
                              </span>
                              <span className={`text-sm font-medium truncate ${
                                sessionId === session.id ? 'text-blue-700' : 'text-slate-700'
                              }`}>
                                {session.title || '新会话'}
                              </span>
                            </div>
                            {session.first_message && (
                              <p className="mt-1 text-xs text-slate-400 truncate pl-5">
                                {session.first_message.substring(0, 30)}...
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-slate-400 shrink-0">
                            {formatDate(session.updated_at)}
                          </span>
                        </div>
                        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEdit(session);
                            }}
                            className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                            title="重命名"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(session.id);
                            }}
                            className={`p-1 rounded transition-colors ${
                              confirmDeleteId === session.id
                                ? 'bg-red-100 text-red-600'
                                : 'hover:bg-slate-200 text-slate-400 hover:text-red-500'
                            }`}
                            title={confirmDeleteId === session.id ? '确认删除' : '删除'}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {sessions.length === 0 && (
                <div className="text-center py-8 text-sm text-slate-400">
                  暂无会话，点击上方创建
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-3">
            <div className="space-y-2">
              {skills.map((skill) => (
                <motion.button
                  key={skill.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelectSkill(skill)}
                  className="w-full text-left rounded-lg border border-slate-200 p-3 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{skill.icon}</span>
                    <span className="text-sm font-medium text-slate-700">{skill.name}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 pl-7">
                    {skill.description}
                  </p>
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </div>

      {sessionError && (
        <div className="border-t p-3">
          <p className="text-xs text-red-500">{sessionError}</p>
        </div>
      )}
    </aside>
  );
}