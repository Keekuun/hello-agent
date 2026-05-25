import { describe, it, expect } from 'vitest';
import { normalizeMarkdown } from '../markdownNormalize';

describe('normalizeMarkdown', () => {
  it('removes orphaned bold markers before headings', () => {
    expect(normalizeMarkdown('** ### 快速排序研究报告')).toBe('### 快速排序研究报告');
  });

  it('keeps valid markdown unchanged', () => {
    const input = '### 标题\n\n**分治法** 是核心思想';
    expect(normalizeMarkdown(input)).toBe(input);
  });
});
