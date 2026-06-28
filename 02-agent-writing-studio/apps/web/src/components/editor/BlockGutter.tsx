"use client";

type BlockGutterProps = {
  onOpenMenu: (target: HTMLElement) => void;
  onOpenInsert: (target: HTMLElement) => void;
};

export function BlockGutter({ onOpenMenu, onOpenInsert }: BlockGutterProps) {
  return (
    <>
      <div className="pointer-events-none absolute inset-y-0 left-[44px] right-0 rounded-md bg-transparent transition-colors group-focus-within/block:bg-[#e8f3ff] group-hover/block:bg-zinc-50/80" />
      <div className="pointer-events-none absolute left-[44px] top-0 bottom-0 w-[2px] rounded-full bg-[#3370ff] opacity-0 group-focus-within/block:opacity-100" />
      <div className="absolute left-0 top-1 z-10 flex items-center gap-0.5 opacity-0 transition-opacity group-hover/block:opacity-100 group-focus-within/block:opacity-100">
        <button
          type="button"
          contentEditable={false}
          aria-label="块菜单"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => onOpenMenu(e.currentTarget)}
          className="flex h-6 w-5 items-center justify-center rounded text-zinc-400 hover:bg-zinc-200/80 hover:text-zinc-600"
        >
          <GripIcon />
        </button>
        <button
          type="button"
          contentEditable={false}
          aria-label="在下方插入"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => onOpenInsert(e.currentTarget)}
          className="flex h-6 w-5 items-center justify-center rounded text-zinc-400 hover:bg-zinc-200/80 hover:text-zinc-600"
        >
          <PlusIcon />
        </button>
      </div>
    </>
  );
}

function GripIcon() {
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor" aria-hidden>
      <circle cx="2" cy="2" r="1.2" />
      <circle cx="8" cy="2" r="1.2" />
      <circle cx="2" cy="7" r="1.2" />
      <circle cx="8" cy="7" r="1.2" />
      <circle cx="2" cy="12" r="1.2" />
      <circle cx="8" cy="12" r="1.2" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M6 1v10M1 6h10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
