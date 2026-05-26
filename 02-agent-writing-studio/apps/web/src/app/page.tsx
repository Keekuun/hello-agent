import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listDocuments, createDocument } from "@/lib/documents";
import { DocumentList } from "@/components/DocumentList";

export default async function HomePage() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }

  const docs = await listDocuments(session.user.id);

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">写作工作室</h1>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-zinc-500">{session.user.name}</span>
          <Link href="/settings" className="text-zinc-600 hover:underline">
            设置
          </Link>
          <form action={createDocAction}>
            <button
              type="submit"
              className="bg-zinc-900 text-white px-4 py-2 rounded-lg"
            >
              新建文档
            </button>
          </form>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-8">
        <DocumentList documents={docs} />
      </main>
    </div>
  );
}

async function createDocAction() {
  "use server";
  const session = await getSession();
  if (!session?.user) redirect("/login");
  const doc = await createDocument(session.user.id);
  redirect(`/doc/${doc.id}`);
}
