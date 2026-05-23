import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { normalizeMarkdown } from '../utils/markdownNormalize';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        h1: ({ children }) => (
          <h1 className="mb-3 mt-4 text-2xl font-bold text-slate-900">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="mb-2 mt-3 text-xl font-semibold text-slate-800">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="mb-2 mt-2 text-lg font-medium text-slate-700">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="mb-2 leading-relaxed text-slate-700">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="mb-2 ml-4 list-disc space-y-1 text-slate-700">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-2 ml-4 list-decimal space-y-1 text-slate-700">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="leading-relaxed">{children}</li>
        ),
        blockquote: ({ children }) => (
          <blockquote className="mb-2 border-l-4 border-blue-400 bg-blue-50 py-2 pl-4 italic text-slate-600">
            {children}
          </blockquote>
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
          return (
            <div className="mb-3 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between bg-slate-800 px-4 py-2">
                <span className="text-xs text-slate-400">
                  {className?.replace('language-', '') || 'code'}
                </span>
              </div>
              <code className={`${className} block overflow-x-auto p-4 text-sm`} {...props}>
                {children}
              </code>
            </div>
          );
        },
        table: ({ children }) => (
          <div className="mb-3 overflow-x-auto">
            <table className="w-full border-collapse border border-slate-300">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-slate-100">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="border border-slate-300 px-4 py-2 text-left font-semibold text-slate-700">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border border-slate-300 px-4 py-2 text-slate-600">{children}</td>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline hover:text-blue-800"
          >
            {children}
          </a>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-slate-900">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-slate-600">{children}</em>
        ),
        hr: () => <hr className="my-4 border-slate-200" />,
      }}
    >
      {normalizeMarkdown(content)}
    </ReactMarkdown>
  );
}