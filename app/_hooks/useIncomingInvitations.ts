"use client";

import { useEffect, useMemo } from "react";
import { useIncomingInvitationStore } from "@/app/_stores/incomingInvitationStore";
import { createSupabaseBrowserClient } from "@/src/infrastructure/supabase/browserClient";
import { SupabaseInvitationBroadcastGateway } from "@/src/infrastructure/supabase/SupabaseInvitationBroadcastGateway";

const PRUNE_INTERVAL_MS = 1000;

/**
 * 自分宛の招待ブロードキャストを購読し、ストアのキューに積む。
 * 1秒ごとに失効済みの招待をキューから取り除く（クライアント側タイマー）。
 */
export function useIncomingInvitations(authUserId: string): void {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const gateway = useMemo(() => new SupabaseInvitationBroadcastGateway(supabase), [supabase]);

  const enqueue = useIncomingInvitationStore((s) => s.enqueue);
  const pruneExpired = useIncomingInvitationStore((s) => s.pruneExpired);
  const reset = useIncomingInvitationStore((s) => s.reset);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    gateway
      .subscribeToInvitations(authUserId, (payload) => {
        const expiresAt = new Date(payload.expiresAt);
        if (Number.isNaN(expiresAt.getTime())) return;
        if (Date.now() >= expiresAt.getTime()) return;
        enqueue({
          id: payload.id,
          inviterAuthId: payload.inviterAuthId,
          inviterDisplayName: payload.inviterDisplayName,
          inviterAvatarUrl: payload.inviterAvatarUrl,
          topic: payload.topic,
          expiresAt,
        });
      })
      .then((unsub) => {
        if (cancelled) unsub();
        else unsubscribe = unsub;
      })
      .catch((err) => console.error("[useIncomingInvitations] subscribe failed:", err));

    const interval = window.setInterval(() => {
      pruneExpired(new Date());
    }, PRUNE_INTERVAL_MS);

    return () => {
      cancelled = true;
      unsubscribe?.();
      window.clearInterval(interval);
      reset();
    };
  }, [authUserId, gateway, enqueue, pruneExpired, reset]);
}
