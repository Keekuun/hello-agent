import type { BaseEditor, BaseRange } from "slate";
import type { ReactEditor } from "slate-react";
import type { HistoryEditor } from "slate-history";
import type { YjsEditor } from "@slate-yjs/core";
import type { BlockElement, CustomText } from "@hello-agent/shared";

export type CustomEditor = BaseEditor &
  ReactEditor &
  HistoryEditor &
  YjsEditor & {
    nodeToDecorations?: Map<BaseRange, BaseRange[]>;
  };

declare module "slate" {
  interface CustomTypes {
    Editor: CustomEditor;
    Element: BlockElement;
    Text: CustomText;
  }
}

export const LIST_TYPES = ["bulleted-list", "numbered-list"] as const;
export const HEADING_TYPES = [
  "heading-one",
  "heading-two",
  "heading-three",
  "heading-four",
  "heading-five",
] as const;
