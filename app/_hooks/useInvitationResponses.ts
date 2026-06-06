"use client";

import { useEffect, useMemo } from "react";
import { useVideoStore } from "@/app/_stores/videoStore";
import { createSupabaseBrowserClient } from "@/src/infrastructure/supabase/browserClient";
import { SupabaseInvitationBroadcastGateway } from "@/src/infrastructure/supabase/SupabaseInvitationBroadcastGateway";

/**
 * 招待者側で、自分が送った招待への承諾通知を購読する。
 * 承諾を受信したら同じ roomId の通話画面を開き、両者が同じ Jitsi ルームに参加する。
 * 辞退については通知が来ない（ADR-006: 拒否したことを相手に伝えない）。
 */
export function useInvitationResponses(authUserId: string): void {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const gateway = useMemo(() => new SupabaseInvitationBroadcastGateway(supabase), [supabase]);
  const openRoom = useVideoStore((s) => s.open);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    gateway
      .subscribeToAcceptances(authUserId, (payload) => {
        openRoom(payload.roomId);
      })
      .then((unsub) => {
        if (cancelled) unsub();
        else unsubscribe = unsub;
      })
      .catch((err) => console.error("[useInvitationResponses] subscribe failed:", err));

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [authUserId, gateway, openRoom]);
}
