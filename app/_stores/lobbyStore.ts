"use client";

import { create } from "zustand";

type LobbyStore = {
  roomId: string | undefined;
  open: (roomId: string) => void;
  close: () => void;
};

export const useLobbyStore = create<LobbyStore>((set) => ({
  roomId: undefined,
  open: (roomId) => set({ roomId }),
  close: () => set({ roomId: undefined }),
}));
