"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AvatarMarker } from "@/app/_components/AvatarMarker";
import { IncomingInvitationModal } from "@/app/_components/IncomingInvitationModal";
import { InvitationModal } from "@/app/_components/InvitationModal";
import { MeetingRoomLobby } from "@/app/_components/MeetingRoomLobby";
import { NpsSurveyModal } from "@/app/_components/NpsSurveyModal";
import { ReportModal } from "@/app/_components/ReportModal";
import { RoomBadge } from "@/app/_components/RoomBadge";
import { StatusPill } from "@/app/_components/StatusPill";
import { VideoOverlay } from "@/app/_components/VideoOverlay";
import { useAttendanceLogout } from "@/app/_hooks/useAttendanceLogout";
import { useBlockedAuthIds } from "@/app/_hooks/useBlockedAuthIds";
import { useIncomingInvitations } from "@/app/_hooks/useIncomingInvitations";
import { useInvitationResponses } from "@/app/_hooks/useInvitationResponses";
import { usePresence } from "@/app/_hooks/usePresence";
import { useRoomActivities } from "@/app/_hooks/useRoomActivities";
import { useThrottledMove } from "@/app/_hooks/useThrottledMove";
import { shouldShowNpsSurvey } from "@/app/_lib/surveySchedule";
import { TOPIC_ROOM_LABELS } from "@/app/_lib/topicStyle";
import { useInvitationStore } from "@/app/_stores/invitationStore";
import { useLobbyStore } from "@/app/_stores/lobbyStore";
import { selectPresenceList, usePresenceStore } from "@/app/_stores/presenceStore";
import { useReportStore } from "@/app/_stores/reportStore";
import { useRoomSessionStore } from "@/app/_stores/roomSessionStore";
import { useSelfPositionStore } from "@/app/_stores/selfPositionStore";
import { selectEffectiveStatus, useSelfStatusStore } from "@/app/_stores/selfStatusStore";
import { useSurveyStore } from "@/app/_stores/surveyStore";
import { useVideoStore } from "@/app/_stores/videoStore";
import { buildFloor, DEFAULT_FLOOR_LAYOUT } from "@/src/domain/config/floorLayout";
import { createPresenceGateway } from "@/src/infrastructure/realtimeGatewayFactory";
import { createSupabaseBrowserClient } from "@/src/infrastructure/supabase/browserClient";

