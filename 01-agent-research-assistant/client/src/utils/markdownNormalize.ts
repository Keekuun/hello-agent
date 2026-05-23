/**
 * 修正 LLM 常见的 Markdown 格式问题。
 * 例如标题前误输出的孤立 **："** ### 标题" -> "### 标题"
 */
export function normalizeMarkdown(text: string): string {
  return text.replace(/^\s*\*\*\s+(?=#{1,6}\s)/, '');
}
