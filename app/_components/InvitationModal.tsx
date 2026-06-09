"use client";

import { useState } from "react";
import { AvatarImage } from "@/app/_components/AvatarImage";
import { useIssueInvitation } from "@/app/_hooks/useIssueInvitation";
import { TOPIC_BUTTON_LABELS } from "@/app/_lib/topicStyle";
import type { InvitationTarget } from "@/app/_stores/invitationStore";
import { blockEmployeeAction } from "@/app/actions/block";
import type { InvitationTopic } from "@/src/domain/entities/CallInvitation";
import { CallTopic } from "@/src/domain/value-objects/CallTopic";

const TOPIC_OPTIONS: { value: InvitationTopic; label: string }[] = CallTopic.KINDS.map((kind) => ({
  value: kind,
  label: TOPIC_BUTTON_LABELS[kind],
}));

const REASON_MESSAGES: Record<string, string> = {
  invitee_unavailable: "相手は現在取り込み中または通話中です",
  blocked: "招待を送ることができません",
  cooldown: "少し時間を置いてから再度お試しください",
  self_invite: "自分自身には招待を送れません",
};

type Props = {
  target: InvitationTarget;
  selfAuthUserId: string;
  selfDisplayName: string;
  selfAvatarUrl: string | undefined;
  onClose: () => void;
};

export function InvitationModal({
  target,
  selfAuthUserId,
  selfDisplayName,
  selfAvatarUrl,
  onClose,
}: Props) {
  const [topic, setTopic] = useState<InvitationTopic | undefined>(undefined);
  const [phase, setPhase] = useState<"idle" | "sending" | "sent" | "error" | "blocking">("idle");
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const { issue } = useIssueInvitation({
    selfAuthUserId,
    selfDisplayName,
    selfAvatarUrl,
  });

  const handleSend = async () => {
    setPhase("sending");
    try {
      const result = await issue({
        inviteeAuthId: target.authUserId,
        inviteeStatus: target.status,
        topic,
      });
      if (result.success) {
        setPhase("sent");
      } else {
        setPhase("error");
        setErrorMessage(REASON_MESSAGES[result.reason] ?? "送信できませんでした");
      }
    } catch {
      setPhase("error");
      setErrorMessage("通信エラーが発生しました");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="招待モーダルを閉じる"
      />

      {/* modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${target.displayName} への招待`}
        className="relative bg-white rounded-2xl shadow-xl w-80 p-6 flex flex-col gap-4"
      >
        {phase === "sent" ? (
          <>
            <p className="text-center text-gray-700 font-medium">
              {target.displayName} さんに招待を送りました
            </p>
            <button
              type="button"
              className="mt-2 w-full py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors"
              onClick={onClose}
            >
              閉じる
            </button>
          </>
        ) : (
          <>
            <div className="flex flex-col items-center gap-2">
              <AvatarImage
                displayName={target.displayName}
                avatarUrl={target.avatarUrl}
                seed={target.employeeId}
                size={56}
              />
              <p className="text-sm font-semibold text-gray-900">{target.displayName}</p>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-2">話題（任意）</p>
              <div className="flex gap-2 flex-wrap">
                {TOPIC_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      topic === opt.value
                        ? "bg-indigo-500 text-white border-indigo-500"
                        : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400"
                    }`}
                    onClick={() => setTopic((prev) => (prev === opt.value ? undefined : opt.value))}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {phase === "error" && errorMessage && (
              <p className="text-xs text-red-600 text-center">{errorMessage}</p>
            )}

            <div className="flex gap-2 mt-1">
              <button
                type="button"
                className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors"
                onClick={onClose}
              >
                今はやめておく
              </button>
              <button
                type="button"
                className="flex-1 py-2 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition-colors disabled:opacity-50"
                onClick={handleSend}
                disabled={phase === "sending"}
              >
                {phase === "sending" ? "送信中..." : "招待する"}
              </button>
            </div>
            <button
              type="button"
              className="w-full py-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
              disabled={phase === "blocking"}
              onClick={async () => {
                setPhase("blocking");
                try {
                  await blockEmployeeAction(target.authUserId);
                } finally {
                  onClose();
                }
              }}
            >
              この人をブロックする
            </button>
          </>
        )}
      </div>
    </div>
  );
}
