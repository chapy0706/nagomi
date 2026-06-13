"use client";

import { useEffect } from "react";

/** ページ離脱時（タブ・ブラウザ閉じ）に在席ログを推定終了として記録する。 */
export function useAttendanceLogout(): void {
  useEffect(() => {
    const handleUnload = () => {
      navigator.sendBeacon("/api/attendance/logout");
    };
    window.addEventListener("pagehide", handleUnload);
    return () => window.removeEventListener("pagehide", handleUnload);
  }, []);
}
