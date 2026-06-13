"use client";

import { useEffect } from "react";

/**
 * 通話中など画面を消灯させたくない場面で WakeLock を保持する。
 * WakeLock API 非対応ブラウザでは何もしない。
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    if (!("wakeLock" in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;

    navigator.wakeLock
      .request("screen")
      .then((s) => {
        sentinel = s;
      })
      .catch(() => {});

    return () => {
      sentinel?.release().catch(() => {});
    };
  }, [active]);
}
