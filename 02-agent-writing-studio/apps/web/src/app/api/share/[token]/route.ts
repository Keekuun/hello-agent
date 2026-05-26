import { NextResponse } from "next/server";
import { getDocumentByShareToken } from "@/lib/documents";

type Params = { params: Promise<{ token: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { token } = await params;
    const row = await getDocumentByShareToken(token);
    if (!row) {
      return NextResponse.json({ error: "链接无效" }, { status: 404 });
    }
    return NextResponse.json({
      document: row.document,
      role: row.role,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "服务器错误" },
      { status: 500 },
    );
  }
}
