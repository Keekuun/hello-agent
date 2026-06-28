"use client";

import { createPortal } from "react-dom";
import type { BlockType } from "@hello-agent/shared";
import { INSERT_QUICK_OPTIONS } from "./block-menu-config";
import type { InsertMenuAnchor } from "./EditorChromeContext";

export function InsertBlockMenu({
  anchor,
  onSelect,
  onClose,
}: {
  anchor: InsertMenuAnchor;
  onSelect: (type: BlockType) => void;
  onClose: () => void;
}) {
  if (typeof document === "undefined") return null;

  const top = anchor.rect.bottom + 6;
  const left = Math.max(16, anchor.rect.left - 8);

  return createPortal(
    <>
      <button
        type="button"
        aria-label="关闭插入菜单"
        className="fixed inset-0 z-40 cursor-default"
        onClick={onClose}
      />
      <div
        className="fixed z-50 w-52 rounded-xl border border-zinc-200 bg-white py-2 shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
        style={{ top, left }}
        onMouseDown={(e) => e.preventDefault()}
      >
        <p className="px-3 pb-1 text-xs text-zinc-400">在下方插入</p>
        {INSERT_QUICK_OPTIONS.map((option) => (
          <button
            key={option.type}
            type="button"
            onClick={() => onSelect(option.type)}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded bg-zinc-100 text-xs">
              {option.shortLabel}
            </span>
            {option.label}
          </button>
        ))}
      </div>
    </>,
    document.body,
  );
}
