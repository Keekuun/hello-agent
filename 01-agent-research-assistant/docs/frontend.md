# 前端技术详细说明

## 1. 技术栈概览

| 技术 | 版本 | 用途 |
|------|------|------|
| **React** | 18.3.1 | UI 框架 |
| **Vite** | 6.0.5 | 构建工具 + 开发服务器 |
| **TypeScript** | 5.7.2 | 类型安全 |
| **Tailwind CSS** | 3.4.17 | 样式框架 |
| **react-markdown** | 10.1.0 | Markdown 渲染 |
| **remark-gfm** | 4.0.1 | GitHub Flavored Markdown |
| **rehype-highlight** | 7.0.2 | 代码语法高亮 |
| **highlight.js** | 11.11.1 | 高亮引擎 |
| **Framer Motion** | 12.40.0 | 动画库 |

---

## 2. 核心组件详解

### 2.1 组件树结构

```
App
├── header (标题 + 描述)
└── main (两栏布局)
    ├── ChatInterface (左侧 - 主聊天区)
    │   ├── 消息列表
    │   │   ├── 用户消息 (气泡)
    │   │   ├── 助手消息
    │   │   │   ├── StepsProcess (可折叠步骤)
    │   │   │   │   └── StepItem (单个步骤)
    │   │   │   └── MarkdownRenderer (最终答案)
    │   │   └── Loading 动画
    │   ├── StreamingMarkdown (打字机效果)
    │   ├── 滚动到底部按钮
    │   └── 输入表单
    └── AgentStatus (右侧 - 状态栏)
        ├── 会话信息
        ├── 连接状态
        └── 实时步骤
```

### 2.2 ChatInterface 组件

**职责**: 主聊天界面，管理消息流、SSE 通信、用户交互

**核心状态**:
```typescript
const [messages, setMessages] = useState<Message[]>([]);           // 历史消息
const [input, setInput] = useState('');                            // 输入框
const [isLoading, setIsLoading] = useState(false);                 // 加载状态
const [pendingAnswer, setPendingAnswer] = useState<string | null>(null); // 待显示答案
const [pendingSteps, setPendingSteps] = useState<AgentStep[]>([]); // 推理步骤
const [isTyping, setIsTyping] = useState(false);                   // 打字机状态
const [showScrollButton, setShowScrollButton] = useState(false);   // 滚动按钮
```

**关键逻辑**:
- `handleSubmit`: 发送任务，启动 SSE 流
- `scrollToBottom`: 智能滚动（区分自动/手动）
- `finalizeMessage`: 打字机完成后保存消息

### 2.3 StepsProcess 组件

**职责**: 展示 Agent 推理过程（思考/工具调用/观察）

**功能**:
- 可折叠/展开
- 实时更新步骤
- 工具图标映射
- 颜色编码：蓝色(行动)、琥珀色(观察)、绿色(完成)

```typescript
// 工具图标映射
const getToolIcon = (tool: string) => {
  switch (tool) {
    case 'wikipedia': return '📖';
    case 'web_search': return '🔍';
    case 'calculator': return '🔢';
    case 'file': return '📁';
    default: return '🔧';
  }
};
```

### 2.4 StreamingMarkdown 组件

**职责**: 打字机效果 + 实时 Markdown 渲染

**实现原理**:
```typescript
// 每次渲染 5 个字符
const animate = () => {
  if (indexRef.current < content.length) {
    const charsToAdd = Math.min(5, content.length - indexRef.current);
    const nextIndex = indexRef.current + charsToAdd;
    setDisplayedContent(content.slice(0, nextIndex));
    indexRef.current = nextIndex;
    
    timerRef.current = window.setTimeout(animate, speed);
  } else {
    setIsComplete(true);
    onComplete?.();
  }
};
```

**特点**:
- 边打字边渲染 Markdown
- 闪烁光标指示正在输入
- 完成后切换到完整渲染

### 2.5 MarkdownRenderer 组件

**职责**: 完整的 Markdown 渲染

**支持的语法**:
- 标题 (h1-h3)
- 列表 (有序/无序)
- 代码块 (带语法高亮)
- 表格
- 引用块
- 链接 (新窗口打开)
- 粗体/斜体
- 水平线

**自定义样式**:
```typescript
components={{
  h1: ({ children }) => (
    <h1 className="mb-3 mt-4 text-2xl font-bold text-slate-900">
      {children}
    </h1>
  ),
  code: ({ className, children, ...props }) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code className="rounded bg-slate-200 px-1.5 py-0.5 text-sm font-mono text-pink-600">
          {children}
        </code>
      );
    }
    // 代码块带标题栏
    return (
      <div className="mb-3 rounded-lg overflow-hidden">
        <div className="bg-slate-800 px-4 py-2">
          <span className="text-xs text-slate-400">
            {className?.replace('language-', '')}
          </span>
        </div>
        <code className={`${className} block p-4 text-sm`} {...props}>
          {children}
        </code>
      </div>
    );
  },
}}
```

---

## 3. 状态管理策略

### 3.1 状态分层

```
┌─────────────────────────────────────────────────────────┐
│                    App (根组件)                          │
│   - steps: AgentStep[] (侧边栏显示)                      │
│   - isLoading: boolean                                   │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                 ChatInterface (主组件)                    │
│   - messages: Message[] (历史消息)                        │
│   - pendingAnswer: string (流式答案)                      │
│   - pendingSteps: AgentStep[] (实时步骤)                  │
│   - isTyping: boolean (打字机状态)                        │
│   - showScrollButton: boolean                            │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                 子组件 (纯展示)                           │
│   - StepsProcess: 接收 steps, isRunning                  │
│   - StreamingMarkdown: 接收 content, speed               │
│   - MarkdownRenderer: 接收 content                        │
└─────────────────────────────────────────────────────────┘
```

