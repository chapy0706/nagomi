"use client";

import { create } from "zustand";

type VideoStore = {
  isOpen: boolean;
  roomId: string | undefined;
  open: (roomId: string) => void;
  close: () => void;
};

export const useVideoStore = create<VideoStore>((set) => ({
  isOpen: false,
  roomId: undefined,
  open: (roomId) => set({ isOpen: true, roomId }),
  close: () => set({ isOpen: false, roomId: undefined }),
}));
