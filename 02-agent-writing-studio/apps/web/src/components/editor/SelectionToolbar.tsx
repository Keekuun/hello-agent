"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Editor, Range } from "slate";
import { ReactEditor, useComposing, useFocused, useSlate } from "slate-react";
import { isMarkActive, toggleMark } from "@/lib/slate/plugins";

export function SelectionToolbar() {
  const editor = useSlate();
  const focused = useFocused();
  const isComposing = useComposing();
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(
    null,
  );

  useEffect(() => {
    if (
      isComposing ||
      ReactEditor.isComposing?.(editor) ||
      !focused ||
      !editor.selection ||
      Range.isCollapsed(editor.selection) ||
      !ReactEditor.isFocused(editor)
    ) {
      setPosition(null);
      return;
    }

    const domSelection = window.getSelection();
    if (!domSelection || domSelection.rangeCount === 0) {
      setPosition(null);
      return;
    }

    const domRange = domSelection.getRangeAt(0);
    const rect = domRange.getBoundingClientRect();
    if (!rect.width && !rect.height) {
      setPosition(null);
      return;
    }

    const toolbarWidth = ref.current?.offsetWidth ?? 220;
    setPosition({
      top: rect.top + window.scrollY - 48,
      left: rect.left + window.scrollX + rect.width / 2 - toolbarWidth / 2,
    });
  }, [editor, editor.selection, focused, isComposing]);

  if (!position || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={ref}
      className="fixed z-50 flex items-center gap-0.5 rounded-lg border border-zinc-200 bg-white px-1 py-1 shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
      style={{ top: position.top, left: Math.max(8, position.left) }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <MarkButton mark="bold" label="B" className="font-bold" />
      <MarkButton mark="italic" label="I" className="italic" />
      <MarkButton mark="code" label="</>" className="font-mono text-xs" />
      <div className="mx-1 h-4 w-px bg-zinc-200" />
      <MarkButton mark="underline" label="U" className="underline" />
    </div>,
    document.body,
  );
}

function MarkButton({
  mark,
  label,
  className,
}: {
  mark: "bold" | "italic" | "code" | "underline";
  label: string;
  className?: string;
}) {
  const editor = useSlate();
  const active =
    mark === "underline"
      ? !!Editor.marks(editor)?.underline
      : isMarkActive(editor, mark as "bold" | "italic" | "code");

  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        toggleMark(editor, mark);
      }}
      className={`min-w-[28px] rounded-md px-2 py-1 text-sm transition-colors ${className ?? ""} ${
        active ? "bg-[#3370ff] text-white" : "text-zinc-700 hover:bg-zinc-100"
      }`}
    >
      {label}
    </button>
  );
}
