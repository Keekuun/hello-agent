"use client";

import { useSlate } from "slate-react";
import { isMarkActive, toggleMark } from "@/lib/slate/plugins";

export function FloatingToolbar() {
  const editor = useSlate();

  return (
    <div className="flex gap-1 bg-white border border-zinc-200 shadow-lg rounded-lg p-1">
      <ToolbarButton
        active={isMarkActive(editor, "bold")}
        onClick={() => toggleMark(editor, "bold")}
        label="B"
      />
      <ToolbarButton
        active={isMarkActive(editor, "italic")}
        onClick={() => toggleMark(editor, "italic")}
        label="I"
      />
      <ToolbarButton
        active={isMarkActive(editor, "code")}
        onClick={() => toggleMark(editor, "code")}
        label="</>"
      />
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={`px-2 py-1 text-sm rounded ${
        active ? "bg-zinc-900 text-white" : "hover:bg-zinc-100"
      }`}
    >
      {label}
    </button>
  );
}
