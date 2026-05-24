"use client";

import { create } from "zustand";
import type { PresencePayload } from "@/src/domain/ports/PresenceGateway";

type PresenceStore = {
  presences: ReadonlyMap<string, PresencePayload>;
  setPresences: (presences: ReadonlyArray<PresencePayload>) => void;
  upsertPresence: (presence: PresencePayload) => void;
  removePresence: (employeeId: string) => void;
};

export const usePresenceStore = create<PresenceStore>((set) => ({
  presences: new Map(),
  setPresences: (presences) => set({ presences: new Map(presences.map((p) => [p.employeeId, p])) }),
  upsertPresence: (presence) =>
    set((state) => {
      const next = new Map(state.presences);
      next.set(presence.employeeId, presence);
      return { presences: next };
    }),
  removePresence: (employeeId) =>
    set((state) => {
      const next = new Map(state.presences);
      next.delete(employeeId);
      return { presences: next };
    }),
}));

export const selectPresenceList = (s: PresenceStore): ReadonlyArray<PresencePayload> =>
  Array.from(s.presences.values());

export const selectPresence =
  (employeeId: string) =>
  (s: PresenceStore): PresencePayload | undefined =>
    s.presences.get(employeeId);
