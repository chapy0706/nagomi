"use client";

import { useCallback, useRef } from "react";
import { useSelfPositionStore } from "@/app/_stores/selfPositionStore";
import { MoveAvatar } from "@/src/application/use-cases/MoveAvatar";
import type { Floor } from "@/src/domain/entities/Floor";
import type { PresenceGateway } from "@/src/domain/ports/PresenceGateway";

const THROTTLE_MS = 200;

export function useThrottledMove(
  floor: Floor,
  gateway: PresenceGateway
): (x: number, y: number) => void {
  const setPosition = useSelfPositionStore((s) => s.setPosition);
  const moveAvatarRef = useRef(new MoveAvatar(gateway));
  const lastSentAt = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pendingRef = useRef<{ x: number; y: number } | undefined>(undefined);

  return useCallback(
    (x: number, y: number) => {
      const cx = Math.max(0, Math.min(x, floor.width));
      const cy = Math.max(0, Math.min(y, floor.height));

      setPosition(cx, cy);
      pendingRef.current = { x: cx, y: cy };

      if (timerRef.current !== undefined) {
        clearTimeout(timerRef.current);
        timerRef.current = undefined;
      }

      const send = (px: number, py: number) => {
        moveAvatarRef.current
          .execute({ floor, x: px, y: py })
          .catch((err) => console.error("[useThrottledMove]", err));
        lastSentAt.current = Date.now();
        pendingRef.current = undefined;
      };

      const elapsed = Date.now() - lastSentAt.current;
      if (elapsed >= THROTTLE_MS) {
        send(cx, cy);
      } else {
        timerRef.current = setTimeout(() => {
          timerRef.current = undefined;
          const p = pendingRef.current;
          if (p) send(p.x, p.y);
        }, THROTTLE_MS - elapsed);
      }
    },
    [floor, setPosition]
  );
}
