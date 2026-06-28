"use client";

import { createContext, useContext } from "react";
import type { Path } from "slate";

export type BlockMenuAnchor = {
  blockId: string;
  path: Path;
  rect: DOMRect;
};

export type InsertMenuAnchor = {
  path: Path;
  rect: DOMRect;
};

type EditorChromeContextValue = {
  highlightedBlockIds: string[];
  openBlockMenu: (anchor: BlockMenuAnchor) => void;
  openInsertMenu: (anchor: InsertMenuAnchor) => void;
};

export const EditorChromeContext = createContext<EditorChromeContextValue | null>(
  null,
);

export function useEditorChrome() {
  const ctx = useContext(EditorChromeContext);
  if (!ctx) {
    throw new Error("useEditorChrome must be used within SlateEditor");
  }
  return ctx;
}
