import type { BlockElement, DocumentOutlineNode } from "@hello-agent/shared";
import type { EditorValue } from "@hello-agent/shared";

function blockText(block: BlockElement): string {
  return (block.children as { text: string }[])
    .map((c) => c.text ?? "")
    .join("");
}

export function buildOutline(value: EditorValue): DocumentOutlineNode[] {
  return value
    .filter((b) => b.type.startsWith("heading-"))
    .map((b) => ({
      id: b.id,
      type: b.type,
      text: blockText(b),
      level:
        b.type === "heading-one" ? 1 : b.type === "heading-two" ? 2 : 3,
    }));
}

export function findBlocksByIds(
  value: EditorValue,
  ids: string[],
): BlockElement[] {
  const set = new Set(ids);
  return value.filter((b) => set.has(b.id));
}

export function applyPatches(
  value: EditorValue,
  patches: {
    insert?: { afterBlockId: string; blocks: BlockElement[] };
    replace?: { blockIds: string[]; blocks: BlockElement[] };
    delete?: { blockIds: string[] };
    setTitle?: { title: string };
  },
): EditorValue {
  let next = [...value];

  if (patches.setTitle) {
    const idx = next.findIndex((b) => b.type === "heading-one");
    if (idx >= 0) {
      next[idx] = {
        ...next[idx],
        children: [{ text: patches.setTitle.title }],
      };
    }
  }

  if (patches.delete?.blockIds.length) {
    const remove = new Set(patches.delete.blockIds);
    next = next.filter((b) => !remove.has(b.id));
  }

  if (patches.replace?.blockIds.length) {
    const firstId = patches.replace.blockIds[0];
    const idx = next.findIndex((b) => b.id === firstId);
    if (idx >= 0) {
      const remove = new Set(patches.replace.blockIds);
      next = next.filter((b) => !remove.has(b.id));
      next.splice(idx, 0, ...patches.replace.blocks);
    }
  }

  if (patches.insert) {
    const idx = next.findIndex((b) => b.id === patches.insert!.afterBlockId);
    const at = idx >= 0 ? idx + 1 : next.length;
    next.splice(at, 0, ...patches.insert.blocks);
  }

  return next;
}
