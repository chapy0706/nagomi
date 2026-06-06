"use client";

import { create } from "zustand";

export type RoomActivityState = {
  recentSpeakerEventCount: number;
  emittedAt: Date;
};

type RoomActivityStore = {
  byRoom: ReadonlyMap<string, RoomActivityState>;
  updateActivity: (roomId: string, state: RoomActivityState) => void;
  clearActivity: (roomId: string) => void;
};

export const useRoomActivityStore = create<RoomActivityStore>((set) => ({
  byRoom: new Map(),
  updateActivity: (roomId, state) =>
    set((s) => {
      const next = new Map(s.byRoom);
      next.set(roomId, state);
      return { byRoom: next };
    }),
  clearActivity: (roomId) =>
    set((s) => {
      if (!s.byRoom.has(roomId)) return s;
      const next = new Map(s.byRoom);
      next.delete(roomId);
      return { byRoom: next };
    }),
}));

export type ActivityLevel = "quiet" | "normal" | "lively";

const STALE_AFTER_MS = 15_000;

export function classifyActivity(state: RoomActivityState | undefined, now: Date): ActivityLevel {
  if (!state) return "quiet";
  if (now.getTime() - state.emittedAt.getTime() > STALE_AFTER_MS) return "quiet";
  if (state.recentSpeakerEventCount >= 5) return "lively";
  if (state.recentSpeakerEventCount >= 1) return "normal";
  return "quiet";
}
