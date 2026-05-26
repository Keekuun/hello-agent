import type { EditorValue } from "./types.js";

export function createBlockId(): string {
  return crypto.randomUUID();
}

export const EMPTY_EDITOR_VALUE: EditorValue = [
  {
    id: createBlockId(),
    type: "heading-one",
    children: [{ text: "无标题文档" }],
  },
  {
    id: createBlockId(),
    type: "paragraph",
    children: [{ text: "开始写作，输入 / 插入块类型。" }],
  },
];

export function createEmptyDocument(title = "无标题文档"): EditorValue {
  return [
    {
      id: createBlockId(),
      type: "heading-one",
      children: [{ text: title }],
    },
    {
      id: createBlockId(),
      type: "paragraph",
      children: [{ text: "" }],
    },
  ];
}
