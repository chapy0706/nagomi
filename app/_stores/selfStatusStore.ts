"use client";

import { create } from "zustand";
import type { ManualStatus, PresenceStatus } from "@/src/domain/ports/PresenceGateway";

type SelfStatusStore = {
  manualStatus: ManualStatus;
  isInCall: boolean;
  setManualStatus: (status: ManualStatus) => void;
  enterCall: () => void;
  exitCall: () => void;
};

export const useSelfStatusStore = create<SelfStatusStore>((set) => ({
  manualStatus: "available",
  isInCall: false,
  setManualStatus: (manualStatus) => set({ manualStatus }),
  enterCall: () => set({ isInCall: true }),
  exitCall: () => set({ isInCall: false }),
}));

export const selectEffectiveStatus = (s: SelfStatusStore): PresenceStatus =>
  s.isInCall ? "in_call" : s.manualStatus;

export const selectIsCallable = (s: SelfStatusStore): boolean =>
  !s.isInCall && s.manualStatus !== "busy";
