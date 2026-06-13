"use client";

import { create } from "zustand";

export type ReportTarget = {
  authUserId: string;
  displayName: string;
  avatarUrl: string | undefined;
};

type ReportStore = {
  target: ReportTarget | undefined;
  openFor: (target: ReportTarget) => void;
  close: () => void;
};

export const useReportStore = create<ReportStore>((set) => ({
  target: undefined,
  openFor: (target) => set({ target }),
  close: () => set({ target: undefined }),
}));
