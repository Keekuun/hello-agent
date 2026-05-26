"use client";

import type { BlockType } from "@hello-agent/shared";

const COMMANDS: { label: string; type: BlockType; hint: string }[] = [
  { label: "段落", type: "paragraph", hint: "正文" },
  { label: "标题 1", type: "heading-one", hint: "# " },
  { label: "标题 2", type: "heading-two", hint: "## " },
  { label: "标题 3", type: "heading-three", hint: "### " },
  { label: "无序列表", type: "bulleted-list", hint: "- " },
  { label: "有序列表", type: "numbered-list", hint: "1. " },
  { label: "引用", type: "blockquote", hint: "> " },
  { label: "代码块", type: "code-block", hint: "```" },
  { label: "分隔线", type: "divider", hint: "---" },
  { label: "图片", type: "image", hint: "url" },
];

export function SlashMenu({
  query,
  onSelect,
  onClose,
}: {
  query: string;
  onSelect: (type: BlockType) => void;
  onClose: () => void;
}) {
  const filtered = COMMANDS.filter(
    (c) =>
      c.label.includes(query) ||
      c.type.includes(query) ||
      query === "",
  );

  if (filtered.length === 0) return null;

  return (
    <div className="absolute z-50 bg-white border border-zinc-200 rounded-lg shadow-xl py-1 min-w-[200px]">
      {filtered.map((cmd) => (
        <button
          key={cmd.type}
          type="button"
          className="w-full text-left px-3 py-2 hover:bg-zinc-50 flex justify-between items-center"
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(cmd.type);
            onClose();
          }}
        >
          <span>{cmd.label}</span>
          <span className="text-xs text-zinc-400">{cmd.hint}</span>
        </button>
      ))}
    </div>
  );
}
