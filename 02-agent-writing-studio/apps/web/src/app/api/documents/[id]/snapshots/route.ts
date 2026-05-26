import { NextResponse } from "next/server";
import { createSnapshot, getDocument, getLatestSnapshot } from "@/lib/documents";
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
    const snapshot = await getLatestSnapshot(id);
    return NextResponse.json({ snapshot });
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

export async function POST(request: Request, { params }: Params) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const doc = await getDocument(userId, id);
    if (!doc) {
      return NextResponse.json({ error: "文档不存在" }, { status: 404 });
    }
    const body = await request.json();
    const label = typeof body.label === "string" ? body.label : "manual";
    const content = Array.isArray(body.content) ? body.content : doc.content;
    const snapshot = await createSnapshot(id, content, label);
    return NextResponse.json({ snapshot }, { status: 201 });
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
