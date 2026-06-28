"use client";

import { createPortal } from "react-dom";
import type { BlockType } from "@hello-agent/shared";
import {
  BLOCK_ACTION_ITEMS,
  BLOCK_TYPE_OPTIONS,
  type BlockMenuIcon,
} from "./block-menu-config";
import type { BlockMenuAnchor } from "./EditorChromeContext";

function BlockTypeIcon({ icon }: { icon: BlockMenuIcon }) {
  const base =
    "flex h-8 w-8 items-center justify-center rounded-md text-[13px] font-medium";
  switch (icon) {
    case "text":
      return <span className={`${base} bg-blue-50 text-blue-600`}>T</span>;
    case "h1":
      return <span className={`${base} bg-zinc-100 text-zinc-700`}>H1</span>;
    case "h2":
      return <span className={`${base} bg-zinc-100 text-zinc-700`}>H2</span>;
    case "h3":
      return <span className={`${base} bg-zinc-100 text-zinc-700`}>H3</span>;
    case "h4":
      return <span className={`${base} bg-zinc-100 text-zinc-700`}>H4</span>;
    case "h5":
      return <span className={`${base} bg-zinc-100 text-zinc-700`}>H5</span>;
    case "bullet":
      return <span className={`${base} bg-zinc-100 text-zinc-700`}>•</span>;
    case "numbered":
      return <span className={`${base} bg-zinc-100 text-zinc-700`}>1.</span>;
    case "code":
      return <span className={`${base} bg-zinc-100 text-zinc-700 font-mono`}>{"{}"}</span>;
    case "quote":
      return <span className={`${base} bg-zinc-100 text-zinc-700`}>❝</span>;
    case "divider":
      return <span className={`${base} bg-zinc-100 text-zinc-700`}>—</span>;
    case "image":
      return <span className={`${base} bg-zinc-100 text-zinc-700`}>🖼</span>;
    default:
      return null;
  }
}

export function BlockMenu({
  anchor,
  activeType,
  onSelectType,
  onAction,
  onClose,
}: {
  anchor: BlockMenuAnchor;
  activeType: BlockType;
  onSelectType: (type: BlockType) => void;
  onAction: (actionId: string) => void;
  onClose: () => void;
}) {
  if (typeof document === "undefined") return null;

  const top = anchor.rect.top;
  const left = Math.max(16, anchor.rect.left - 280);

  return createPortal(
    <>
      <button
        type="button"
        aria-label="关闭菜单"
        className="fixed inset-0 z-40 cursor-default"
        onClick={onClose}
      />
      <div
        className="fixed z-50 w-[272px] rounded-xl border border-zinc-200 bg-white py-3 shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
        style={{ top, left }}
        onMouseDown={(e) => e.preventDefault()}
      >
        <div className="grid grid-cols-5 gap-1 px-3 pb-2 border-b border-zinc-100">
          {BLOCK_TYPE_OPTIONS.map((option) => (
            <button
              key={option.type}
              type="button"
              title={option.label}
              onClick={() => onSelectType(option.type)}
              className={`flex flex-col items-center gap-1 rounded-lg px-1 py-1.5 transition-colors ${
                activeType === option.type
                  ? "bg-blue-50 ring-1 ring-blue-200"
                  : "hover:bg-zinc-50"
              }`}
            >
              <BlockTypeIcon icon={option.icon} />
              <span className="text-[10px] text-zinc-500">{option.shortLabel}</span>
            </button>
          ))}
        </div>

        <div className="py-1">
          {BLOCK_ACTION_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={item.disabled}
              onClick={() => onAction(item.id)}
              className={`flex w-full items-center justify-between px-4 py-2 text-sm transition-colors disabled:opacity-40 ${
                item.danger
                  ? "text-red-600 hover:bg-red-50"
                  : "text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              <span>{item.label}</span>
              {item.shortcut && (
                <span className="text-xs text-zinc-400">{item.shortcut}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </>,
    document.body,
  );
}
