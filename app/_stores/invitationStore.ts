"use client";

import { create } from "zustand";
import type { PresenceStatus } from "@/src/domain/ports/PresenceGateway";

export type InvitationTarget = {
  employeeId: string;
  displayName: string;
  avatarUrl?: string;
  authUserId: string;
  status: PresenceStatus;
};

type InvitationStore = {
  target: InvitationTarget | undefined;
  openFor: (target: InvitationTarget) => void;
  close: () => void;
};

export const useInvitationStore = create<InvitationStore>((set) => ({
  target: undefined,
  openFor: (target) => set({ target }),
  close: () => set({ target: undefined }),
}));
