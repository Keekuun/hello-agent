import { describe, it, expect } from 'vitest';
import {
  buildMarkdownExport,
  buildPrintableHtml,
  escapeHtml,
} from '../exportConversation';

describe('exportConversation', () => {
  const messages = [
    {
      role: 'user' as const,
      content: '什么是 ReAct？',
      timestamp: '2026-01-01T10:00:00.000Z',
    },
    {
      role: 'assistant' as const,
      content: 'ReAct = Reasoning + Acting',
      timestamp: '2026-01-01T10:00:05.000Z',
    },
  ];

  it('builds markdown export', () => {
    const md = buildMarkdownExport(messages);
    expect(md).toContain('## 用户');
    expect(md).toContain('什么是 ReAct？');
    expect(md).toContain('## 助手');
    expect(md).toContain('ReAct = Reasoning + Acting');
  });

  it('escapes html entities', () => {
    expect(escapeHtml(`<script>alert("x")</script>`)).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'
    );
  });

  it('builds printable html with escaped content', () => {
    const html = buildPrintableHtml(
      [
        {
          role: 'user',
          content: '<b>注入</b>',
          timestamp: '2026-01-01T10:00:00.000Z',
        },
      ],
      '测试导出'
    );

    expect(html).toContain('测试导出');
    expect(html).toContain('&lt;b&gt;注入&lt;/b&gt;');
    expect(html).not.toContain('<b>注入</b>');
  });
});
