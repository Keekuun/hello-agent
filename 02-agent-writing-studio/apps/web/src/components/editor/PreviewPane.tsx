"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { slateToMarkdown } from "@/lib/slate/markdown";
import type { EditorValue } from "@hello-agent/shared";

export function PreviewPane({ value }: { value: EditorValue }) {
  const md = slateToMarkdown(value);

  return (
    <article className="prose prose-zinc max-w-none p-6 overflow-y-auto h-full preview-prose">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
        {md}
      </ReactMarkdown>
    </article>
  );
}
