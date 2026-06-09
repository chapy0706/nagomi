"use client";

import { useEffect, useMemo, useState } from "react";
import { AvatarImage } from "@/app/_components/AvatarImage";
import { TOPIC_BUTTON_LABELS } from "@/app/_lib/topicStyle";
import {
  type IncomingInvitation,
  useIncomingInvitationStore,
} from "@/app/_stores/incomingInvitationStore";
import { useVideoStore } from "@/app/_stores/videoStore";
import { blockEmployeeAction } from "@/app/actions/block";
import { AcceptCallInvitation } from "@/src/application/use-cases/AcceptCallInvitation";
import { DeclineCallInvitation } from "@/src/application/use-cases/DeclineCallInvitation";
import { SystemClock } from "@/src/infrastructure/SystemClock";
import { createSupabaseBrowserClient } from "@/src/infrastructure/supabase/browserClient";
import { SupabaseCallInvitationRepository } from "@/src/infrastructure/supabase/SupabaseCallInvitationRepository";
import { SupabaseInvitationBroadcastGateway } from "@/src/infrastructure/supabase/SupabaseInvitationBroadcastGateway";

type Phase = "idle" | "processing";

export function IncomingInvitationModal() {
  const current = useIncomingInvitationStore((s) => s.current);
  if (!current) return null;
  // current.id を key にして、招待が切り替わったらタイマー等の state をリセットする
  return <IncomingInvitationModalInner key={current.id} invitation={current} />;
}

function IncomingInvitationModalInner({ invitation }: { invitation: IncomingInvitation }) {
  const dismissCurrent = useIncomingInvitationStore((s) => s.dismissCurrent);
  const openRoom = useVideoStore((s) => s.open);
  const [phase, setPhase] = useState<Phase>("idle");
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.ceil((invitation.expiresAt.getTime() - Date.now()) / 1000))
  );

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const acceptUseCase = useMemo(
    () =>
      new AcceptCallInvitation(
        new SupabaseCallInvitationRepository(supabase),
        new SupabaseInvitationBroadcastGateway(supabase),
        SystemClock
      ),
    [supabase]
  );
  const declineUseCase = useMemo(
    () => new DeclineCallInvitation(new SupabaseCallInvitationRepository(supabase)),
    [supabase]
  );

  useEffect(() => {
    const tick = () => {
      const remaining = Math.max(
        0,
        Math.ceil((invitation.expiresAt.getTime() - Date.now()) / 1000)
      );
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        // 失効: モーダルを閉じる。サーバ側 status は変更しない（クライアント側タイマーで管理）
        dismissCurrent();
      }
    };
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [invitation.expiresAt, dismissCurrent]);

  const handleAccept = async () => {
    if (phase !== "idle") return;
    setPhase("processing");
    try {
      const result = await acceptUseCase.execute({
        invitationId: invitation.id,
        inviterAuthId: invitation.inviterAuthId,
        expiresAt: invitation.expiresAt,
      });
      if (result.success) {
        openRoom(result.roomId);
      }
    } catch (err) {
      console.error("[IncomingInvitationModal] accept failed:", err);
    } finally {
      dismissCurrent();
    }
  };

  const handleDecline = async () => {
    if (phase !== "idle") return;
    setPhase("processing");
    try {
      await declineUseCase.execute({ invitationId: invitation.id });
    } catch (err) {
      console.error("[IncomingInvitationModal] decline failed:", err);
    } finally {
      dismissCurrent();
    }
  };

  const handleBlock = async () => {
    if (phase !== "idle") return;
    setPhase("processing");
    try {
      await blockEmployeeAction(invitation.inviterAuthId);
      await declineUseCase.execute({ invitationId: invitation.id });
    } catch (err) {
      console.error("[IncomingInvitationModal] block failed:", err);
    } finally {
      dismissCurrent();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${invitation.inviterDisplayName} からの招待`}
        className="relative bg-white rounded-2xl shadow-2xl w-80 p-6 flex flex-col gap-4 pointer-events-auto"
      >
        <div className="flex flex-col items-center gap-2">
          <AvatarImage
            displayName={invitation.inviterDisplayName}
            avatarUrl={invitation.inviterAvatarUrl}
            seed={invitation.inviterAuthId}
            size={64}
          />
          <p className="text-sm font-semibold text-gray-900">{invitation.inviterDisplayName}</p>
          <p className="text-xs text-gray-500">さんから声がかかっています</p>
          {invitation.topic && (
            <span className="px-2 py-0.5 mt-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
              {TOPIC_BUTTON_LABELS[invitation.topic]}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            className="w-full py-2.5 rounded-lg bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 transition-colors disabled:opacity-50"
            onClick={handleAccept}
            disabled={phase !== "idle"}
          >
            参加する
          </button>
          <button
            type="button"
            className="w-full py-2.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
            onClick={handleDecline}
            disabled={phase !== "idle"}
          >
            今はやめておく
          </button>
          <button
            type="button"
            className="w-full py-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            onClick={handleBlock}
            disabled={phase !== "idle"}
          >
            この人をブロックする
          </button>
        </div>

        <p className="text-center text-xs text-gray-400" aria-live="polite">
          残り {secondsLeft} 秒
        </p>
      </div>
    </div>
  );
}
