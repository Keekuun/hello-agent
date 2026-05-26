export type DocumentStatus = "draft" | "published" | "archived";

export type BlockType =
  | "paragraph"
  | "heading-one"
  | "heading-two"
  | "heading-three"
  | "bulleted-list"
  | "numbered-list"
  | "list-item"
  | "blockquote"
  | "code-block"
  | "divider"
  | "image";

export interface CustomText {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  underline?: boolean;
}

export interface BlockElement {
  id: string;
  type: BlockType;
  children: CustomText[] | BlockElement[];
  language?: string;
  url?: string;
  alt?: string;
}

export type EditorValue = BlockElement[];

export interface DocumentMeta {
  id: string;
  title: string;
  slug: string;
  status: DocumentStatus;
  description: string | null;
  coverUrl: string | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentOutlineNode {
  id: string;
  type: BlockType;
  text: string;
  level: number;
  children?: DocumentOutlineNode[];
}

export interface AiDocumentPatch {
  kind: "insert" | "replace" | "delete" | "set_title";
  blockIds?: string[];
  afterBlockId?: string;
  blocks?: BlockElement[];
  title?: string;
}