const FLOOR_WIDTH = DEFAULT_FLOOR_LAYOUT.width;
const FLOOR_HEIGHT = DEFAULT_FLOOR_LAYOUT.height;
const ARROW_STEP = 40;
const ROOM_W = 140;
const ROOM_H = 96;

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
  const gateway = useMemo(() => createPresenceGateway(supabase), [supabase]);
  const floor = useMemo(() => buildFloor(DEFAULT_FLOOR_LAYOUT), []);

  // フロアは固定の論理座標（1000×800）。他参加者と共有する座標系は変えず、
  // 表示だけ端末サイズに合わせて contain で拡大縮小する（全体を常に画面内に収める）。
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w === 0 || h === 0) return;
      setScale(Math.min(w / FLOOR_WIDTH, h / FLOOR_HEIGHT));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const meetingRoomIds = useMemo(() => floor.meetingRooms.map((r) => r.id), [floor]);

  useAttendanceLogout();
  usePresence(authUserId, gateway, {
    employeeId: selfEmployeeId,
    displayName: selfDisplayName,
    avatarUrl: selfAvatarUrl,
  });
  useIncomingInvitations(authUserId);
  useInvitationResponses(authUserId);
  const blockedAuthIds = useBlockedAuthIds(authUserId);
  useRoomActivities(meetingRoomIds);
  const move = useThrottledMove(floor, gateway);

  const presences = usePresenceStore(selectPresenceList);
  const selfPosition = useSelfPositionStore((s) => s.position);
  const selfStatus = useSelfStatusStore(selectEffectiveStatus);
  const videoRoomId = useVideoStore((s) => s.roomId);
  const isVideoOpen = useVideoStore((s) => s.isOpen);
  const openLobby = useLobbyStore((s) => s.open);
  const invitationTarget = useInvitationStore((s) => s.target);
  const openInvitation = useInvitationStore((s) => s.openFor);
  const closeInvitation = useInvitationStore((s) => s.close);
  const reportTarget = useReportStore((s) => s.target);
  const closeReport = useReportStore((s) => s.close);
  const beginSession = useRoomSessionStore((s) => s.beginSession);
  const endSession = useRoomSessionStore((s) => s.endSession);
  const isNpsOpen = useSurveyStore((s) => s.isNpsOpen);
  const openNps = useSurveyStore((s) => s.openNps);
  const closeNps = useSurveyStore((s) => s.close);

  // NPS アンケートの表示チェック（月1回）
  useEffect(() => {
    if (shouldShowNpsSurvey()) openNps();
  }, [openNps]);

  // Sync local status changes to presence gateway
  useEffect(() => {
    gateway.updateStatus(selfStatus).catch((err) => {
      console.error("[FloorCanvas] updateStatus failed:", err);
    });
  }, [selfStatus, gateway]);

  // Sync current room id to presence so others can see who is in which room
  useEffect(() => {
    const roomId = isVideoOpen ? videoRoomId : undefined;
    gateway.updateRoom(roomId).catch((err) => {
      console.error("[FloorCanvas] updateRoom failed:", err);
    });
  }, [isVideoOpen, videoRoomId, gateway]);

  const participantCountsByRoom = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of presences) {
      if (p.currentRoomId) {
        counts.set(p.currentRoomId, (counts.get(p.currentRoomId) ?? 0) + 1);
      }
    }
    return counts;
  }, [presences]);

  // 部屋に1人目が入ったら開始、0人に戻ったら終了を記録する
  useEffect(() => {
    const now = new Date();
    for (const roomId of meetingRoomIds) {
      const count = participantCountsByRoom.get(roomId) ?? 0;
      if (count > 0) beginSession(roomId, now);
      else endSession(roomId);
    }
  }, [participantCountsByRoom, meetingRoomIds, beginSession, endSession]);

  // getBoundingClientRect は scale 適用後（見た目）の矩形を返すため、
  // クリック位置を scale で割り戻して論理座標（1000×800 空間）に変換する。
  const handleFloorClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / scale;
      const y = (e.clientY - rect.top) / scale;
      move(x, y);
    },
    [move, scale]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      const touch = e.changedTouches[0];
      if (!touch) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (touch.clientX - rect.left) / scale;
      const y = (touch.clientY - rect.top) / scale;
      move(x, y);
    },
    [move, scale]
  );

  const handleRoomClick = useCallback(
    (e: React.MouseEvent, roomId: string) => {
      e.stopPropagation();
      openLobby(roomId);
    },
    [openLobby]
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
      <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-gray-200 shrink-0">
        <span className="text-sm font-medium text-gray-900 truncate max-w-[120px] sm:max-w-none">
          {selfDisplayName}
        </span>
        <StatusPill />
        <Link
          href="/settings/profile"
          aria-label="設定を開く"
          className="ml-auto flex items-center justify-center min-w-[44px] min-h-[44px] rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </Link>
      </div>

      <div ref={containerRef} className="flex-1 relative overflow-hidden bg-gray-200">
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="relative"
            style={{ width: FLOOR_WIDTH * scale, height: FLOOR_HEIGHT * scale }}
          >
            <div
              role="application"
              aria-label="フロアマップ（クリックまたは矢印キーで移動）"
              className="absolute top-0 left-0 bg-gray-100 cursor-pointer"
              style={{
                width: FLOOR_WIDTH,
                height: FLOOR_HEIGHT,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
              onClick={handleFloorClick}
              onKeyDown={() => {}}
              onTouchEnd={handleTouchEnd}
            >
              {floor.meetingRooms.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  className="absolute cursor-pointer"
                  style={{
                    left: room.position.x - ROOM_W / 2,
                    top: room.position.y - ROOM_H / 2,
                    width: ROOM_W,
                    height: ROOM_H,
                  }}
                  onClick={(e) => handleRoomClick(e, room.id)}
                  aria-label={`${TOPIC_ROOM_LABELS[room.topic]}に入室`}
                >
                  <RoomBadge
                    roomId={room.id}
                    topic={room.topic}
                    participantCount={participantCountsByRoom.get(room.id) ?? 0}
                    capacityMax={room.capacity.max}
                  />
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
                  isBlocked={p.authUserId ? blockedAuthIds.has(p.authUserId) : false}
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
          </div>
        </div>

        <VideoOverlay authUserId={authUserId} displayName={selfDisplayName} />
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

      {reportTarget && <ReportModal target={reportTarget} onClose={closeReport} />}

      {isNpsOpen && <NpsSurveyModal onClose={closeNps} />}

      <MeetingRoomLobby />
    </div>
  );
}