### 3.2 滚动控制状态机

```
┌─────────────────────────────────────────────────────────┐
│                    滚动控制逻辑                          │
│                                                         │
│   用户上翻                                               │
│      │                                                  │
│      ▼                                                  │
│   ┌──────────────┐                                      │
│   │ isAutoScroll │ = false                              │
│   │ = false      │                                      │
│   └──────┬───────┘                                      │
│          │                                              │
│          ▼                                              │
│   ┌──────────────┐    新内容到达     ┌──────────────┐  │
│   │ 显示滚动按钮 │─────────────────>│ 不自动滚动   │  │
│   └──────────────┘                  └──────────────┘  │
│          │                                              │
│          │ 点击按钮                                      │
│          ▼                                              │
│   ┌──────────────┐                                      │
│   │ 滚动到底部   │                                      │
│   │ isAutoScroll │ = true                               │
│   │ = true       │                                      │
│   └──────┬───────┘                                      │
│          │                                              │
│          ▼                                              │
│   ┌──────────────┐                                      │
│   │ 隐藏滚动按钮 │                                      │
│   │ 自动滚动     │                                      │
│   └──────────────┘                                      │
└─────────────────────────────────────────────────────────┘
```

---

## 4. 样式系统

### 4.1 Tailwind 配置

```javascript
// tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/typography'), // prose 样式
  ],
};
```

### 4.2 自定义样式

```css
/* index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Markdown 代码块样式 */
.prose pre {
  margin: 0;
  border-radius: 0.5rem;
}

.prose pre code {
  background: transparent;
  padding: 0;
}

.prose code {
  font-size: 0.875rem;
  line-height: 1.5;
}
```

### 4.3 颜色规范

| 元素 | 颜色 | Tailwind 类 |
|------|------|-------------|
| 用户消息气泡 | 蓝色 | `bg-blue-500` |
| 助手消息背景 | 浅灰 | `bg-slate-50` |
| 思考步骤 | 灰色 | `text-slate-600` |
| 工具调用 | 蓝色 | `bg-blue-50` |
| 观察结果 | 琥珀色 | `bg-amber-50` |
| 最终答案 | 绿色 | `bg-green-50` |
| 错误信息 | 红色 | `text-red-500` |

---

## 5. 动画效果

### 5.1 Framer Motion 使用

```typescript
// 消息进入动画
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.3 }}
>
  {content}
</motion.div>

// 加载动画
<motion.div
  className="h-2 w-2 rounded-full bg-blue-500"
  animate={{ y: [0, -6, 0] }}
  transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
/>

// 滚动按钮
<motion.button
  initial={{ opacity: 0, scale: 0.8 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 0.8 }}
>
```

### 5.2 CSS 动画

```typescript
// 打字机光标
<span className="inline-block w-0.5 h-4 bg-blue-500 animate-pulse" />

// 思考中动画
<motion.span
  animate={{ opacity: [0.5, 1, 0.5] }}
  transition={{ duration: 1.5, repeat: Infinity }}
>
  思考中...
</motion.span>
```

---

## 6. 性能优化

### 6.1 useCallback 使用

所有事件处理函数都使用 `useCallback` 包装，避免不必要的重渲染：

```typescript
const scrollToBottom = useCallback((smooth = true) => {
  // ...
}, []);

const handleScroll = useCallback(() => {
  // ...
}, [checkScrollPosition]);

const handleTypewriterComplete = useCallback(() => {
  // ...
}, []);
```

### 6.2 Ref 使用

使用 `useRef` 避免重渲染：

```typescript
const isAutoScrollRef = useRef(true);      // 自动滚动标志
const messagesEndRef = useRef<HTMLDivElement>(null);  // DOM 引用
const scrollContainerRef = useRef<HTMLDivElement>(null);
```

### 6.3 条件渲染

使用 `AnimatePresence` 优化动画性能：

```typescript
<AnimatePresence mode="popLayout">
  {messages.map((msg) => (
    <motion.div key={msg.id}>
      {/* ... */}
    </motion.div>
  ))}
</AnimatePresence>
```

---

## 7. 响应式设计

### 7.1 布局策略

```typescript
// 主布局 - 两栏，大屏幕显示侧边栏
<main className="mx-auto grid max-w-6xl gap-4 p-4 lg:grid-cols-[1fr_320px]">
  <ChatInterface />
  <AgentStatus />
</main>

// 聊天区域高度计算
<section className="flex h-[calc(100vh-8rem)] flex-col">
```

### 7.2 消息宽度限制

```typescript
// 用户消息 - 最大 85%
<div className="max-w-[85%]">

// 助手消息 - 最大 85%，包含步骤
<div className="max-w-[85%] space-y-2">
```

---

## 8. 无障碍支持

- 所有交互元素都有 `disabled` 状态
- 表单使用语义化标签
- 颜色对比度符合 WCAG 标准
- 键盘导航支持（Enter 提交）
- 滚动按钮有 `title` 属性

---

## 9. 已知问题与改进方向

| 问题 | 影响 | 解决方案 |
|------|------|----------|
| 大量消息时性能下降 | 滚动卡顿 | 虚拟列表 (react-window) |
| Markdown 渲染大型表格 | 布局错乱 | 表格懒加载 |
| 打字机效果偶现闪烁 | 视觉体验 | 使用 requestAnimationFrame |
| 移动端适配不足 | 小屏幕体验 | 响应式断点优化 |