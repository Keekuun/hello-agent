export interface ExportableMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export function buildMarkdownExport(messages: ExportableMessage[]): string {
  return messages
    .map((msg) => {
      const time = new Date(msg.timestamp).toLocaleString('zh-CN');
      const title = msg.role === 'user' ? '用户' : '助手';
      return `## ${title}\n*${time}*\n\n${msg.content}\n`;
    })
    .join('\n---\n\n');
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildPrintableHtml(messages: ExportableMessage[], title = '对话记录'): string {
  const body = messages
    .map((msg) => {
      const roleLabel = msg.role === 'user' ? '用户' : '助手';
      const time = new Date(msg.timestamp).toLocaleString('zh-CN');
      return `
      <section class="message ${msg.role}">
        <header>
          <strong>${roleLabel}</strong>
          <time>${escapeHtml(time)}</time>
        </header>
        <pre>${escapeHtml(msg.content)}</pre>
      </section>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: "PingFang SC", "Noto Sans SC", sans-serif; color: #0f172a; margin: 32px; line-height: 1.6; }
    h1 { font-size: 20px; margin-bottom: 24px; }
    .message { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; page-break-inside: avoid; }
    .message.user { background: #eff6ff; }
    .message.assistant { background: #f8fafc; }
    header { display: flex; justify-content: space-between; font-size: 12px; color: #64748b; margin-bottom: 8px; }
    pre { white-space: pre-wrap; word-break: break-word; margin: 0; font-family: inherit; font-size: 14px; }
    @media print {
      body { margin: 12mm; }
      .message { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  ${body}
</body>
</html>`;
}

export function downloadTextFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** 打开打印预览窗口，用户可另存为 PDF */
export function openPrintablePdf(messages: ExportableMessage[], title?: string): boolean {
  const exportTitle = title || `对话记录_${new Date().toLocaleDateString('zh-CN')}`;
  const html = buildPrintableHtml(messages, exportTitle);
  const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');

  if (!printWindow) {
    return false;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();

  // 等样式就绪后再调起打印对话框
  printWindow.onload = () => {
    printWindow.print();
  };
  // 部分浏览器 onload 可能已触发，补一次延迟调用
  setTimeout(() => {
    try {
      printWindow.print();
    } catch {
      // ignore
    }
  }, 250);

  return true;
}
