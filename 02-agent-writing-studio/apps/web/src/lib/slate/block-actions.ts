import { Editor, Element, Path, Transforms } from "slate";
import { createBlockId } from "@hello-agent/shared";
import type { BlockElement, BlockType } from "@hello-agent/shared";
import { setBlockType } from "./plugins";

function createBlock(type: BlockType): BlockElement {
  const block: BlockElement = {
    id: createBlockId(),
    type,
    children: [{ text: "" }],
  };
  if (type === "divider") block.children = [{ text: "" }];
  if (type === "image") {
    block.url = "";
    block.alt = "";
  }
  if (type === "code-block") block.language = "typescript";
  return block;
}

export function getTopLevelBlockPath(editor: Editor, path: number[]): number[] {
  return [path[0]];
}

export function setBlockTypeAt(editor: Editor, path: number[], type: BlockType) {
  Transforms.select(editor, Editor.start(editor, path));
  setBlockType(editor, type);
}

export function deleteBlockAt(editor: Editor, path: number[]) {
  const topPath = getTopLevelBlockPath(editor, path);
  if (editor.children.length <= 1) {
    Transforms.setNodes(
      editor,
      { id: createBlockId(), type: "paragraph", children: [{ text: "" }] },
      { at: topPath },
    );
    return;
  }
  Transforms.removeNodes(editor, { at: topPath });
}

export function insertBlockAfter(
  editor: Editor,
  path: number[],
  type: BlockType = "paragraph",
) {
  const topPath = getTopLevelBlockPath(editor, path);
  const insertPath = Path.next(topPath);
  Transforms.insertNodes(editor, createBlock(type), { at: insertPath });
  Transforms.select(editor, Editor.start(editor, insertPath));
}

export function duplicateBlockAt(editor: Editor, path: number[]) {
  const topPath = getTopLevelBlockPath(editor, path);
  const [node] = Editor.node(editor, topPath);
  if (!Element.isElement(node)) return;
  const clone: BlockElement = {
    ...(node as BlockElement),
    id: createBlockId(),
  };
  Transforms.insertNodes(editor, clone, { at: Path.next(topPath) });
}

export async function copyBlockAt(editor: Editor, path: number[]) {
  const topPath = getTopLevelBlockPath(editor, path);
  const text = Editor.string(editor, topPath);
  await navigator.clipboard.writeText(text);
}

export async function cutBlockAt(editor: Editor, path: number[]) {
  await copyBlockAt(editor, path);
  deleteBlockAt(editor, path);
}

export function getBlockTypeAt(editor: Editor, path: number[]): BlockType {
  const topPath = getTopLevelBlockPath(editor, path);
  const [node] = Editor.node(editor, topPath);
  if (Element.isElement(node)) {
    return (node as BlockElement).type;
  }
  return "paragraph";
}
