import { Editor, Element, Range, Text, Transforms } from "slate";
import { createBlockId } from "@hello-agent/shared";
import type { BlockElement, BlockType, CustomText, EditorValue } from "@hello-agent/shared";
import { setBlockType } from "./plugins";

type BlockEntry = [BlockElement, number[]];

type BlockReplaceOptions = {
  language?: string;
  url?: string;
  alt?: string;
};

function getTopBlock(editor: Editor): BlockEntry | undefined {
  const { selection } = editor;
  if (!selection) return undefined;

  const entry = Editor.nodes(editor, {
    at: selection,
    match: (n) => Element.isElement(n) && Editor.isBlock(editor, n),
  }).next().value as BlockEntry | undefined;

  return entry;
}

function isTextBlock(type: BlockType): boolean {
  return (
    type === "paragraph" ||
    type === "heading-one" ||
    type === "heading-two" ||
    type === "heading-three" ||
    type === "heading-four" ||
    type === "heading-five" ||
    type === "blockquote"
  );
}

/** 行首 marker + 空格（越长越优先） */
const SPACE_PREFIX_RULES: { prefix: string; type: BlockType }[] = [
  { prefix: "#####", type: "heading-five" },
  { prefix: "####", type: "heading-four" },
  { prefix: "###", type: "heading-three" },
  { prefix: "##", type: "heading-two" },
  { prefix: "#", type: "heading-one" },
  { prefix: "```", type: "code-block" },
  { prefix: ">", type: "blockquote" },
  { prefix: "-", type: "bulleted-list" },
  { prefix: "*", type: "bulleted-list" },
  { prefix: "+", type: "bulleted-list" },
  { prefix: "1.", type: "numbered-list" },
];

type FullLineRule =
  | {
      kind: "text";
      pattern: RegExp;
      type: BlockType;
      contentIndex: number;
    }
  | {
      kind: "code";
      pattern: RegExp;
      languageIndex?: number;
    }
  | {
      kind: "image";
      pattern: RegExp;
      altIndex: number;
      urlIndex: number;
    }
  | {
      kind: "divider";
      pattern: RegExp;
    };

