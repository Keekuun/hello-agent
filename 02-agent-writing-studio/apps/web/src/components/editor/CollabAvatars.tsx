"use client";

import { useEffect, useState } from "react";
import type { HocuspocusProvider } from "@hocuspocus/provider";

type AwarenessUser = { name?: string; color?: string };

export function CollabAvatars({ provider }: { provider: HocuspocusProvider }) {
  const [users, setUsers] = useState<AwarenessUser[]>([]);

  useEffect(() => {
    const awareness = provider.awareness;
    if (!awareness) return;

    const sync = () => {
      const states = awareness.getStates();
      const list: AwarenessUser[] = [];
      states.forEach((state) => {
        const u = state.user as AwarenessUser | undefined;
        if (u?.name) list.push(u);
      });
      setUsers(list);
    };

    awareness.on("change", sync);
    sync();
    return () => awareness.off("change", sync);
  }, [provider]);

  if (users.length === 0) return null;

  return (
    <div className="flex -space-x-1">
      {users.map((u, i) => (
        <span
          key={`${u.name}-${i}`}
          title={u.name}
          className="w-6 h-6 rounded-full text-[10px] flex items-center justify-center text-white border-2 border-white"
          style={{ backgroundColor: u.color ?? "#3b82f6" }}
        >
          {u.name?.slice(0, 1) ?? "?"}
        </span>
      ))}
    </div>
  );
}
