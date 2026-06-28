"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type NewDocumentButtonProps = {
  className?: string;
  children?: React.ReactNode;
  variant?: "primary" | "ghost";
};

export function NewDocumentButton({
  className,
  children = "新建",
  variant = "ghost",
}: NewDocumentButtonProps) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const createDoc = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        throw new Error("创建失败");
      }
      const data = (await res.json()) as { document: { id: string } };
      router.push(`/doc/${data.document.id}`);
    } catch {
      alert("创建文档失败，请稍后重试");
      setCreating(false);
    }
  };

  const base =
    variant === "primary"
      ? "bg-zinc-900 text-white hover:bg-zinc-800"
      : "border border-zinc-200 text-zinc-700 hover:bg-zinc-50";

  return (
    <button
      type="button"
      onClick={createDoc}
      disabled={creating}
      className={`rounded-lg px-3 py-1.5 text-sm transition-colors disabled:opacity-50 ${base} ${className ?? ""}`}
    >
      {creating ? "创建中…" : children}
    </button>
  );
}
