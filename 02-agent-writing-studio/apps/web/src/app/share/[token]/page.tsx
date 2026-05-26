import { notFound } from "next/navigation";
import { getDocumentByShareToken } from "@/lib/documents";
import { PreviewPane } from "@/components/editor/PreviewPane";
import type { EditorValue } from "@hello-agent/shared";

type Props = { params: Promise<{ token: string }> };

export default async function SharePage({ params }: Props) {
  const { token } = await params;
  const row = await getDocumentByShareToken(token);
  if (!row) notFound();

  const { document: doc, role } = row;

  return (
    <div className="min-h-screen bg-white">
      <header className="px-6 py-4 border-b bg-zinc-50">
        <p className="text-xs text-zinc-500 mb-1">只读分享 · {role}</p>
        <h1 className="text-xl font-semibold">{doc.title}</h1>
      </header>
      <div className="max-w-3xl mx-auto">
        <PreviewPane value={doc.content as EditorValue} />
      </div>
    </div>
  );
}
