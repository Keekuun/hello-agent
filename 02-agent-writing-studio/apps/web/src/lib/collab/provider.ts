import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";

export type CollabMode = "local" | "remote";

export type CollabConnectionStatus =
  | "local"
  | "connecting"
  | "synced"
  | "disconnected";

export interface CollabConnection {
  doc: Y.Doc;
  mode: CollabMode;
  provider?: HocuspocusProvider;
  destroy: () => void;
}

function isCollabEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_ENABLE_COLLAB === "true" ||
    process.env.NEXT_PUBLIC_ENABLE_COLLAB === "1"
  );
}

export function createCollabConnection(
  documentId: string,
  user: { name: string; color: string },
  onStatusChange?: (status: CollabConnectionStatus) => void,
): CollabConnection {
  const doc = new Y.Doc();
  const wsUrl =
    process.env.NEXT_PUBLIC_COLLAB_WS_URL ?? "ws://localhost:1234";

  if (!isCollabEnabled()) {
    onStatusChange?.("local");
    return { doc, mode: "local", destroy: () => doc.destroy() };
  }

  onStatusChange?.("connecting");

  const provider = new HocuspocusProvider({
    url: wsUrl,
    name: documentId,
    document: doc,
    onConnect: () => {
      provider.setAwarenessField("user", {
        name: user.name,
        color: user.color,
      });
      onStatusChange?.("connecting");
    },
    onSynced: () => {
      onStatusChange?.("synced");
    },
    onDisconnect: () => {
      onStatusChange?.("disconnected");
    },
  });

  return {
    doc,
    mode: "remote",
    provider,
    destroy: () => {
      provider.destroy();
      doc.destroy();
    },
  };
}

export const AWARENESS_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#a855f7",
  "#ec4899",
];
