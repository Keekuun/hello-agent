import { NextResponse } from "next/server";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, tool } from "ai";
import { z } from "zod";
import { aiChatSchema } from "@hello-agent/shared";
import { createBlockId } from "@hello-agent/shared";
import type { BlockElement, EditorValue } from "@hello-agent/shared";
import { getDocument, updateDocument, createSnapshot } from "@/lib/documents";
import { requireUserId } from "@/lib/session";
import { buildOutline, applyPatches } from "@/lib/slate/outline";

export const maxDuration = 60;

function blockFromText(type: BlockElement["type"], text: string): BlockElement {
  return { id: createBlockId(), type, children: [{ text }] };
}

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const body = await request.json();
    const parsed = aiChatSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { documentId, message, selectedBlockIds } = parsed.data;
    let doc = await getDocument(userId, documentId);
    if (!doc) {
      return NextResponse.json({ error: "文档不存在" }, { status: 404 });
    }

    await createSnapshot(documentId, doc.content as unknown[], "pre-ai");

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "未配置 OPENAI_API_KEY，请先在设置中配置" },
        { status: 500 },
      );
    }

    const openai = createOpenAI({
      apiKey,
      baseURL: process.env.OPENAI_BASE_URL,
    });

    let content = doc.content as EditorValue;

    const persist = async () => {
      const updated = await updateDocument(userId, documentId, {
        content: content as unknown[],
        title: doc!.title,
      });
      if (updated) doc = updated;
    };

    const system = `你是博客写作协作者。必须通过工具修改文档，不要只在回复里贴全文。
文档标题：${doc.title}
大纲：${JSON.stringify(buildOutline(content))}
用户选中的块 id：${JSON.stringify(selectedBlockIds ?? [])}`;

    const result = streamText({
      model: openai(process.env.OPENAI_MODEL ?? "gpt-4o-mini"),
      system,
      messages: [{ role: "user", content: message }],
      maxSteps: 6,
      tools: {
        get_document_outline: tool({
          description: "获取文档大纲",
          parameters: z.object({}),
          execute: async () => ({
            title: doc!.title,
            outline: buildOutline(content),
            blockIds: content.map((b) => ({ id: b.id, type: b.type })),
          }),
        }),
        read_blocks: tool({
          description: "读取块内容",
          parameters: z.object({ blockIds: z.array(z.string()) }),
          execute: async ({ blockIds }) => ({
            blocks: content.filter((b) => blockIds.includes(b.id)),
          }),
        }),
        insert_blocks_after: tool({
          description: "在块后插入",
          parameters: z.object({
            afterBlockId: z.string(),
            blocks: z.array(
              z.object({ type: z.string(), text: z.string() }),
            ),
          }),
          execute: async ({ afterBlockId, blocks }) => {
            const newBlocks = blocks.map((b) =>
              blockFromText(b.type as BlockElement["type"], b.text),
            );
            content = applyPatches(content, {
              insert: { afterBlockId, blocks: newBlocks },
            });
            await persist();
            return { insertedIds: newBlocks.map((b) => b.id) };
          },
        }),
        replace_blocks: tool({
          description: "替换块",
          parameters: z.object({
            blockIds: z.array(z.string()),
            blocks: z.array(
              z.object({ type: z.string(), text: z.string() }),
            ),
          }),
          execute: async ({ blockIds, blocks }) => {
            const newBlocks = blocks.map((b, i) => ({
              ...blockFromText(b.type as BlockElement["type"], b.text),
              id: blockIds[i] ?? createBlockId(),
            }));
            content = applyPatches(content, {
              replace: { blockIds, blocks: newBlocks },
            });
            await persist();
            return { replacedIds: blockIds };
          },
        }),
        delete_blocks: tool({
          description: "删除块",
          parameters: z.object({ blockIds: z.array(z.string()) }),
          execute: async ({ blockIds }) => {
            content = applyPatches(content, { delete: { blockIds } });
            await persist();
            return { deletedIds: blockIds };
          },
        }),
        set_title: tool({
          description: "设置文档标题",
          parameters: z.object({ title: z.string() }),
          execute: async ({ title }) => {
            content = applyPatches(content, { setTitle: { title } });
            await updateDocument(userId, documentId, { title, content: content as unknown[] });
            return { title };
          },
        }),
      },
    });

    return result.toDataStreamResponse();
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "服务器错误" },
      { status: 500 },
    );
  }
}
