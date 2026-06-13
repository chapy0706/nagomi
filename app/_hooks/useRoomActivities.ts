"use client";

import { useEffect, useMemo } from "react";
import { useRoomActivityStore } from "@/app/_stores/roomActivityStore";
import { createRoomActivityGateway } from "@/src/infrastructure/realtimeGatewayFactory";
import { createSupabaseBrowserClient } from "@/src/infrastructure/supabase/browserClient";

/**
 * 与えられた roomIds に対応する活動状況のブロードキャストを購読し、ストアに反映する。
 */
export function useRoomActivities(roomIds: ReadonlyArray<string>): void {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const gateway = useMemo(() => createRoomActivityGateway(supabase), [supabase]);
  const updateActivity = useRoomActivityStore((s) => s.updateActivity);
  const clearActivity = useRoomActivityStore((s) => s.clearActivity);

  const key = useMemo(() => [...roomIds].sort().join(","), [roomIds]);

  useEffect(() => {
    const ids = key ? key.split(",") : [];
    const unsubscribes: Array<() => void> = [];
    let cancelled = false;

    for (const roomId of ids) {
      gateway
        .subscribeToActivity(roomId, (snapshot) => {
          updateActivity(roomId, {
            recentSpeakerEventCount: snapshot.recentSpeakerEventCount,
            emittedAt: new Date(snapshot.emittedAt),
          });
        })
        .then((unsub) => {
          if (cancelled) unsub();
          else unsubscribes.push(unsub);
        })
        .catch((err) => console.error("[useRoomActivities] subscribe failed:", err));
    }

    return () => {
      cancelled = true;
      for (const unsub of unsubscribes) unsub();
      for (const roomId of ids) clearActivity(roomId);
    };
  }, [key, gateway, updateActivity, clearActivity]);
}
