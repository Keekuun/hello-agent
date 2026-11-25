import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AgentStep } from './ChatInterface';
import type { KnowledgeDocument, MemoryItem, Session, Skill } from '../hooks/useAgent';

interface AgentStatusProps {
  sessionId: string | null;
  sessionError: string | null;
  steps: AgentStep[];
  isLoading: boolean;
  sessions: Session[];
  skills: Skill[];
  memories: MemoryItem[];
  documents: KnowledgeDocument[];
  onCreateSession: (title?: string) => Promise<string | null>;
  onSwitchSession: (id: string) => Promise<string | null>;
  onDeleteSession: (id: string) => Promise<void>;
  onRenameSession: (id: string, title: string) => Promise<void>;
  onSelectSkill: (skill: Skill) => void;
  onDeleteMemory: (id: string) => Promise<void>;
  onClearMemories: () => Promise<void>;
  onRefreshMemories: () => Promise<void>;
  onUploadDocument: (file: File) => Promise<boolean>;
  onDeleteDocument: (id: string) => Promise<void>;
  onClearDocuments: () => Promise<void>;
  onRefreshDocuments: () => Promise<void>;
}

type SidebarTab = 'sessions' | 'skills' | 'memories' | 'knowledge';

export function AgentStatus({
  sessionId,
  sessionError,
  sessions,
  skills,
  memories,
  documents,
  onCreateSession,
  onSwitchSession,
  onDeleteSession,
  onRenameSession,
  onSelectSkill,
  onDeleteMemory,
  onClearMemories,
  onRefreshMemories,
  onUploadDocument,
  onDeleteDocument,
  onClearDocuments,
  onRefreshDocuments,
}: AgentStatusProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>('sessions');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClearMemories, setConfirmClearMemories] = useState(false);
  const [confirmClearDocuments, setConfirmClearDocuments] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleStartEdit = (session: Session) => {
    setEditingId(session.id);
    setEditTitle(session.title);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editTitle.trim()) {
      setEditingId(null);
      return;
    }

    const session = sessions.find(s => s.id === editingId);
    if (session && session.title === editTitle.trim()) {
      setEditingId(null);
      return;
    }

    await onRenameSession(editingId, editTitle.trim());
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (confirmDeleteId === id) {
      await onDeleteSession(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => {
        setConfirmDeleteId((current) => current === id ? null : current);
      }, 5000);
    }
  };

  const handleClearMemories = async () => {
    if (!confirmClearMemories) {
      setConfirmClearMemories(true);
      setTimeout(() => setConfirmClearMemories(false), 5000);
      return;
    }
    await onClearMemories();
    setConfirmClearMemories(false);
  };

  const handleClearDocuments = async () => {
    if (!confirmClearDocuments) {
      setConfirmClearDocuments(true);
      setTimeout(() => setConfirmClearDocuments(false), 5000);
      return;
    }
    await onClearDocuments();
    setConfirmClearDocuments(false);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsUploading(true);
    try {
      await onUploadDocument(file);
    } finally {
      setIsUploading(false);
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

  const formatBytes = (chars: number) => {
    if (chars < 1000) return `${chars} 字`;
    if (chars < 10000) return `${(chars / 1000).toFixed(1)}k 字`;
    return `${Math.round(chars / 1000)}k 字`;
  };

  const tabClass = (tab: SidebarTab) =>
    `flex-1 px-1.5 py-3 text-xs sm:text-sm font-medium transition-colors ${
      activeTab === tab
        ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
    }`;

  return (
    <aside className="flex h-[calc(100vh-8rem)] flex-col rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      <div className="flex border-b border-slate-200 dark:border-slate-700">
        <button onClick={() => setActiveTab('sessions')} className={tabClass('sessions')}>
          会话
        </button>
        <button onClick={() => setActiveTab('knowledge')} className={tabClass('knowledge')}>
          知识
        </button>
        <button onClick={() => setActiveTab('memories')} className={tabClass('memories')}>
          记忆
        </button>
        <button onClick={() => setActiveTab('skills')} className={tabClass('skills')}>
          技能
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'sessions' ? (
          <div className="p-3">
            <button
              onClick={() => onCreateSession()}
              className="w-full mb-3 flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 px-4 py-3 text-sm text-slate-500 dark:text-slate-400 hover:border-blue-400 hover:text-blue-500 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-colors"
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
                        ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'
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
                          className="flex-1 px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                                sessionId === session.id ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'
                              }`}>
                                {session.title || '新会话'}
                              </span>
                            </div>
                            {session.first_message && (
                              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 truncate pl-5">
                                {session.first_message.substring(0, 30)}...
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">
                              {formatDate(session.updated_at)}
                            </span>
                            <div className={`flex gap-0.5 transition-opacity ${confirmDeleteId === session.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartEdit(session);
                                }}
                                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                title="重命名"
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(session.id);
                                }}
                                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                                  confirmDeleteId === session.id
                                    ? 'bg-red-500 text-white hover:bg-red-600'
                                    : 'hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-400 hover:text-red-500 dark:hover:text-red-400'
                                }`}
                                title={confirmDeleteId === session.id ? '再次点击确认删除' : '删除'}
                              >
                                {confirmDeleteId === session.id ? (
                                  <>
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span>确认</span>
                                  </>
                                ) : (
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {sessions.length === 0 && (
                <div className="text-center py-8 text-sm text-slate-400 dark:text-slate-500">
                  暂无会话，点击上方创建
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'knowledge' ? (
          <div className="p-3 space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.markdown,.json,.csv,text/plain,text/markdown,application/json,text/csv"
              className="hidden"
              onChange={(event) => void handleFileChange(event)}
            />

            <button
              type="button"
              onClick={handleUploadClick}
              disabled={isUploading}
              className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 px-4 py-3 text-sm text-slate-500 dark:text-slate-400 hover:border-blue-400 hover:text-blue-500 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-colors disabled:opacity-60"
            >
              <span className="text-lg">+</span>
              <span>{isUploading ? '上传中…' : '上传文档'}</span>
            </button>

            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                支持 txt/md/json/csv · {documents.length} 篇
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => void onRefreshDocuments()}
                  className="px-2 py-1 text-xs rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="刷新"
                >
                  刷新
                </button>
                {documents.length > 0 && (
                  <button
                    type="button"
                    onClick={() => void handleClearDocuments()}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      confirmClearDocuments
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-red-500'
                    }`}
                    title={confirmClearDocuments ? '再次点击确认清空' : '清空全部'}
                  >
                    {confirmClearDocuments ? '确认清空' : '清空'}
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <AnimatePresence>
                {documents.map((document) => (
                  <motion.div
                    key={document.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="group rounded-lg border border-slate-200 dark:border-slate-700 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                          {document.title}
                        </p>
                        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 truncate">
                          {document.filename}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void onDeleteDocument(document.id)}
                        className="shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                        title="删除文档"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                      <span>{document.chunk_count} 块 · {formatBytes(document.content_length)}</span>
                      <span>{formatDate(document.created_at)}</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {documents.length === 0 && (
                <div className="text-center py-8 text-sm text-slate-400 dark:text-slate-500">
                  暂无知识库文档
                  <p className="mt-1 text-xs">上传后即可基于文档问答</p>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'memories' ? (
          <div className="p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                跨会话长期记忆 · {memories.length} 条
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => void onRefreshMemories()}
                  className="px-2 py-1 text-xs rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="刷新"
                >
                  刷新
                </button>
                {memories.length > 0 && (
                  <button
                    type="button"
                    onClick={() => void handleClearMemories()}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      confirmClearMemories
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-red-500'
                    }`}
                    title={confirmClearMemories ? '再次点击确认清空' : '清空全部'}
                  >
                    {confirmClearMemories ? '确认清空' : '清空'}
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <AnimatePresence>
                {memories.map((memory) => (
                  <motion.div
                    key={memory.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="group rounded-lg border border-slate-200 dark:border-slate-700 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                        {memory.content}
                      </p>
                      <button
                        type="button"
                        onClick={() => void onDeleteMemory(memory.id)}
                        className="shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                        title="删除这条记忆"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-1 min-w-0">
                        {(memory.keywords || '')
                          .split(',')
                          .map((keyword) => keyword.trim())
                          .filter(Boolean)
                          .slice(0, 4)
                          .map((keyword) => (
                            <span
                              key={`${memory.id}-${keyword}`}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                            >
                              {keyword}
                            </span>
                          ))}
                      </div>
                      <span className="shrink-0 text-[10px] text-slate-400">
                        重要度 {memory.importance}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {memories.length === 0 && (
                <div className="text-center py-8 text-sm text-slate-400 dark:text-slate-500">
                  暂无长期记忆
                  <p className="mt-1 text-xs">对话后会自动提取可复用信息</p>
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
                  className="w-full text-left rounded-lg border border-slate-200 dark:border-slate-700 p-3 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{skill.icon}</span>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{skill.name}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 pl-7">
                    {skill.description}
                  </p>
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </div>

      {sessionError && (
        <div className="border-t border-slate-200 dark:border-slate-700 p-3">
          <p className="text-xs text-red-500 dark:text-red-400">{sessionError}</p>
        </div>
      )}
    </aside>
  );
}
