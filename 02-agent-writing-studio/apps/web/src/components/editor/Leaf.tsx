"use client";

import type { RenderLeafProps } from "slate-react";
import type { CustomText } from "@hello-agent/shared";

export function Leaf({ attributes, children, leaf }: RenderLeafProps) {
  const t = leaf as CustomText;
  let el = children;
  if (t.bold) el = <strong>{el}</strong>;
  if (t.italic) el = <em>{el}</em>;
  if (t.code)
    el = (
      <code className="bg-zinc-100 text-pink-700 px-1 rounded text-sm">{el}</code>
    );
  if (t.underline) el = <u>{el}</u>;
  return <span {...attributes}>{el}</span>;
}
