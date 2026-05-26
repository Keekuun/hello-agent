"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type DocRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  description: string | null;
  updatedAt: Date;
};

export function DocumentList({ documents }: { documents: DocRow[] }) {
  const router = useRouter();

  const remove = async (id: string) => {
    if (!confirm("确定删除此文档？")) return;
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    router.refresh();
  };

  if (documents.length === 0) {
    return (
      <p className="text-zinc-500 text-center py-12">
        还没有文档，点击「新建文档」开始写作。
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {documents.map((doc) => (
        <li
          key={doc.id}
          className="bg-white border border-zinc-200 rounded-lg px-4 py-3 flex items-center justify-between hover:border-zinc-300"
        >
          <Link href={`/doc/${doc.id}`} className="flex-1 min-w-0">
            <p className="font-medium truncate">{doc.title}</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              {doc.status} · {new Date(doc.updatedAt).toLocaleString("zh-CN")}
            </p>
          </Link>
          <button
            type="button"
            onClick={() => remove(doc.id)}
            className="text-xs text-red-500 ml-4 shrink-0"
          >
            删除
          </button>
        </li>
      ))}
    </ul>
  );
}
