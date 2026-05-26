"use client";

import type { RenderElementProps } from "slate-react";
import type { BlockElement } from "@hello-agent/shared";

export function Element({ attributes, children, element }: RenderElementProps) {
  const block = element as BlockElement;
  const style = { marginLeft: block.type === "list-item" ? "1.5rem" : undefined };

  switch (block.type) {
    case "heading-one":
      return (
        <h1 {...attributes} className="text-3xl font-bold mt-6 mb-2" style={style}>
          {children}
        </h1>
      );
    case "heading-two":
      return (
        <h2 {...attributes} className="text-2xl font-semibold mt-5 mb-2" style={style}>
          {children}
        </h2>
      );
    case "heading-three":
      return (
        <h3 {...attributes} className="text-xl font-medium mt-4 mb-1" style={style}>
          {children}
        </h3>
      );
    case "blockquote":
      return (
        <blockquote
          {...attributes}
          className="border-l-4 border-zinc-300 pl-4 italic text-zinc-600 my-2"
          style={style}
        >
          {children}
        </blockquote>
      );
    case "code-block":
      return (
        <pre
          {...attributes}
          className="bg-zinc-900 text-zinc-100 rounded-lg p-4 my-3 overflow-x-auto text-sm font-mono"
          style={style}
        >
          <code>{children}</code>
        </pre>
      );
    case "bulleted-list":
      return (
        <ul {...attributes} className="list-disc pl-6 my-2" style={style}>
          {children}
        </ul>
      );
    case "numbered-list":
      return (
        <ol {...attributes} className="list-decimal pl-6 my-2" style={style}>
          {children}
        </ol>
      );
    case "list-item":
      return (
        <li {...attributes} style={style}>
          {children}
        </li>
      );
    case "divider":
      return (
        <div {...attributes} contentEditable={false} className="my-4" style={style}>
          <hr className="border-zinc-200" />
          {children}
        </div>
      );
    case "image":
      return (
        <div {...attributes} contentEditable={false} className="my-4" style={style}>
          {block.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={block.url} alt={block.alt ?? ""} className="max-w-full rounded-lg" />
          ) : (
            <div className="border border-dashed border-zinc-300 rounded-lg p-8 text-center text-zinc-400 text-sm">
              在元数据中设置图片 URL
            </div>
          )}
          {children}
        </div>
      );
    default:
      return (
        <p {...attributes} className="my-1 leading-7 text-zinc-800" style={style}>
          {children}
        </p>
      );
  }
}
