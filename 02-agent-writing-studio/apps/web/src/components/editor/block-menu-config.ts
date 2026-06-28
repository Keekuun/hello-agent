import type { BlockType } from "@hello-agent/shared";

export type BlockMenuIcon =
  | "text"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "bullet"
  | "numbered"
  | "code"
  | "quote"
  | "divider"
  | "image";

export interface BlockTypeOption {
  label: string;
  shortLabel: string;
  type: BlockType;
  icon: BlockMenuIcon;
}

export const BLOCK_TYPE_OPTIONS: BlockTypeOption[] = [
  { label: "正文", shortLabel: "T", type: "paragraph", icon: "text" },
  { label: "标题 1", shortLabel: "H1", type: "heading-one", icon: "h1" },
  { label: "标题 2", shortLabel: "H2", type: "heading-two", icon: "h2" },
  { label: "标题 3", shortLabel: "H3", type: "heading-three", icon: "h3" },
  { label: "标题 4", shortLabel: "H4", type: "heading-four", icon: "h4" },
  { label: "标题 5", shortLabel: "H5", type: "heading-five", icon: "h5" },
  { label: "无序列表", shortLabel: "•", type: "bulleted-list", icon: "bullet" },
  { label: "有序列表", shortLabel: "1.", type: "numbered-list", icon: "numbered" },
  { label: "代码块", shortLabel: "{}", type: "code-block", icon: "code" },
  { label: "引用", shortLabel: "❝", type: "blockquote", icon: "quote" },
  { label: "分隔线", shortLabel: "—", type: "divider", icon: "divider" },
  { label: "图片", shortLabel: "🖼", type: "image", icon: "image" },
];

export interface BlockActionItem {
  id: string;
  label: string;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
}

export const BLOCK_ACTION_ITEMS: BlockActionItem[] = [
  { id: "cut", label: "剪切", shortcut: "⌘X" },
  { id: "copy", label: "复制", shortcut: "⌘C" },
  { id: "duplicate", label: "复制块" },
  { id: "delete", label: "删除", shortcut: "Del", danger: true },
  { id: "add-below", label: "在下方添加", shortcut: "Enter" },
];

export const INSERT_QUICK_OPTIONS: BlockTypeOption[] = BLOCK_TYPE_OPTIONS.slice(
  0,
  8,
);
