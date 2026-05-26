import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getDocument } from "@/lib/documents";
import { PreviewPane } from "@/components/editor/PreviewPane";
import type { EditorValue } from "@hello-agent/shared";

type Props = { params: Promise<{ id: string }> };

export default async function PreviewPage({ params }: Props) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const doc = await getDocument(session.user.id, id);
  if (!doc) notFound();

  return (
    <div className="min-h-screen bg-white">
      <header className="px-6 py-4 border-b flex items-center gap-4">
        <Link href={`/doc/${id}`} className="text-sm text-zinc-500 hover:underline">
          ← 返回编辑
        </Link>
        <h1 className="text-lg font-semibold">{doc.title}</h1>
      </header>
      <div className="max-w-3xl mx-auto">
        <PreviewPane value={doc.content as EditorValue} />
      </div>
    </div>
  );
}
