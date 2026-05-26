import { and, desc, eq } from "drizzle-orm";
import { createEmptyDocument } from "@hello-agent/shared";
import { requireDb } from "@/db";
import { documentSnapshots, documents } from "@/db/schema";
import { nanoid } from "nanoid";

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return base || `doc-${nanoid(8)}`;
}

export async function listDocuments(userId: string) {
  const db = requireDb();
  return db
    .select({
      id: documents.id,
      title: documents.title,
      slug: documents.slug,
      status: documents.status,
      description: documents.description,
      tags: documents.tags,
      updatedAt: documents.updatedAt,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .where(eq(documents.userId, userId))
    .orderBy(desc(documents.updatedAt));
}

export async function getDocument(userId: string, id: string) {
  const db = requireDb();
  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, userId)))
    .limit(1);
  return doc ?? null;
}

export async function getDocumentByShareToken(token: string) {
  const db = requireDb();
  const { documentShares } = await import("@/db/schema");
  const [row] = await db
    .select({ document: documents, role: documentShares.role })
    .from(documentShares)
    .innerJoin(documents, eq(documentShares.documentId, documents.id))
    .where(eq(documentShares.token, token))
    .limit(1);
  return row ?? null;
}

export async function createDocument(userId: string, title?: string) {
  const db = requireDb();
  const docTitle = title ?? "无标题文档";
  const content = createEmptyDocument(docTitle);
  const slug = `${slugify(docTitle)}-${nanoid(6)}`;

  const [doc] = await db
    .insert(documents)
    .values({
      userId,
      title: docTitle,
      slug,
      content,
    })
    .returning();

  return doc;
}

export async function updateDocument(
  userId: string,
  id: string,
  data: Partial<{
    title: string;
    slug: string;
    status: "draft" | "published" | "archived";
    description: string | null;
    coverUrl: string | null;
    tags: string[];
    content: unknown[];
    yjsState: string | null;
  }>,
) {
  const db = requireDb();
  const [doc] = await db
    .update(documents)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(documents.id, id), eq(documents.userId, userId)))
    .returning();
  return doc ?? null;
}

export async function deleteDocument(userId: string, id: string) {
  const db = requireDb();
  const [doc] = await db
    .delete(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, userId)))
    .returning({ id: documents.id });
  return doc ?? null;
}

export async function createSnapshot(
  documentId: string,
  content: unknown[],
  label = "auto",
) {
  const db = requireDb();
  const [snap] = await db
    .insert(documentSnapshots)
    .values({ documentId, content, label })
    .returning();
  return snap;
}

export async function getLatestSnapshot(documentId: string) {
  const db = requireDb();
  const [snap] = await db
    .select()
    .from(documentSnapshots)
    .where(eq(documentSnapshots.documentId, documentId))
    .orderBy(desc(documentSnapshots.createdAt))
    .limit(1);
  return snap ?? null;
}
