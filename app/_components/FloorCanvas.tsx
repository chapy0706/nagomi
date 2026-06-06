"use client";

import { useCallback, useEffect, useMemo } from "react";
import { AvatarMarker } from "@/app/_components/AvatarMarker";
import { IncomingInvitationModal } from "@/app/_components/IncomingInvitationModal";
import { InvitationModal } from "@/app/_components/InvitationModal";
import { StatusPill } from "@/app/_components/StatusPill";
import { VideoOverlay } from "@/app/_components/VideoOverlay";
import { useIncomingInvitations } from "@/app/_hooks/useIncomingInvitations";
import { useInvitationResponses } from "@/app/_hooks/useInvitationResponses";
import { usePresence } from "@/app/_hooks/usePresence";
import { useThrottledMove } from "@/app/_hooks/useThrottledMove";
import { useInvitationStore } from "@/app/_stores/invitationStore";
import { selectPresenceList, usePresenceStore } from "@/app/_stores/presenceStore";
import { useSelfPositionStore } from "@/app/_stores/selfPositionStore";
import { selectEffectiveStatus, useSelfStatusStore } from "@/app/_stores/selfStatusStore";
import { useVideoStore } from "@/app/_stores/videoStore";
import { buildFloor, DEFAULT_FLOOR_LAYOUT } from "@/src/domain/config/floorLayout";
import type { MeetingRoomTopic } from "@/src/domain/entities/MeetingRoom";
import { createSupabaseBrowserClient } from "@/src/infrastructure/supabase/browserClient";
import { SupabasePresenceGateway } from "@/src/infrastructure/supabase/SupabasePresenceGateway";

const FLOOR_WIDTH = DEFAULT_FLOOR_LAYOUT.width;
const FLOOR_HEIGHT = DEFAULT_FLOOR_LAYOUT.height;
const ARROW_STEP = 40;
const ROOM_W = 120;
const ROOM_H = 80;

const TOPIC_LABELS: Record<MeetingRoomTopic, string> = {
  counseling: "相談室",
  casual: "雑談室",
  meeting: "会議室",
};

const TOPIC_COLORS: Record<MeetingRoomTopic, string> = {
  counseling: "bg-indigo-100 border-indigo-400 text-indigo-800",
  casual: "bg-green-100 border-green-400 text-green-800",
  meeting: "bg-blue-100 border-blue-400 text-blue-800",
};

type FloorCanvasProps = {
  authUserId: string;
  selfEmployeeId: string;
  selfDisplayName: string;
  selfAvatarUrl?: string | undefined;
};

export function FloorCanvas({
  authUserId,
  selfEmployeeId,
  selfDisplayName,
  selfAvatarUrl,
}: FloorCanvasProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const gateway = useMemo(() => new SupabasePresenceGateway(supabase), [supabase]);
  const floor = useMemo(() => buildFloor(DEFAULT_FLOOR_LAYOUT), []);

  usePresence(authUserId, gateway);
  useIncomingInvitations(authUserId);
  useInvitationResponses(authUserId);
  const move = useThrottledMove(floor, gateway);

  const presences = usePresenceStore(selectPresenceList);
  const selfPosition = useSelfPositionStore((s) => s.position);
  const selfStatus = useSelfStatusStore(selectEffectiveStatus);
  const openRoom = useVideoStore((s) => s.open);
  const invitationTarget = useInvitationStore((s) => s.target);
  const openInvitation = useInvitationStore((s) => s.openFor);
  const closeInvitation = useInvitationStore((s) => s.close);

  // Sync local status changes to presence gateway
  useEffect(() => {
    gateway.updateStatus(selfStatus).catch((err) => {
      console.error("[FloorCanvas] updateStatus failed:", err);
    });
  }, [selfStatus, gateway]);

  const handleFloorClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left + e.currentTarget.scrollLeft;
      const y = e.clientY - rect.top + e.currentTarget.scrollTop;
      move(x, y);
    },
    [move]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      const touch = e.changedTouches[0];
      if (!touch) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = touch.clientX - rect.left + e.currentTarget.scrollLeft;
      const y = touch.clientY - rect.top + e.currentTarget.scrollTop;
      move(x, y);
    },
    [move]
  );

  const handleRoomClick = useCallback(
    (e: React.MouseEvent, roomId: string) => {
      e.stopPropagation();
      openRoom(roomId);
    },
    [openRoom]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selfPosition) return;
      const { x, y } = selfPosition;
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          move(x, y - ARROW_STEP);
          break;
        case "ArrowDown":
          e.preventDefault();
          move(x, y + ARROW_STEP);
          break;
        case "ArrowLeft":
          e.preventDefault();
          move(x - ARROW_STEP, y);
          break;
        case "ArrowRight":
          e.preventDefault();
          move(x + ARROW_STEP, y);
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selfPosition, move]);

  const othersPresences = presences.filter((p) => p.employeeId !== selfEmployeeId);

  return (
    <div className="relative w-full h-full flex flex-col">
      <div className="flex items-center gap-4 px-4 py-2 bg-white border-b border-gray-200 shrink-0">
        <span className="text-sm font-medium text-gray-900">{selfDisplayName}</span>
        <StatusPill />
      </div>

      <div className="overflow-auto flex-1 relative">
        <div
          role="application"
          aria-label="フロアマップ（クリックまたは矢印キーで移動）"
          className="relative bg-gray-100 cursor-pointer"
          style={{ width: FLOOR_WIDTH, height: FLOOR_HEIGHT }}
          onClick={handleFloorClick}
          onKeyDown={() => {}}
          onTouchEnd={handleTouchEnd}
        >
          {floor.meetingRooms.map((room) => (
            <button
              key={room.id}
              type="button"
              className={`absolute flex flex-col items-center justify-center border-2 rounded-lg text-xs font-semibold cursor-pointer select-none ${TOPIC_COLORS[room.topic]}`}
              style={{
                left: room.position.x - ROOM_W / 2,
                top: room.position.y - ROOM_H / 2,
                width: ROOM_W,
                height: ROOM_H,
              }}
              onClick={(e) => handleRoomClick(e, room.id)}
              aria-label={`${TOPIC_LABELS[room.topic]}に入室`}
            >
              <span>{TOPIC_LABELS[room.topic]}</span>
            </button>
          ))}

          {othersPresences.map((p) => (
            <AvatarMarker
              key={p.employeeId}
              employeeId={p.employeeId}
              displayName={p.displayName}
              avatarUrl={p.avatarUrl}
              x={p.x}
              y={p.y}
              status={p.status}
              onClick={
                p.authUserId
                  ? () =>
                      openInvitation({
                        employeeId: p.employeeId,
                        displayName: p.displayName,
                        avatarUrl: p.avatarUrl,
                        authUserId: p.authUserId as string,
                        status: p.status,
                      })
                  : undefined
              }
            />
          ))}

          {selfPosition && (
            <AvatarMarker
              key={selfEmployeeId}
              employeeId={selfEmployeeId}
              displayName={selfDisplayName}
              avatarUrl={selfAvatarUrl}
              x={selfPosition.x}
              y={selfPosition.y}
              status={selfStatus}
              isSelf
            />
          )}
        </div>

        <VideoOverlay displayName={selfDisplayName} />
      </div>

      {invitationTarget && (
        <InvitationModal
          target={invitationTarget}
          selfAuthUserId={authUserId}
          selfDisplayName={selfDisplayName}
          selfAvatarUrl={selfAvatarUrl}
          onClose={closeInvitation}
        />
      )}

      <IncomingInvitationModal />
    </div>
  );
}
