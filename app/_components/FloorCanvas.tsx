"use client";

import { useCallback, useEffect, useMemo } from "react";
import { AvatarMarker } from "@/app/_components/AvatarMarker";
import { usePresence } from "@/app/_hooks/usePresence";
import { useThrottledMove } from "@/app/_hooks/useThrottledMove";
import { selectPresenceList, usePresenceStore } from "@/app/_stores/presenceStore";
import { useSelfPositionStore } from "@/app/_stores/selfPositionStore";
import { buildFloor, DEFAULT_FLOOR_LAYOUT } from "@/src/domain/config/floorLayout";
import { createSupabaseBrowserClient } from "@/src/infrastructure/supabase/browserClient";
import { SupabasePresenceGateway } from "@/src/infrastructure/supabase/SupabasePresenceGateway";

const FLOOR_WIDTH = DEFAULT_FLOOR_LAYOUT.width;
const FLOOR_HEIGHT = DEFAULT_FLOOR_LAYOUT.height;
const ARROW_STEP = 40;

type FloorCanvasProps = {
  authUserId: string;
  selfEmployeeId: string;
  selfDisplayName: string;
  selfAvatarUrl?: string;
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
  const move = useThrottledMove(floor, gateway);

  const presences = usePresenceStore(selectPresenceList);
  const selfPosition = useSelfPositionStore((s) => s.position);

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

  // 矢印キーはグローバルリスナーで処理（フォーカスに依存しないゲーム的 UX）
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
    <div className="overflow-auto w-full h-full">
      <div
        role="application"
        aria-label="フロアマップ（クリックまたは矢印キーで移動）"
        className="relative bg-gray-100 cursor-pointer"
        style={{ width: FLOOR_WIDTH, height: FLOOR_HEIGHT }}
        onClick={handleFloorClick}
        onKeyDown={() => {}}
        onTouchEnd={handleTouchEnd}
      >
        {othersPresences.map((p) => (
          <AvatarMarker
            key={p.employeeId}
            employeeId={p.employeeId}
            displayName={p.displayName}
            avatarUrl={p.avatarUrl}
            x={p.x}
            y={p.y}
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
            isSelf
          />
        )}
      </div>
    </div>
  );
}
