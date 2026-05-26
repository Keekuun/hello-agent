import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { requireDb } from "@/db";
import { documentShares } from "@/db/schema";
import { getDocument } from "@/lib/documents";
import { requireUserId } from "@/lib/session";
import { shareTokenSchema } from "@hello-agent/shared";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const doc = await getDocument(userId, id);
    if (!doc) {
      return NextResponse.json({ error: "文档不存在" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = shareTokenSchema.safeParse({ documentId: id, ...body });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const db = requireDb();
    const token = nanoid(24);
    const [share] = await db
      .insert(documentShares)
      .values({
        documentId: id,
        token,
        role: parsed.data.role,
      })
      .returning();

    const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
    return NextResponse.json({
      share,
      url: `${baseUrl}/share/${token}`,
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

export async function GET(_request: Request, { params }: Params) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const db = requireDb();
    const shares = await db
      .select()
      .from(documentShares)
      .where(eq(documentShares.documentId, id));

    const doc = await getDocument(userId, id);
    if (!doc) {
      return NextResponse.json({ error: "文档不存在" }, { status: 404 });
    }

    return NextResponse.json({ shares });
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
