"use client";

import { create } from "zustand";

type SelfPositionStore = {
  position: { x: number; y: number } | undefined;
  setPosition: (x: number, y: number) => void;
  clearPosition: () => void;
};

export const useSelfPositionStore = create<SelfPositionStore>((set) => ({
  position: undefined,
  setPosition: (x, y) => set({ position: { x, y } }),
  clearPosition: () => set({ position: undefined }),
}));
