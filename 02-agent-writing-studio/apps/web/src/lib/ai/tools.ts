import { z } from "zod";
import { tool } from "ai";
import { createBlockId } from "@hello-agent/shared";
import type { BlockElement, EditorValue } from "@hello-agent/shared";
import { buildOutline, applyPatches } from "@/lib/slate/outline";

function blockFromText(type: BlockElement["type"], text: string): BlockElement {
  return {
    id: createBlockId(),
    type,
    children: [{ text }],
  };
}

export function createDocumentTools(
  getContent: () => EditorValue,
  getTitle: () => string,
  apply: (result: {
    content?: EditorValue;
    title?: string;
    highlightIds?: string[];
  }) => void,
) {
  return {
    get_document_outline: tool({
      description: "获取文档标题大纲与块 id 列表",
      parameters: z.object({}),
      execute: async () => {
        const content = getContent();
        return {
          title: getTitle(),
          outline: buildOutline(content),
          blockIds: content.map((b) => ({ id: b.id, type: b.type })),
        };
      },
    }),

    read_blocks: tool({
      description: "按 blockId 读取块内容",
      parameters: z.object({
        blockIds: z.array(z.string()).min(1),
      }),
      execute: async ({ blockIds }) => {
        const content = getContent();
        const blocks = content.filter((b) => blockIds.includes(b.id));
        return { blocks };
      },
    }),

    insert_blocks_after: tool({
      description: "在指定块之后插入新块",
      parameters: z.object({
        afterBlockId: z.string(),
        blocks: z.array(
          z.object({
            type: z.enum([
              "paragraph",
              "heading-one",
              "heading-two",
              "heading-three",
              "bulleted-list",
              "numbered-list",
              "blockquote",
              "code-block",
            ]),
            text: z.string(),
          }),
        ),
      }),
      execute: async ({ afterBlockId, blocks }) => {
        const newBlocks = blocks.map((b) =>
          blockFromText(b.type as BlockElement["type"], b.text),
        );
        const content = applyPatches(getContent(), {
          insert: { afterBlockId, blocks: newBlocks },
        });
        apply({
          content,
          highlightIds: newBlocks.map((b) => b.id),
        });
        return { ok: true, insertedIds: newBlocks.map((b) => b.id) };
      },
    }),

    replace_blocks: tool({
      description: "替换指定块（润色、扩写、翻译）",
      parameters: z.object({
        blockIds: z.array(z.string()).min(1),
        blocks: z.array(
          z.object({
            type: z.enum([
              "paragraph",
              "heading-one",
              "heading-two",
              "heading-three",
              "blockquote",
              "code-block",
            ]),
            text: z.string(),
          }),
        ),
      }),
      execute: async ({ blockIds, blocks }) => {
        const newBlocks = blocks.map((b, i) => ({
          ...blockFromText(b.type as BlockElement["type"], b.text),
          id: blockIds[i] ?? createBlockId(),
        }));
        const content = applyPatches(getContent(), {
          replace: { blockIds, blocks: newBlocks },
        });
        apply({ content, highlightIds: blockIds });
        return { ok: true, replacedIds: blockIds };
      },
    }),

    delete_blocks: tool({
      description: "删除指定块",
      parameters: z.object({
        blockIds: z.array(z.string()).min(1),
      }),
      execute: async ({ blockIds }) => {
        const content = applyPatches(getContent(), {
          delete: { blockIds },
        });
        apply({ content, highlightIds: blockIds });
        return { ok: true, deletedIds: blockIds };
      },
    }),

    set_title: tool({
      description: "修改文档标题（H1）",
      parameters: z.object({
        title: z.string().min(1).max(200),
      }),
      execute: async ({ title }) => {
        const content = applyPatches(getContent(), {
          setTitle: { title },
        });
        apply({ content, title });
        return { ok: true, title };
      },
    }),
  };
}
