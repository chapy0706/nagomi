"use client";

import { create } from "zustand";
import type { InvitationTopic } from "@/src/domain/entities/CallInvitation";

export type IncomingInvitation = {
  readonly id: string;
  readonly inviterAuthId: string;
  readonly inviterDisplayName: string;
  readonly inviterAvatarUrl: string | undefined;
  readonly topic: InvitationTopic | undefined;
  readonly expiresAt: Date;
};

type IncomingInvitationStore = {
  queue: IncomingInvitation[];
  current: IncomingInvitation | undefined;
  enqueue: (invitation: IncomingInvitation) => void;
  dismissCurrent: () => void;
  pruneExpired: (now: Date) => void;
  reset: () => void;
};

/**
 * 複数招待が連続して届いた場合はキューイングし、先頭から順に表示する。
 * （issue-15 の検討事項: 後着拒否ではなくキューイングを採用）
 */
export const useIncomingInvitationStore = create<IncomingInvitationStore>((set) => ({
  queue: [],
  current: undefined,

  enqueue: (invitation) =>
    set((state) => {
      if (state.current?.id === invitation.id || state.queue.some((q) => q.id === invitation.id)) {
        return state;
      }
      if (state.current === undefined) {
        return { ...state, current: invitation };
      }
      return { ...state, queue: [...state.queue, invitation] };
    }),

  dismissCurrent: () =>
    set((state) => {
      const [next, ...rest] = state.queue;
      return { current: next, queue: rest };
    }),

  pruneExpired: (now) =>
    set((state) => {
      const isActive = (inv: IncomingInvitation) => now < inv.expiresAt;
      const queue = state.queue.filter(isActive);
      const current =
        state.current && isActive(state.current) ? state.current : (queue.shift() ?? undefined);
      return { current, queue };
    }),

  reset: () => set({ queue: [], current: undefined }),
}));
