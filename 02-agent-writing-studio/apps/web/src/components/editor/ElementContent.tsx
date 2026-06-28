"use client";

import type { ReactNode } from "react";
import type { RenderElementProps } from "slate-react";
import type { BlockElement } from "@hello-agent/shared";
import { BlockGutter } from "./BlockGutter";

function mergeClassName(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type ElementContentProps = {
  attributes: RenderElementProps["attributes"];
  element: BlockElement;
  children: ReactNode;
  highlighted?: boolean;
  showGutter?: boolean;
  onOpenMenu?: (target: HTMLElement) => void;
  onOpenInsert?: (target: HTMLElement) => void;
};

const blockShell = "group/block relative -ml-[52px] pl-[52px] py-0.5";

export function ElementContent({
  attributes,
  element,
  children,
  highlighted,
  showGutter = true,
  onOpenMenu,
  onOpenInsert,
}: ElementContentProps) {
  const block = element;
  const style = { marginLeft: block.type === "list-item" ? "1.5rem" : undefined };
  const highlightClass = highlighted
    ? "bg-amber-100/80 rounded transition-colors duration-500"
    : undefined;

  const gutter =
    showGutter && onOpenMenu && onOpenInsert ? (
      <BlockGutter onOpenMenu={onOpenMenu} onOpenInsert={onOpenInsert} />
    ) : null;

  switch (block.type) {
    case "heading-one":
      return (
        <h1
          {...attributes}
          data-block-id={block.id}
          className={mergeClassName(
            blockShell,
            "text-[34px] font-semibold leading-tight text-zinc-900 mt-2 mb-1",
            highlightClass,
          )}
          style={style}
        >
          {gutter}
          {children}
        </h1>
      );
    case "heading-two":
      return (
        <h2
          {...attributes}
          data-block-id={block.id}
          className={mergeClassName(
            blockShell,
            "text-[26px] font-semibold leading-snug text-zinc-900 mt-4 mb-1",
            highlightClass,
          )}
          style={style}
        >
          {gutter}
          {children}
        </h2>
      );
    case "heading-three":
      return (
        <h3
          {...attributes}
          data-block-id={block.id}
          className={mergeClassName(
            blockShell,
            "text-xl font-semibold leading-snug text-zinc-900 mt-3 mb-1",
            highlightClass,
          )}
          style={style}
        >
          {gutter}
          {children}
        </h3>
      );
    case "heading-four":
      return (
        <h4
          {...attributes}
          data-block-id={block.id}
          className={mergeClassName(
            blockShell,
            "text-lg font-semibold leading-snug text-zinc-900 mt-2 mb-1",
            highlightClass,
          )}
          style={style}
        >
          {gutter}
          {children}
        </h4>
      );
    case "heading-five":
      return (
        <h5
          {...attributes}
          data-block-id={block.id}
          className={mergeClassName(
            blockShell,
            "text-base font-semibold leading-snug text-zinc-900 mt-2 mb-0.5",
            highlightClass,
          )}
          style={style}
        >
          {gutter}
          {children}
        </h5>
      );
    case "blockquote":
      return (
        <blockquote
          {...attributes}
          data-block-id={block.id}
          className={mergeClassName(
            blockShell,
            "border-l-[3px] border-zinc-300 pl-4 italic text-zinc-600 my-1",
            highlightClass,
          )}
          style={style}
        >
          {gutter}
          {children}
        </blockquote>
      );
    case "code-block":
      return (
        <pre
          {...attributes}
          data-block-id={block.id}
          className={mergeClassName(
            blockShell,
            "bg-[#f5f6f7] text-zinc-800 rounded-lg px-4 py-3 my-2 overflow-x-auto text-[13px] font-mono border border-zinc-200/80",
            highlightClass,
          )}
          style={style}
        >
          {gutter}
          <code>{children}</code>
        </pre>
      );
    case "bulleted-list":
      return (
        <ul
          {...attributes}
          data-block-id={block.id}
          className={mergeClassName("list-disc pl-6 my-1 text-[15px]", highlightClass)}
          style={style}
        >
          {children}
        </ul>
      );
    case "numbered-list":
      return (
        <ol
          {...attributes}
          data-block-id={block.id}
          className={mergeClassName("list-decimal pl-6 my-1 text-[15px]", highlightClass)}
          style={style}
        >
          {children}
        </ol>
      );
    case "list-item":
      return (
        <li
          {...attributes}
          data-block-id={block.id}
          className={mergeClassName(blockShell, "leading-7", highlightClass)}
          style={style}
        >
          {gutter}
          {children}
        </li>
      );
    case "divider":
      return (
        <div
          {...attributes}
          data-block-id={block.id}
          contentEditable={false}
          className={mergeClassName(blockShell, "my-3", highlightClass)}
          style={style}
        >
          {gutter}
          <hr className="border-zinc-200" />
          {children}
        </div>
      );
    case "image":
      return (
        <div
          {...attributes}
          data-block-id={block.id}
          contentEditable={false}
          className={mergeClassName(blockShell, "my-3", highlightClass)}
          style={style}
        >
          {gutter}
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
        <p
          {...attributes}
          data-block-id={block.id}
          className={mergeClassName(
            blockShell,
            "my-0.5 min-h-[1.75rem] leading-7 text-[15px] text-zinc-800",
            highlightClass,
          )}
          style={style}
        >
          {gutter}
          {children}
        </p>
      );
  }
}
