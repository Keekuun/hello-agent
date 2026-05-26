"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import type { EditorValue } from "@hello-agent/shared";
import { exportMarkdown, slateToHtml } from "@/lib/slate/markdown";
import { SlateEditor } from "./SlateEditor";
import { PreviewPane } from "./PreviewPane";
import { DocumentMetaPanel } from "./DocumentMetaPanel";
import { AiPanel } from "@/components/ai/AiPanel";
import type { DocumentStatus } from "@hello-agent/shared";

type ViewMode = "edit" | "split" | "preview";

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
  };
  userName: string;
}) {
  const [content, setContent] = useState<EditorValue>(
    initialDoc.content as EditorValue,
  );
  const [title, setTitle] = useState(initialDoc.title);
  const [viewMode, setViewMode] = useState<ViewMode>("split");
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
    <div className="h-screen flex flex-col bg-white">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-zinc-200 shrink-0">
        <Link href="/" className="text-zinc-500 hover:text-zinc-800 text-sm">
          ← 文档
        </Link>
        <input
          className="flex-1 text-lg font-semibold outline-none"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveMeta}
        />
        <div className="flex gap-1 text-sm">
          {(["edit", "split", "preview"] as ViewMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setViewMode(m)}
              className={`px-2 py-1 rounded ${
                viewMode === m ? "bg-zinc-900 text-white" : "hover:bg-zinc-100"
              }`}
            >
              {m === "edit" ? "编辑" : m === "split" ? "分屏" : "预览"}
            </button>
          ))}
        </div>
        <Link
          href={`/doc/${documentId}/preview`}
          className="text-sm text-zinc-600 hover:underline"
        >
          阅读模式
        </Link>
        <button type="button" onClick={exportMd} className="text-sm px-2 py-1 border rounded">
          导出 MD
        </button>
        <button type="button" onClick={exportHtml} className="text-sm px-2 py-1 border rounded">
          导出 HTML
        </button>
        <button type="button" onClick={copyMd} className="text-sm px-2 py-1 border rounded">
          复制 MD
        </button>
      </header>

      <div className="flex-1 flex min-h-0">
        {(viewMode === "edit" || viewMode === "split") && (
          <div
            className={`${viewMode === "split" ? "w-1/2 border-r" : "w-full"} flex flex-col min-h-0`}
          >
            <SlateEditor
              documentId={documentId}
              initialValue={content}
              onChange={setContent}
              onSave={saveContent}
              highlightedBlockIds={highlightedIds}
              userName={userName}
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
