import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/session";
import { getDocument, updateDocument, createSnapshot } from "@/lib/documents";
import { applyPatches } from "@/lib/slate/outline";
import type { EditorValue, BlockElement } from "@hello-agent/shared";

const patchSchema = z.object({
  documentId: z.string().uuid(),
  setTitle: z.object({ title: z.string() }).optional(),
  insert: z
    .object({
      afterBlockId: z.string(),
      blocks: z.array(z.record(z.unknown())),
    })
    .optional(),
  replace: z
    .object({
      blockIds: z.array(z.string()),
      blocks: z.array(z.record(z.unknown())),
    })
    .optional(),
  delete: z.object({ blockIds: z.array(z.string()) }).optional(),
});

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { documentId, setTitle, insert, replace, delete: del } = parsed.data;
    const doc = await getDocument(userId, documentId);
    if (!doc) {
      return NextResponse.json({ error: "文档不存在" }, { status: 404 });
    }

    await createSnapshot(documentId, doc.content as unknown[], "pre-apply");

    let content = doc.content as EditorValue;
    content = applyPatches(content, {
      setTitle: setTitle ? { title: setTitle.title } : undefined,
      insert: insert
        ? {
            afterBlockId: insert.afterBlockId,
            blocks: insert.blocks as unknown as BlockElement[],
          }
        : undefined,
      replace: replace
        ? {
            blockIds: replace.blockIds,
            blocks: replace.blocks as unknown as BlockElement[],
          }
        : undefined,
      delete: del ? { blockIds: del.blockIds } : undefined,
    });

    const updated = await updateDocument(userId, documentId, {
      content: content as unknown[],
      ...(setTitle ? { title: setTitle.title } : {}),
    });

    const highlightIds = [
      ...(insert?.blocks.map((b) => (b as unknown as BlockElement).id) ?? []),
      ...(replace?.blockIds ?? []),
      ...(del?.blockIds ?? []),
    ];

    return NextResponse.json({
      document: updated,
      content,
      highlightIds,
    });
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
