import { NextResponse } from "next/server";
import { updateDocumentSchema } from "@hello-agent/shared";
import { deleteDocument, getDocument, updateDocument } from "@/lib/documents";
import { requireUserId } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const doc = await getDocument(userId, id);
    if (!doc) {
      return NextResponse.json({ error: "文档不存在" }, { status: 404 });
    }
    return NextResponse.json({ document: doc });
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

export async function PATCH(request: Request, { params }: Params) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const body = await request.json();
    const parsed = updateDocumentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const doc = await updateDocument(userId, id, parsed.data);
    if (!doc) {
      return NextResponse.json({ error: "文档不存在" }, { status: 404 });
    }
    return NextResponse.json({ document: doc });
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

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const doc = await deleteDocument(userId, id);
    if (!doc) {
      return NextResponse.json({ error: "文档不存在" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
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
