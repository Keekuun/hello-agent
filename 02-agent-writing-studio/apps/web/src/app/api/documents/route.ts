import { NextResponse } from "next/server";
import { createDocumentSchema } from "@hello-agent/shared";
import { createDocument, listDocuments } from "@/lib/documents";
import { requireUserId } from "@/lib/session";

export async function GET() {
  try {
    const userId = await requireUserId();
    const docs = await listDocuments(userId);
    return NextResponse.json({ documents: docs });
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

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const body = await request.json();
    const parsed = createDocumentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const doc = await createDocument(userId, parsed.data.title);
    return NextResponse.json({ document: doc }, { status: 201 });
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
