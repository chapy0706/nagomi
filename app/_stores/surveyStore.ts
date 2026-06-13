"use client";

import { create } from "zustand";

type SurveyStore = {
  isNpsOpen: boolean;
  openNps: () => void;
  close: () => void;
};

export const useSurveyStore = create<SurveyStore>((set) => ({
  isNpsOpen: false,
  openNps: () => set({ isNpsOpen: true }),
  close: () => set({ isNpsOpen: false }),
}));