const FULL_LINE_RULES: FullLineRule[] = [
  { kind: "text", pattern: /^#{5}\s+(.+)$/, type: "heading-five", contentIndex: 1 },
  { kind: "text", pattern: /^#{4}\s+(.+)$/, type: "heading-four", contentIndex: 1 },
  { kind: "text", pattern: /^#{3}\s+(.+)$/, type: "heading-three", contentIndex: 1 },
  { kind: "text", pattern: /^#{2}\s+(.+)$/, type: "heading-two", contentIndex: 1 },
  { kind: "text", pattern: /^#{1}\s+(.+)$/, type: "heading-one", contentIndex: 1 },
  { kind: "text", pattern: /^>\s+(.+)$/, type: "blockquote", contentIndex: 1 },
  { kind: "text", pattern: /^[-*+]\s+(.+)$/, type: "bulleted-list", contentIndex: 1 },
  { kind: "text", pattern: /^(\d+)\.\s+(.+)$/, type: "numbered-list", contentIndex: 2 },
  { kind: "code", pattern: /^```(\w+)?\s*$/ },
  { kind: "image", pattern: /^!\[([^\]]*)\]\(([^)]+)\)$/, altIndex: 1, urlIndex: 2 },
  { kind: "divider", pattern: /^(\*{3,}|-{3,}|_{3,})$/ },
];

type InlineRule = {
  pattern: RegExp;
  marks: Partial<CustomText>;
};

const INLINE_RULES: InlineRule[] = [
  { pattern: /\*\*\*(.+)\*\*\*$/, marks: { bold: true, italic: true } },
  { pattern: /\*\*(.+)\*\*$/, marks: { bold: true } },
  { pattern: /(?<!\*)\*([^*]+)\*(?!\*)$/, marks: { italic: true } },
  { pattern: /`([^`]+)`$/, marks: { code: true } },
  { pattern: /__(.+)__$/, marks: { bold: true } },
  { pattern: /_(.+)_(?!_)$/, marks: { italic: true } },
];

function replaceBlockWithTypeAndText(
  editor: Editor,
  path: number[],
  type: BlockType,
  content: string,
  options: BlockReplaceOptions = {},
) {
  const props: Partial<BlockElement> = { type, id: createBlockId() };
  if (type === "code-block") {
    props.language = options.language ?? "text";
  }
  if (type === "image") {
    props.url = options.url ?? "";
    props.alt = options.alt ?? "";
    props.children = [{ text: "" }];
  }

  Transforms.setNodes(editor, props, { at: path });

  if (type === "divider" || type === "image") {
    return;
  }

  Transforms.delete(editor, {
    at: {
      anchor: Editor.start(editor, path),
      focus: Editor.end(editor, path),
    },
  });

  Transforms.insertText(editor, content, {
    at: Editor.start(editor, path),
  });
}

function applyFullLineRule(editor: Editor, path: number[], text: string): boolean {
  const trimmed = text.trimEnd();

  for (const rule of FULL_LINE_RULES) {
    const match = trimmed.match(
      rule.kind === "text" || rule.kind === "code" || rule.kind === "image"
        ? rule.pattern
        : rule.pattern,
    );
    if (!match) continue;

    switch (rule.kind) {
      case "text":
        replaceBlockWithTypeAndText(
          editor,
          path,
          rule.type,
          match[rule.contentIndex] ?? "",
        );
        return true;
      case "code":
        replaceBlockWithTypeAndText(editor, path, "code-block", "", {
          language: match[rule.languageIndex ?? 1] ?? "text",
        });
        return true;
      case "image":
        replaceBlockWithTypeAndText(editor, path, "image", "", {
          alt: match[rule.altIndex] ?? "",
          url: match[rule.urlIndex] ?? "",
        });
        return true;
      case "divider":
        replaceBlockWithTypeAndText(editor, path, "divider", "");
        return true;
    }
  }

  return false;
}

function parseMarkdownLine(line: string): {
  type: BlockType;
  content: string;
  options?: BlockReplaceOptions;
} | null {
  const trimmed = line.trimEnd();
  for (const rule of FULL_LINE_RULES) {
    const match = trimmed.match(rule.pattern);
    if (!match) continue;
    switch (rule.kind) {
      case "text":
        return {
          type: rule.type,
          content: match[rule.contentIndex] ?? "",
        };
      case "code":
        return {
          type: "code-block",
          content: "",
          options: { language: match[rule.languageIndex ?? 1] ?? "text" },
        };
      case "image":
        return {
          type: "image",
          content: "",
          options: {
            alt: match[rule.altIndex] ?? "",
            url: match[rule.urlIndex] ?? "",
          },
        };
      case "divider":
        return { type: "divider", content: "" };
    }
  }
  return { type: "paragraph", content: trimmed };
}

function createBlockFromLine(line: string): BlockElement {
  const parsed = parseMarkdownLine(line);
  if (!parsed) {
    return {
      id: createBlockId(),
      type: "paragraph",
      children: [{ text: line }],
    };
  }
  const block: BlockElement = {
    id: createBlockId(),
    type: parsed.type,
    children:
      parsed.type === "divider" || parsed.type === "image"
        ? [{ text: "" }]
        : [{ text: parsed.content }],
  };
  if (parsed.type === "code-block") {
    block.language = parsed.options?.language ?? "text";
  }
  if (parsed.type === "image") {
    block.url = parsed.options?.url ?? "";
    block.alt = parsed.options?.alt ?? "";
  }
  return block;
}

function parseMarkdownText(text: string): BlockElement[] {
  const normalized = text.replace(/\r\n/g, "\n").trimEnd();
  if (!normalized) return [];

  const lines = normalized.split("\n");
  const blocks: BlockElement[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    const fenceOpen = line.match(/^```(\w+)?\s*$/);
    if (fenceOpen) {
      const language = fenceOpen[1] ?? "text";
      index += 1;
      const codeLines: string[] = [];
      while (index < lines.length && !/^```\s*$/.test(lines[index] ?? "")) {
        codeLines.push(lines[index] ?? "");
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push({
        id: createBlockId(),
        type: "code-block",
        language,
        children: [{ text: codeLines.join("\n") }],
      });
      continue;
    }

    blocks.push(createBlockFromLine(line));
    index += 1;
  }

  return blocks;
}

function insertBlocksReplacingCurrent(
  editor: Editor,
  blocks: BlockElement[],
): boolean {
  if (blocks.length === 0) return false;
  const blockEntry = getTopBlock(editor);
  if (!blockEntry) return false;

  const [, path] = blockEntry;
  const topPath = [path[0]];
  Transforms.removeNodes(editor, { at: topPath });
  Transforms.insertNodes(editor, blocks, { at: topPath });
  return true;
}

/** 行内 markdown：` **bold**`、`*italic*`、`` `code` `` 等，按空格触发 */
export function applyInlineMarkdownOnSpace(editor: Editor): boolean {
  const { selection } = editor;
  if (!selection || !Range.isCollapsed(selection)) return false;

  const blockEntry = getTopBlock(editor);
  if (!blockEntry) return false;

  const [node, path] = blockEntry;
  const block = node as BlockElement;
  if (!isTextBlock(block.type)) return false;

  const blockStart = Editor.start(editor, path);
  const beforeRange = { anchor: blockStart, focus: selection.anchor };
  const beforeText = Editor.string(editor, beforeRange);

  for (const rule of INLINE_RULES) {
    const match = beforeText.match(rule.pattern);
    if (!match || match.index === undefined) continue;

    const content = match[1] ?? "";
    const matchStart = match.index;
    const matchEnd = matchStart + match[0].length;

    const insertAt = { path: selection.anchor.path, offset: matchStart };

    Transforms.delete(editor, {
      at: {
        anchor: { path: selection.anchor.path, offset: matchStart },
        focus: { path: selection.anchor.path, offset: matchEnd },
      },
    });
    Transforms.insertText(editor, content, { at: insertAt });
    Transforms.setNodes(editor, rule.marks, {
      at: {
        anchor: insertAt,
        focus: { path: selection.anchor.path, offset: matchStart + content.length },
      },
      match: Text.isText,
      split: true,
    });
    return true;
  }

  return false;
}

/** 块级 markdown：marker + 空格，或整行如 `### hello` */
export function applyMarkdownShortcutOnSpace(editor: Editor): boolean {
  if (applyInlineMarkdownOnSpace(editor)) {
    return true;
  }

  const blockEntry = getTopBlock(editor);
  if (!blockEntry) return false;

  const [node, path] = blockEntry;
  const block = node as BlockElement;
  if (block.type !== "paragraph") return false;

  const text = Editor.string(editor, path);

  if (applyFullLineRule(editor, path, text)) {
    return true;
  }

  for (const { prefix, type } of SPACE_PREFIX_RULES) {
    if (text !== prefix) continue;

    Transforms.delete(editor, {
      at: {
        anchor: Editor.start(editor, path),
        focus: Editor.end(editor, path),
      },
    });
    if (type === "code-block") {
      replaceBlockWithTypeAndText(editor, path, "code-block", "", {
        language: "text",
      });
    } else {
      setBlockType(editor, type);
    }
    return true;
  }

  return false;
}

/** 整行 markdown → 所见即所得块 */
export function applyMarkdownShortcutOnEnter(editor: Editor): boolean {
  const blockEntry = getTopBlock(editor);
  if (!blockEntry) return false;

  const [node, path] = blockEntry;
  const block = node as BlockElement;
  if (block.type !== "paragraph") return false;

  const text = Editor.string(editor, path);
  return applyFullLineRule(editor, path, text);
}

/** 粘贴 markdown（支持多行与 ``` 代码块） */
export function applyMarkdownShortcutOnPaste(
  editor: Editor,
  plainText: string,
): boolean {
  const normalized = plainText.replace(/\r\n/g, "\n");
  if (!normalized.trim()) return false;

  if (!normalized.includes("\n")) {
    const blockEntry = getTopBlock(editor);
    if (!blockEntry) return false;
    const [, path] = blockEntry;
    return applyFullLineRule(editor, path, normalized);
  }

  const blocks = parseMarkdownText(normalized);
  return insertBlocksReplacingCurrent(editor, blocks);
}

/** 供测试/导出：解析 markdown 文本为 Slate 块 */
export function markdownTextToBlocks(text: string): EditorValue {
  return parseMarkdownText(text);
}
