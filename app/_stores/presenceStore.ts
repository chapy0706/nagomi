"use client";

import { create } from "zustand";
import type { PresencePayload } from "@/src/domain/ports/PresenceGateway";

type PresenceStore = {
  presences: ReadonlyMap<string, PresencePayload>;
  presenceList: ReadonlyArray<PresencePayload>;
  setPresences: (presences: ReadonlyArray<PresencePayload>) => void;
  upsertPresence: (presence: PresencePayload) => void;
  removePresence: (employeeId: string) => void;
};

export const usePresenceStore = create<PresenceStore>((set) => ({
  presences: new Map(),
  presenceList: [],
  setPresences: (presences) =>
    set({
      presences: new Map(presences.map((p) => [p.employeeId, p])),
      presenceList: presences,
    }),
  upsertPresence: (presence) =>
    set((state) => {
      const next = new Map(state.presences);
      next.set(presence.employeeId, presence);
      const presenceList = Array.from(next.values());
      return { presences: next, presenceList };
    }),
  removePresence: (employeeId) =>
    set((state) => {
      const next = new Map(state.presences);
      next.delete(employeeId);
      const presenceList = Array.from(next.values());
      return { presences: next, presenceList };
    }),
}));

// presenceList は store 内で更新時のみ生成されるため参照が安定する
export const selectPresenceList = (s: PresenceStore): ReadonlyArray<PresencePayload> =>
  s.presenceList;

export const selectPresence =
  (employeeId: string) =>
  (s: PresenceStore): PresencePayload | undefined =>
    s.presences.get(employeeId);
