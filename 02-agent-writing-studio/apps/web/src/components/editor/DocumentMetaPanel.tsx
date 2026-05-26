"use client";

import type { DocumentStatus } from "@hello-agent/shared";

export function DocumentMetaPanel({
  meta,
  onChange,
}: {
  meta: {
    slug: string;
    status: DocumentStatus;
    description: string;
    coverUrl: string;
    tags: string;
  };
  onChange: (patch: Partial<typeof meta>) => void;
}) {
  return (
    <div className="p-4 space-y-3 text-sm border-t border-zinc-100">
      <h3 className="font-medium text-zinc-700">发布元数据</h3>
      <label className="block">
        <span className="text-zinc-500">Slug</span>
        <input
          className="mt-1 w-full border border-zinc-200 rounded px-2 py-1"
          value={meta.slug}
          onChange={(e) => onChange({ slug: e.target.value })}
        />
      </label>
      <label className="block">
        <span className="text-zinc-500">状态</span>
        <select
          className="mt-1 w-full border border-zinc-200 rounded px-2 py-1"
          value={meta.status}
          onChange={(e) =>
            onChange({ status: e.target.value as DocumentStatus })
          }
        >
          <option value="draft">草稿</option>
          <option value="published">已发布</option>
          <option value="archived">已归档</option>
        </select>
      </label>
      <label className="block">
        <span className="text-zinc-500">描述</span>
        <textarea
          className="mt-1 w-full border border-zinc-200 rounded px-2 py-1"
          rows={2}
          value={meta.description}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </label>
      <label className="block">
        <span className="text-zinc-500">封面 URL</span>
        <input
          className="mt-1 w-full border border-zinc-200 rounded px-2 py-1"
          value={meta.coverUrl}
          onChange={(e) => onChange({ coverUrl: e.target.value })}
        />
      </label>
      <label className="block">
        <span className="text-zinc-500">标签（逗号分隔）</span>
        <input
          className="mt-1 w-full border border-zinc-200 rounded px-2 py-1"
          value={meta.tags}
          onChange={(e) => onChange({ tags: e.target.value })}
        />
      </label>
    </div>
  );
}
