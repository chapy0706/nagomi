"use client";

import { create } from "zustand";

const STORAGE_KEY = "nagomi:devicePreferences";

export type DevicePreferences = {
  audioInputId: string | undefined;
  videoInputId: string | undefined;
};

type DevicePreferenceStore = DevicePreferences & {
  setAudioInputId: (id: string | undefined) => void;
  setVideoInputId: (id: string | undefined) => void;
  hydrate: () => void;
};

function readFromStorage(): DevicePreferences {
  if (typeof window === "undefined") return { audioInputId: undefined, videoInputId: undefined };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { audioInputId: undefined, videoInputId: undefined };
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return { audioInputId: undefined, videoInputId: undefined };
    }
    const obj = parsed as Record<string, unknown>;
    return {
      audioInputId: typeof obj.audioInputId === "string" ? obj.audioInputId : undefined,
      videoInputId: typeof obj.videoInputId === "string" ? obj.videoInputId : undefined,
    };
  } catch {
    return { audioInputId: undefined, videoInputId: undefined };
  }
}

function persist(prefs: DevicePreferences): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // 容量制限・プライベートモード等で失敗しても利用継続を優先する
  }
}

export const useDevicePreferenceStore = create<DevicePreferenceStore>((set, get) => ({
  audioInputId: undefined,
  videoInputId: undefined,
  setAudioInputId: (audioInputId) => {
    set({ audioInputId });
    persist({ audioInputId, videoInputId: get().videoInputId });
  },
  setVideoInputId: (videoInputId) => {
    set({ videoInputId });
    persist({ audioInputId: get().audioInputId, videoInputId });
  },
  hydrate: () => {
    const stored = readFromStorage();
    set(stored);
  },
}));
