"use client";

import { useState } from "react";
import Link from "next/link";

export default function SettingsPage() {
  const [shareUrl, setShareUrl] = useState("");
  const [docId, setDocId] = useState("");

  const createShare = async () => {
    if (!docId) return;
    const res = await fetch(`/api/documents/${docId}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "viewer" }),
    });
    const data = await res.json();
    if (data.url) setShareUrl(data.url);
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-8 max-w-lg mx-auto">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">
        ← 返回
      </Link>
      <h1 className="text-xl font-semibold mt-4 mb-6">设置</h1>

      <section className="bg-white border rounded-xl p-4 space-y-3 text-sm">
        <h2 className="font-medium">环境变量</h2>
        <p className="text-zinc-500">
          在 <code className="bg-zinc-100 px-1 rounded">apps/web/.env.local</code> 配置：
        </p>
        <ul className="list-disc pl-5 text-zinc-600 space-y-1">
          <li>DATABASE_URL</li>
          <li>BETTER_AUTH_SECRET / BETTER_AUTH_URL</li>
          <li>OPENAI_API_KEY / OPENAI_BASE_URL / OPENAI_MODEL</li>
          <li>NEXT_PUBLIC_ENABLE_COLLAB=true</li>
          <li>NEXT_PUBLIC_COLLAB_WS_URL=ws://localhost:1234</li>
        </ul>
      </section>

      <section className="bg-white border rounded-xl p-4 space-y-3 text-sm mt-4">
        <h2 className="font-medium">生成分享链接</h2>
        <input
          className="w-full border rounded px-2 py-1"
          placeholder="文档 UUID"
          value={docId}
          onChange={(e) => setDocId(e.target.value)}
        />
        <button
          type="button"
          onClick={createShare}
          className="bg-zinc-900 text-white px-3 py-1 rounded"
        >
          创建只读链接
        </button>
        {shareUrl && (
          <p className="text-xs break-all text-blue-600">{shareUrl}</p>
        )}
      </section>
    </div>
  );
}
