"use client";

import { memo, useCallback } from "react";
import type { RenderElementProps } from "slate-react";
import { ReactEditor, useSlateStatic } from "slate-react";
import type { BlockElement } from "@hello-agent/shared";
import { useEditorChrome } from "./EditorChromeContext";
import { ElementContent } from "./ElementContent";

function BlockWrapperInner({
  attributes,
  children,
  element,
}: RenderElementProps) {
  const editor = useSlateStatic();
  const { highlightedBlockIds, openBlockMenu, openInsertMenu } = useEditorChrome();
  const block = element as BlockElement;
  const isListContainer =
    block.type === "bulleted-list" || block.type === "numbered-list";

  const openMenu = useCallback(
    (target: HTMLElement) => {
      openBlockMenu({
        blockId: block.id,
        path: ReactEditor.findPath(editor, element),
        rect: target.getBoundingClientRect(),
      });
    },
    [block.id, editor, element, openBlockMenu],
  );

  const openInsert = useCallback(
    (target: HTMLElement) => {
      openInsertMenu({
        path: ReactEditor.findPath(editor, element),
        rect: target.getBoundingClientRect(),
      });
    },
    [editor, element, openInsertMenu],
  );

  return (
    <ElementContent
      attributes={attributes}
      element={block}
      highlighted={highlightedBlockIds.includes(block.id)}
      showGutter={!isListContainer}
      onOpenMenu={isListContainer ? undefined : openMenu}
      onOpenInsert={isListContainer ? undefined : openInsert}
    >
      {children}
    </ElementContent>
  );
}

export const BlockWrapper = memo(BlockWrapperInner);
