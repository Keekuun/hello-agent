"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import type { EditorValue } from "@hello-agent/shared";
import { exportMarkdown, slateToHtml } from "@/lib/slate/markdown";
import { NewDocumentButton } from "@/components/NewDocumentButton";
import { SlateEditor } from "./SlateEditor";
import { PreviewPane } from "./PreviewPane";
import { DocumentMetaPanel } from "./DocumentMetaPanel";
import { AiPanel } from "@/components/ai/AiPanel";
import type { DocumentStatus } from "@hello-agent/shared";

type ViewMode = "edit" | "split" | "preview";

function formatUpdatedAt(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
  }) + "修改";
}

export function DocumentWorkspace({
  documentId,
  initialDoc,
  userName,
}: {
  documentId: string;
  initialDoc: {
    title: string;
    slug: string;
    status: DocumentStatus;
    description: string | null;
    coverUrl: string | null;
    tags: string[];
    content: EditorValue;
    updatedAt: Date | string;
  };
  userName: string;
}) {
  const [content, setContent] = useState<EditorValue>(
    initialDoc.content as EditorValue,
  );
  const [title, setTitle] = useState(initialDoc.title);
  const [viewMode, setViewMode] = useState<ViewMode>("edit");
  const [meta, setMeta] = useState({
    slug: initialDoc.slug,
    status: initialDoc.status,
    description: initialDoc.description ?? "",
    coverUrl: initialDoc.coverUrl ?? "",
    tags: initialDoc.tags.join(", "),
  });
  const [highlightedIds, setHighlightedIds] = useState<string[]>([]);
  const snapshotRef = useRef<EditorValue | null>(null);

  const saveContent = useCallback(
    async (value: EditorValue) => {
      await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: value }),
      });
    },
    [documentId],
  );

  const saveMeta = async () => {
    await fetch(`/api/documents/${documentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        slug: meta.slug,
        status: meta.status,
        description: meta.description || null,
        coverUrl: meta.coverUrl || null,
        tags: meta.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      }),
    });
  };

  const handleAiPatches = (patches: {
    content?: EditorValue;
    title?: string;
    highlightIds?: string[];
  }) => {
    if (!snapshotRef.current) snapshotRef.current = content;
    if (patches.content) setContent(patches.content);
    if (patches.title) setTitle(patches.title);
    if (patches.highlightIds) {
      setHighlightedIds(patches.highlightIds);
      setTimeout(() => setHighlightedIds([]), 3000);
    }
    if (patches.content) saveContent(patches.content);
  };

  const revertAi = () => {
    if (snapshotRef.current) {
      setContent(snapshotRef.current);
      saveContent(snapshotRef.current);
      snapshotRef.current = null;
    }
  };

  const exportMd = () => {
    const md = exportMarkdown(content, {
      title,
      slug: meta.slug,
      description: meta.description,
      tags: meta.tags.split(",").map((t) => t.trim()).filter(Boolean),
      coverUrl: meta.coverUrl || null,
    });
    downloadFile(`${meta.slug || "document"}.md`, md, "text/markdown");
  };

  const exportHtml = () => {
    const html = slateToHtml(content);
    downloadFile(`${meta.slug || "document"}.html`, html, "text/html");
  };

  const copyMd = async () => {
    const md = exportMarkdown(content, {
      title,
      slug: meta.slug,
      description: meta.description,
      tags: meta.tags.split(",").map((t) => t.trim()).filter(Boolean),
      coverUrl: meta.coverUrl || null,
    });
    await navigator.clipboard.writeText(md);
  };

  return (
    <div className="flex h-screen flex-col bg-[#f5f6f7]">
      <header className="flex shrink-0 items-center gap-3 border-b border-zinc-200/80 bg-white px-4 py-2.5">
        <Link
          href="/"
          className="rounded-md px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
        >
          ← 文档列表
        </Link>
        <NewDocumentButton>新建</NewDocumentButton>
        <div className="flex-1" />
        <div className="flex gap-1 rounded-lg bg-zinc-100 p-0.5 text-sm">
          {(["edit", "split", "preview"] as ViewMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setViewMode(m)}
              className={`rounded-md px-3 py-1 transition-colors ${
                viewMode === m
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {m === "edit" ? "编辑" : m === "split" ? "分屏" : "预览"}
            </button>
          ))}
        </div>
        <Link
          href={`/doc/${documentId}/preview`}
          className="text-sm text-zinc-500 hover:text-zinc-800"
        >
          阅读
        </Link>
        <details className="relative">
          <summary className="cursor-pointer list-none rounded-md border border-zinc-200 px-3 py-1 text-sm text-zinc-600 hover:bg-zinc-50">
            更多
          </summary>
          <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
            <button type="button" onClick={exportMd} className="block w-full px-3 py-2 text-left text-sm hover:bg-zinc-50">
              导出 Markdown
            </button>
            <button type="button" onClick={exportHtml} className="block w-full px-3 py-2 text-left text-sm hover:bg-zinc-50">
              导出 HTML
            </button>
            <button type="button" onClick={copyMd} className="block w-full px-3 py-2 text-left text-sm hover:bg-zinc-50">
              复制 Markdown
            </button>
          </div>
        </details>
      </header>

      <div className="flex min-h-0 flex-1">
        {(viewMode === "edit" || viewMode === "split") && (
          <div
            className={`flex min-h-0 flex-col bg-white ${
              viewMode === "split" ? "w-1/2 border-r border-zinc-200" : "w-full"
            }`}
          >
            <div className="border-b border-zinc-100 px-16 pt-8 pb-2">
              <input
                className="w-full border-none bg-transparent text-[34px] font-semibold leading-tight text-zinc-900 outline-none placeholder:text-zinc-300"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={saveMeta}
                placeholder="无标题文档"
              />
            </div>
            <SlateEditor
              key={documentId}
              documentId={documentId}
              initialValue={initialDoc.content as EditorValue}
              onChange={setContent}
              onSave={saveContent}
              highlightedBlockIds={highlightedIds}
              userName={userName}
              updatedAt={formatUpdatedAt(initialDoc.updatedAt)}
            />
          </div>
        )}
        {(viewMode === "preview" || viewMode === "split") && (
          <div className={`${viewMode === "split" ? "w-1/2" : "w-full"} min-h-0 bg-zinc-50`}>
            <PreviewPane value={content} />
          </div>
        )}
        <aside className="w-80 border-l border-zinc-200 flex flex-col shrink-0 min-h-0">
          <DocumentMetaPanel
            meta={meta}
            onChange={(patch) => setMeta((m) => ({ ...m, ...patch }))}
          />
          <button
            type="button"
            className="mx-4 mb-2 text-sm border rounded py-1"
            onClick={saveMeta}
          >
            保存元数据
          </button>
          <AiPanel
            documentId={documentId}
            content={content}
            title={title}
            onApply={handleAiPatches}
            onRevert={revertAi}
            canRevert={!!snapshotRef.current}
          />
        </aside>
      </div>
    </div>
  );
}

function downloadFile(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
