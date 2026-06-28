import { Editor, Element, Point, Range, Transforms } from "slate";
import { createBlockId } from "@hello-agent/shared";
import type { BlockElement, BlockType } from "@hello-agent/shared";
import { HEADING_TYPES, LIST_TYPES } from "./types";

const VOID_BLOCK_TYPES = new Set<BlockType>(["divider", "image"]);

export function selectAllDocument(editor: Editor) {
  Transforms.select(editor, {
    anchor: Editor.start(editor, []),
    focus: Editor.end(editor, []),
  });
}

export function shouldClearDocumentOnDelete(editor: Editor): boolean {
  const { selection } = editor;
  if (!selection || Range.isCollapsed(selection)) return false;

  const blockStart = Editor.start(editor, [0]);
  const blockEnd = Editor.end(editor, [editor.children.length - 1]);
  const [start, end] = Range.edges(selection);

  return Point.equals(start, blockStart) && Point.equals(end, blockEnd);
}

export function resetDocumentToEmptyParagraph(editor: Editor) {
  const emptyBlock: BlockElement = {
    id: createBlockId(),
    type: "paragraph",
    children: [{ text: "" }],
  };

  Editor.withoutNormalizing(editor, () => {
    while (editor.children.length > 0) {
      Transforms.removeNodes(editor, { at: [0] });
    }
    Transforms.insertNodes(editor, emptyBlock, { at: [0] });
  });

  Transforms.select(editor, Editor.start(editor, [0]));
}

export function withBlocks<T extends Editor>(editor: T): T {
  const { insertBreak, normalizeNode, isVoid } = editor;

  editor.isVoid = (element) => {
    const block = element as BlockElement;
    if (VOID_BLOCK_TYPES.has(block.type)) {
      return true;
    }
    return isVoid(element);
  };

  editor.insertBreak = () => {
    const [match] = Editor.nodes(editor, {
      match: (n) => Element.isElement(n) && Editor.isBlock(editor, n),
    });
    if (!match) {
      insertBreak();
      return;
    }
    const [node, path] = match;
    const block = node as BlockElement;
    if (block.type === "code-block") {
      insertBreak();
      return;
    }
    Transforms.splitNodes(editor, { always: true });
    const nextPath = [...path.slice(0, -1), path[path.length - 1] + 1];
    Transforms.setNodes(
      editor,
      { id: createBlockId(), type: "paragraph", children: [{ text: "" }] },
      { at: nextPath },
    );
  };

  editor.normalizeNode = (entry) => {
    const [node, path] = entry;
    if (Element.isElement(node) && Editor.isBlock(editor, node)) {
      const block = node as BlockElement;
      if (!block.id) {
        Transforms.setNodes(editor, { id: createBlockId() }, { at: path });
        return;
      }
    }
    normalizeNode(entry);
  };

  return editor;
}

export function setBlockType(editor: Editor, type: BlockType) {
  const [match] = Editor.nodes(editor, {
    match: (n) => Element.isElement(n) && Editor.isBlock(editor, n),
  });
  if (!match) return;
  const [, path] = match;
  const props: Partial<BlockElement> = { type };
  if (type === "list-item") {
    props.type = "list-item";
  }
  Transforms.setNodes(editor, props, { at: path });

  if (LIST_TYPES.includes(type as (typeof LIST_TYPES)[number])) {
    Transforms.wrapNodes(
      editor,
      { id: createBlockId(), type, children: [] } as BlockElement,
      { at: path },
    );
  }
}

export function insertBlock(editor: Editor, type: BlockType) {
  const block: BlockElement = {
    id: createBlockId(),
    type,
    children: [{ text: "" }],
  };
  if (type === "divider") {
    block.children = [{ text: "" }];
  }
  if (type === "image") {
    block.url = "";
    block.alt = "";
  }
  if (type === "code-block") {
    block.language = "typescript";
  }
  Transforms.insertNodes(editor, block);
}

export function toggleMark(
  editor: Editor,
  mark: "bold" | "italic" | "code" | "underline",
) {
  const marks = Editor.marks(editor);
  const active = marks?.[mark];
  if (active) {
    Editor.removeMark(editor, mark);
  } else {
    Editor.addMark(editor, mark, true);
  }
}

export function isBlockActive(editor: Editor, type: BlockType): boolean {
  const [match] = Editor.nodes(editor, {
    match: (n) => Element.isElement(n) && (n as BlockElement).type === type,
  });
  return !!match;
}

export function isMarkActive(
  editor: Editor,
  mark: "bold" | "italic" | "code",
): boolean {
  const marks = Editor.marks(editor);
  return !!marks?.[mark];
}

export function getHeadingLevel(type: BlockType): number | null {
  if (type === "heading-one") return 1;
  if (type === "heading-two") return 2;
  if (type === "heading-three") return 3;
  if (type === "heading-four") return 4;
  if (type === "heading-five") return 5;
  return null;
}

export { HEADING_TYPES, LIST_TYPES };
