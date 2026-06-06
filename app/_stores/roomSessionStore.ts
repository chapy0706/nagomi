"use client";

import { create } from "zustand";

type RoomSessionStore = {
  startedAt: ReadonlyMap<string, Date>;
  beginSession: (roomId: string, at: Date) => void;
  endSession: (roomId: string) => void;
};

/**
 * 各通話ルームの「最初に1人入った時刻」を追跡する。経過時間表示に使う。
 * presence ベースの簡易計算であり、サーバ側で厳密に管理しない。
 */
export const useRoomSessionStore = create<RoomSessionStore>((set, get) => ({
  startedAt: new Map(),
  beginSession: (roomId, at) => {
    if (get().startedAt.has(roomId)) return;
    set((state) => {
      const next = new Map(state.startedAt);
      next.set(roomId, at);
      return { startedAt: next };
    });
  },
  endSession: (roomId) =>
    set((state) => {
      if (!state.startedAt.has(roomId)) return state;
      const next = new Map(state.startedAt);
      next.delete(roomId);
      return { startedAt: next };
    }),
}));
