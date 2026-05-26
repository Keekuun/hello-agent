"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "ai/react";
import type { EditorValue } from "@hello-agent/shared";
import { buildOutline } from "@/lib/slate/outline";

export function AiPanel({
  documentId,
  content,
  title,
  onApply,
  onRevert,
  canRevert,
}: {
  documentId: string;
  content: EditorValue;
  title: string;
  onApply: (patches: {
    content?: EditorValue;
    title?: string;
    highlightIds?: string[];
  }) => void;
  onRevert: () => void;
  canRevert: boolean;
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const outline = buildOutline(content);

  const { messages, input, setInput, handleSubmit, isLoading } = useChat({
    api: "/api/ai/chat",
    body: { documentId, selectedBlockIds: selectedIds },
    onFinish: () => {
      fetch(`/api/documents/${documentId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.document?.content) {
            onApply({ content: data.document.content });
          }
        });
      router.refresh();
    },
  });

  const runLocalAction = async (
    action: "polish" | "expand" | "outline",
  ) => {
    const targetIds =
      selectedIds.length > 0
        ? selectedIds
        : content.filter((b) => b.type === "paragraph").slice(0, 1).map((b) => b.id);

    if (action === "outline") {
      const res = await fetch("/api/ai/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId,
          insert: {
            afterBlockId: content[content.length - 1]?.id ?? targetIds[0],
            blocks: [
              {
                id: crypto.randomUUID(),
                type: "heading-two",
                children: [{ text: "大纲" }],
              },
              {
                id: crypto.randomUUID(),
                type: "paragraph",
                children: [{ text: "• 要点一" }],
              },
              {
                id: crypto.randomUUID(),
                type: "paragraph",
                children: [{ text: "• 要点二" }],
              },
            ],
          },
        }),
      });
      const data = await res.json();
      if (data.content) onApply({ content: data.content, highlightIds: data.highlightIds });
      return;
    }

    const blocks = content.filter((b) => targetIds.includes(b.id));
    const text = blocks
      .map((b) => (b.children as { text: string }[]).map((c) => c.text).join(""))
      .join("\n");

    const prompt =
      action === "polish"
        ? `润色以下段落，保持原意，输出简洁中文：\n${text}`
        : `扩写以下段落，增加细节与例子：\n${text}`;

    const res = await fetch("/api/ai/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId,
        replace: {
          blockIds: targetIds,
          blocks: blocks.map((b) => ({
            ...b,
            children: [{ text: `${text}（${action === "polish" ? "已润色" : "已扩写"}）` }],
          })),
        },
      }),
    });
    const data = await res.json();
    if (data.content) onApply({ content: data.content, highlightIds: data.highlightIds });

    void fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId, message: prompt, selectedBlockIds: targetIds }),
    });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 border-t border-zinc-100">
      <div className="p-3 border-b border-zinc-100">
        <h3 className="font-medium text-sm text-zinc-700 mb-2">AI 写作助手</h3>
        <div className="flex flex-wrap gap-1">
          <QuickBtn label="润色选中" onClick={() => runLocalAction("polish")} />
          <QuickBtn label="扩写选中" onClick={() => runLocalAction("expand")} />
          <QuickBtn label="插入提纲" onClick={() => runLocalAction("outline")} />
          {canRevert && (
            <QuickBtn label="撤销 AI" onClick={onRevert} variant="danger" />
          )}
        </div>
      </div>

      <div className="px-3 py-2 text-xs text-zinc-500 max-h-24 overflow-y-auto">
        <p className="mb-1">点击大纲项选中块：</p>
        {outline.map((n) => (
          <button
            key={n.id}
            type="button"
            className={`block w-full text-left truncate py-0.5 ${
              selectedIds.includes(n.id) ? "text-blue-600 font-medium" : ""
            }`}
            onClick={() =>
              setSelectedIds((ids) =>
                ids.includes(n.id)
                  ? ids.filter((i) => i !== n.id)
                  : [...ids, n.id],
              )
            }
          >
            {"#".repeat(n.level)} {n.text || "(空)"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`rounded-lg px-2 py-1 ${
              m.role === "user" ? "bg-zinc-100 ml-4" : "bg-blue-50 mr-4"
            }`}
          >
            {m.content}
          </div>
        ))}
        {isLoading && <p className="text-zinc-400">思考中…</p>}
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t border-zinc-100">
        <textarea
          className="w-full border border-zinc-200 rounded-lg px-2 py-1 text-sm resize-none"
          rows={2}
          placeholder="描述你想要的修改…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          type="submit"
          disabled={isLoading}
          className="mt-2 w-full bg-zinc-900 text-white text-sm py-2 rounded-lg disabled:opacity-50"
        >
          发送
        </button>
      </form>
    </div>
  );
}

function QuickBtn({
  label,
  onClick,
  variant = "default",
}: {
  label: string;
  onClick: () => void;
  variant?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs px-2 py-1 rounded border ${
        variant === "danger"
          ? "border-red-200 text-red-600"
          : "border-zinc-200 hover:bg-zinc-50"
      }`}
    >
      {label}
    </button>
  );
}
