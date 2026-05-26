import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { getDocument } from "@/lib/documents";
import { DocumentWorkspace } from "@/components/editor/DocumentWorkspace";
import type { EditorValue } from "@hello-agent/shared";

type Props = { params: Promise<{ id: string }> };

export default async function DocPage({ params }: Props) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const doc = await getDocument(session.user.id, id);
  if (!doc) notFound();

  return (
    <DocumentWorkspace
      documentId={doc.id}
      userName={session.user.name}
      initialDoc={{
        title: doc.title,
        slug: doc.slug,
        status: doc.status,
        description: doc.description,
        coverUrl: doc.coverUrl,
        tags: (doc.tags as string[]) ?? [],
        content: doc.content as EditorValue,
      }}
    />
  );
}
