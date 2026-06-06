"use client";

import { useEffect, useState } from "react";
import { TOPIC_COLORS, TOPIC_ICONS, TOPIC_ROOM_LABELS } from "@/app/_lib/topicStyle";
import { classifyActivity, useRoomActivityStore } from "@/app/_stores/roomActivityStore";
import { useRoomSessionStore } from "@/app/_stores/roomSessionStore";
import type { CallTopicKind } from "@/src/domain/value-objects/CallTopic";

type RoomBadgeProps = {
  roomId: string;
  topic: CallTopicKind;
  participantCount: number;
  capacityMax: number;
};

const ACTIVITY_LABEL: Record<"quiet" | "normal" | "lively", string> = {
  quiet: "静か",
  normal: "会話中",
  lively: "盛り上がり中",
};

const ACTIVITY_TONE: Record<"quiet" | "normal" | "lively", string> = {
  quiet: "text-gray-400",
  normal: "text-gray-700",
  lively: "text-orange-600 font-semibold",
};

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}分`;
  const h = Math.floor(m / 60);
  const remainingMinutes = m % 60;
  return remainingMinutes === 0 ? `${h}時間` : `${h}時間${remainingMinutes}分`;
}

export function RoomBadge({ roomId, topic, participantCount, capacityMax }: RoomBadgeProps) {
  const startedAt = useRoomSessionStore((s) => s.startedAt.get(roomId));
  const activityState = useRoomActivityStore((s) => s.byRoom.get(roomId));
  const colors = TOPIC_COLORS[topic];

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!startedAt) return;
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, [startedAt]);

  const elapsedSeconds = startedAt
    ? Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / 1000))
    : 0;
  const level = classifyActivity(activityState, now);

  return (
    <div
      className={`flex flex-col items-center justify-center gap-0.5 w-full h-full px-2 py-1 border-2 rounded-lg select-none ${colors.container}`}
    >
      <span className="text-xs font-semibold flex items-center gap-1">
        <span aria-hidden>{TOPIC_ICONS[topic]}</span>
        {TOPIC_ROOM_LABELS[topic]}
      </span>
      <span className="text-[11px] font-medium">
        {participantCount} / {capacityMax}
      </span>
      <span className="text-[10px] text-gray-700">
        {startedAt ? formatElapsed(elapsedSeconds) : "未開始"}
      </span>
      <span className={`text-[10px] flex items-center gap-1 ${ACTIVITY_TONE[level]}`}>
        <span
          aria-hidden
          className={`inline-block w-1.5 h-1.5 rounded-full ${
            level === "quiet" ? "bg-gray-300" : colors.dot
          } ${level === "lively" ? "animate-pulse" : ""}`}
        />
        {ACTIVITY_LABEL[level]}
      </span>
    </div>
  );
}
