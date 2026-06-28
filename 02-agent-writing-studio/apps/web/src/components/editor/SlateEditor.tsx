"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createEditor, Editor, Range, Transforms } from "slate";
import { withHistory } from "slate-history";
import { Editable, ReactEditor, Slate, withReact } from "slate-react";
import { withYjs, YjsEditor } from "@slate-yjs/core";
import * as Y from "yjs";
import isHotkey from "is-hotkey";
import type { BlockType, EditorValue } from "@hello-agent/shared";
import { withBlocks, insertBlock, toggleMark, resetDocumentToEmptyParagraph, selectAllDocument, shouldClearDocumentOnDelete } from "@/lib/slate/plugins";
import {
  applyMarkdownShortcutOnEnter,
  applyMarkdownShortcutOnPaste,
  applyMarkdownShortcutOnSpace,
} from "@/lib/slate/markdown-shortcuts";
import {
  copyBlockAt,
  cutBlockAt,
  deleteBlockAt,
  duplicateBlockAt,
  getBlockTypeAt,
  insertBlockAfter,
  setBlockTypeAt,
} from "@/lib/slate/block-actions";
import type { CustomEditor } from "@/lib/slate/types";
import { BlockWrapper } from "./BlockWrapper";
import { Leaf } from "./Leaf";
import { SlashMenu } from "./SlashMenu";
import { BlockMenu } from "./BlockMenu";
import { InsertBlockMenu } from "./InsertBlockMenu";
import { SelectionToolbar } from "./SelectionToolbar";
import {
  EditorChromeContext,
  type BlockMenuAnchor,
  type InsertMenuAnchor,
} from "./EditorChromeContext";
import {
  createCollabConnection,
  AWARENESS_COLORS,
  type CollabConnection,
  type CollabConnectionStatus,
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
  updatedAt,
}: {
  documentId: string;
  initialValue: EditorValue;
  onChange: (value: EditorValue) => void;
  onSave: (value: EditorValue) => Promise<void>;
  highlightedBlockIds?: string[];
  userName?: string;
  updatedAt?: string;
}) {
  const [collabStatus, setCollabStatus] = useState<CollabConnectionStatus>(
    () =>
      process.env.NEXT_PUBLIC_ENABLE_COLLAB === "true" ||
      process.env.NEXT_PUBLIC_ENABLE_COLLAB === "1"
        ? "connecting"
        : "local",
  );
  const collab = useMemo<CollabConnection>(
    () =>
      createCollabConnection(
        documentId,
        {
          name: userName,
          color:
            AWARENESS_COLORS[
              Math.floor(Math.random() * AWARENESS_COLORS.length)
            ],
        },
        setCollabStatus,
      ),
    [documentId, userName],
  );

  const collabRemote = collab.mode === "remote";
  const collabReady = !collabRemote || collabStatus === "synced";

  const sharedType = useMemo(
    () => collab.doc.get("content", Y.XmlText) as Y.XmlText,
    [collab.doc],
  );

  const editor = useMemo(() => {
    const base = withReact(withBlocks(createEditor()));
    const enhanced = collabRemote ? base : withHistory(base);
    if (collabRemote) {
      return withYjs(enhanced, sharedType) as CustomEditor;
    }
    return enhanced as CustomEditor;
  }, [sharedType, collabRemote]);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [blockMenu, setBlockMenu] = useState<BlockMenuAnchor | null>(null);
  const [insertMenu, setInsertMenu] = useState<InsertMenuAnchor | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notifyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connected = useRef(false);
  const mountedValue = useRef(initialValue);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    connected.current = false;
  }, [documentId]);

  useEffect(() => {
    return () => {
      collab.destroy();
    };
  }, [collab]);

  useEffect(() => {
    if (!collabRemote || collabStatus !== "synced" || connected.current) {
      return;
    }

    initYDocFromValue(collab.doc, mountedValue.current);
    YjsEditor.connect(editor);
    connected.current = true;
    onChangeRef.current(editor.children as EditorValue);

    return () => {
      if (connected.current) {
        YjsEditor.disconnect(editor);
        connected.current = false;
      }
    };
  }, [collabRemote, collabStatus, collab.doc, documentId, editor]);

  const scheduleSave = useCallback(
    (next: EditorValue) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
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

  const handleChange = useCallback(
    (newValue: EditorValue) => {
      if (notifyTimer.current) clearTimeout(notifyTimer.current);
      notifyTimer.current = setTimeout(() => {
        onChangeRef.current(newValue);
      }, 200);
      scheduleSave(newValue);
    },
    [scheduleSave],
  );

  const handleBlockMenuAction = useCallback(
    async (actionId: string) => {
      if (!blockMenu) return;
      const { path } = blockMenu;
      switch (actionId) {
        case "cut":
          await cutBlockAt(editor, path);
          break;
        case "copy":
          await copyBlockAt(editor, path);
          break;
        case "duplicate":
          duplicateBlockAt(editor, path);
          break;
        case "delete":
          deleteBlockAt(editor, path);
          break;
        case "add-below":
          insertBlockAfter(editor, path);
          break;
      }
      setBlockMenu(null);
    },
    [blockMenu, editor],
  );

  const handleBlockTypeSelect = useCallback(
    (type: BlockType) => {
      if (!blockMenu) return;
      setBlockTypeAt(editor, blockMenu.path, type);
      setBlockMenu(null);
    },
    [blockMenu, editor],
  );

  const handleInsertSelect = useCallback(
    (type: BlockType) => {
      if (!insertMenu) return;
      insertBlockAfter(editor, insertMenu.path, type);
      setInsertMenu(null);
    },
    [insertMenu, editor],
  );

  const chromeValue = useMemo(
    () => ({
      highlightedBlockIds,
      openBlockMenu: setBlockMenu,
      openInsertMenu: setInsertMenu,
    }),
    [highlightedBlockIds],
  );

  const renderElement = useCallback(
    (props: Parameters<typeof BlockWrapper>[0]) => <BlockWrapper {...props} />,
    [],
  );
  const renderLeaf = useCallback(
    (props: Parameters<typeof Leaf>[0]) => <Leaf {...props} />,
    [],
  );

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.nativeEvent.isComposing || ReactEditor.isComposing?.(editor)) {
      return;
    }

    if (isHotkey("mod+a", event)) {
      event.preventDefault();
      selectAllDocument(editor);
      return;
    }

    if (
      (event.key === "Backspace" || event.key === "Delete") &&
      editor.selection &&
      !Range.isCollapsed(editor.selection) &&
      shouldClearDocumentOnDelete(editor)
    ) {
      event.preventDefault();
      resetDocumentToEmptyParagraph(editor);
      return;
    }

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
      if (applyMarkdownShortcutOnSpace(editor)) {
        event.preventDefault();
        return;
      }
    }

    if (event.key === "Enter" && !slashOpen && !event.shiftKey) {
      if (applyMarkdownShortcutOnEnter(editor)) {
        event.preventDefault();
        Editor.insertBreak(editor);
        return;
      }
    }
  };

  const handlePaste = (event: React.ClipboardEvent) => {
    if (ReactEditor.isComposing?.(editor)) {
      return;
    }
    const plain = event.clipboardData.getData("text/plain");
    if (plain && applyMarkdownShortcutOnPaste(editor, plain)) {
      event.preventDefault();
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
    <div className="relative flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-2 text-xs text-zinc-500">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                collabStatus === "synced"
                  ? "bg-emerald-500"
                  : collabStatus === "connecting"
                    ? "bg-amber-400"
                    : collabStatus === "disconnected"
                      ? "bg-red-400"
                      : "bg-zinc-300"
              }`}
            />
            {collabStatusLabel(collabStatus)}
          </span>
          {collab.provider && <CollabAvatars provider={collab.provider} />}
        </div>
        <SaveIndicator status={saveStatus} />
      </div>

      <EditorChromeContext.Provider value={chromeValue}>
        <Slate
          editor={editor}
          initialValue={mountedValue.current}
          onChange={(v) => handleChange(v as EditorValue)}
        >
          <div className="editor-canvas flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[820px] px-16 pb-24 pt-10">
              {updatedAt && (
                <p className="mb-6 text-sm text-zinc-400">
                  {userName} · {updatedAt}
                </p>
              )}

              <Editable
                readOnly={!collabReady}
                renderElement={renderElement}
                renderLeaf={renderLeaf}
                placeholder={
                  collabReady
                    ? "输入正文，或按 / 插入内容块"
                    : "正在连接协同服务…"
                }
                spellCheck={false}
                className="outline-none min-h-[50vh] text-[15px] leading-7 text-zinc-800"
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
              />

              {slashOpen && (
                <SlashMenu
                  query={slashQuery}
                  onSelect={handleSlashSelect}
                  onClose={() => setSlashOpen(false)}
                />
              )}
            </div>
          </div>

          <SelectionToolbar />
        </Slate>
      </EditorChromeContext.Provider>

      {blockMenu && (
        <BlockMenu
          anchor={blockMenu}
          activeType={getBlockTypeAt(editor, blockMenu.path)}
          onSelectType={handleBlockTypeSelect}
          onAction={handleBlockMenuAction}
          onClose={() => setBlockMenu(null)}
        />
      )}
      {insertMenu && (
        <InsertBlockMenu
          anchor={insertMenu}
          onSelect={handleInsertSelect}
          onClose={() => setInsertMenu(null)}
        />
      )}
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
    <span className={status === "error" ? "text-red-600" : "text-zinc-400"}>
      {labels[status]}
    </span>
  );
}

function collabStatusLabel(status: CollabConnectionStatus): string {
  switch (status) {
    case "synced":
      return "协同已连接";
    case "connecting":
      return "协同连接中…";
    case "disconnected":
      return "协同已断开";
    default:
      return "本地编辑";
  }
}
