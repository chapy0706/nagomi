"use client";

import { create } from "zustand";

type OpenOptions = {
  startWithAudioMuted?: boolean;
  startWithVideoMuted?: boolean;
};

type VideoStore = {
  isOpen: boolean;
  roomId: string | undefined;
  startWithAudioMuted: boolean;
  startWithVideoMuted: boolean;
  open: (roomId: string, options?: OpenOptions) => void;
  close: () => void;
};

export const useVideoStore = create<VideoStore>((set) => ({
  isOpen: false,
  roomId: undefined,
  // ADR-007: カメラ OFF をデフォルト、マイクは ON
  startWithAudioMuted: false,
  startWithVideoMuted: true,
  open: (roomId, options) =>
    set({
      isOpen: true,
      roomId,
      startWithAudioMuted: options?.startWithAudioMuted ?? false,
      startWithVideoMuted: options?.startWithVideoMuted ?? true,
    }),
  close: () => set({ isOpen: false, roomId: undefined }),
}));
