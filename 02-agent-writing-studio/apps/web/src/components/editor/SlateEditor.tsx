"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createEditor, Editor, Element as SlateElement, Range, Transforms } from "slate";
import { withHistory } from "slate-history";
import { Editable, Slate, withReact } from "slate-react";
import { withYjs, YjsEditor } from "@slate-yjs/core";
import * as Y from "yjs";
import isHotkey from "is-hotkey";
import type { BlockElement, BlockType, EditorValue } from "@hello-agent/shared";
import { withBlocks, insertBlock, setBlockType, toggleMark } from "@/lib/slate/plugins";
import type { CustomEditor } from "@/lib/slate/types";
import { Element } from "./Element";
import { Leaf } from "./Leaf";
import { SlashMenu } from "./SlashMenu";
import {
  createCollabConnection,
  AWARENESS_COLORS,
  type CollabConnection,
} from "@/lib/collab/provider";
import { CollabAvatars } from "./CollabAvatars";

const HOTKEYS: Record<string, "bold" | "italic" | "code"> = {
  "mod+b": "bold",
  "mod+i": "italic",
  "mod+`": "code",
};

function initYDocFromValue(doc: Y.Doc, value: EditorValue) {
  const shared = doc.get("content", Y.XmlText) as Y.XmlText;
  if (shared.length > 0) return;
  const temp = withReact(withBlocks(createEditor()));
  temp.children = value;
  Editor.normalize(temp, { force: true });
  const e = withYjs(temp, shared);
  YjsEditor.connect(e);
  YjsEditor.disconnect(e);
}

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export function SlateEditor({
  documentId,
  initialValue,
  onChange,
  onSave,
  highlightedBlockIds = [],
  userName = "作者",
}: {
  documentId: string;
  initialValue: EditorValue;
  onChange: (value: EditorValue) => void;
  onSave: (value: EditorValue) => Promise<void>;
  highlightedBlockIds?: string[];
  userName?: string;
}) {
  const collab = useMemo<CollabConnection>(
    () =>
      createCollabConnection(documentId, {
        name: userName,
        color:
          AWARENESS_COLORS[
            Math.floor(Math.random() * AWARENESS_COLORS.length)
          ],
      }),
    [documentId, userName],
  );

  const sharedType = useMemo(
    () => collab.doc.get("content", Y.XmlText) as Y.XmlText,
    [collab.doc],
  );

  const editor = useMemo(() => {
    return withYjs(
      withHistory(withReact(withBlocks(createEditor()))),
      sharedType,
    ) as CustomEditor;
  }, [sharedType]);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connected = useRef(false);

  useEffect(() => {
    initYDocFromValue(collab.doc, initialValue);
    if (!connected.current) {
      YjsEditor.connect(editor);
      connected.current = true;
      onChange(editor.children as EditorValue);
    }
    return () => {
      if (connected.current) {
        YjsEditor.disconnect(editor);
        connected.current = false;
      }
      collab.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bind once per document
  }, [documentId]);

  const scheduleSave = useCallback(
    (next: EditorValue) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      setSaveStatus("idle");
      saveTimer.current = setTimeout(async () => {
        setSaveStatus("saving");
        try {
          await onSave(next);
          setSaveStatus("saved");
        } catch {
          setSaveStatus("error");
        }
      }, 1200);
    },
    [onSave],
  );

  const handleChange = (newValue: EditorValue) => {
    onChange(newValue);
    scheduleSave(newValue);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    for (const hotkey in HOTKEYS) {
      if (isHotkey(hotkey, event)) {
        event.preventDefault();
        toggleMark(editor, HOTKEYS[hotkey]);
        return;
      }
    }

    if (event.key === "/") {
      const { selection } = editor;
      if (selection && Range.isCollapsed(selection)) {
        setSlashOpen(true);
        setSlashQuery("");
      }
    }

    if (slashOpen && event.key === "Escape") {
      setSlashOpen(false);
    }

    if (event.key === " " && !slashOpen) {
      const { selection } = editor;
      if (!selection || !Range.isCollapsed(selection)) return;
      const blockEntry = Editor.nodes(editor, {
        match: (n) => SlateElement.isElement(n) && Editor.isBlock(editor, n),
      }).next().value as [BlockElement, number[]] | undefined;
      if (!blockEntry) return;
      const [, path] = blockEntry;
      const text = Editor.string(editor, path);
      const shortcuts: Record<string, BlockType> = {
        "#": "heading-one",
        "##": "heading-two",
        "###": "heading-three",
        ">": "blockquote",
        "-": "bulleted-list",
        "*": "bulleted-list",
      };
      for (const [prefix, type] of Object.entries(shortcuts)) {
        if (text === prefix) {
          event.preventDefault();
          Transforms.delete(editor, {
            at: {
              anchor: Editor.start(editor, path),
              focus: Editor.end(editor, path),
            },
          });
          setBlockType(editor, type);
          return;
        }
      }
    }
  };

  const handleSlashSelect = (type: BlockType) => {
    const { selection } = editor;
    if (selection) {
      Transforms.delete(editor, { at: selection });
    }
    insertBlock(editor, type);
    setSlashOpen(false);
  };

  return (
    <div className="relative h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-100 text-xs text-zinc-500">
        <div className="flex items-center gap-2">
          <span>
            {collab.mode === "remote" ? "协同已连接" : "本地编辑"}
          </span>
          {collab.provider && <CollabAvatars provider={collab.provider} />}
        </div>
        <SaveIndicator status={saveStatus} />
      </div>
      <Slate
        editor={editor}
        initialValue={initialValue}
        onChange={(v) => handleChange(v as EditorValue)}
      >
        <div className="flex-1 overflow-y-auto px-8 py-6 max-w-3xl mx-auto w-full">
          <Editable
            renderElement={(props) => (
              <div
                data-block-id={(props.element as { id?: string }).id}
                className={
                  highlightedBlockIds.includes(
                    (props.element as { id?: string }).id ?? "",
                  )
                    ? "bg-amber-100/80 rounded transition-colors duration-500"
                    : undefined
                }
              >
                <Element {...props} />
              </div>
            )}
            renderLeaf={(props) => <Leaf {...props} />}
            placeholder="输入 / 插入块…"
            spellCheck
            autoFocus
            className="outline-none min-h-[60vh]"
            onKeyDown={handleKeyDown}
          />
          {slashOpen && (
            <SlashMenu
              query={slashQuery}
              onSelect={handleSlashSelect}
              onClose={() => setSlashOpen(false)}
            />
          )}
        </div>
      </Slate>
    </div>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  const labels: Record<SaveStatus, string> = {
    idle: "待保存…",
    saving: "保存中…",
    saved: "已保存",
    error: "保存失败",
  };
  return (
    <span className={status === "error" ? "text-red-600" : ""}>
      {labels[status]}
    </span>
  );
}
