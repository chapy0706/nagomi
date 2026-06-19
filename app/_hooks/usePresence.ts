"use client";

import { useEffect, useMemo } from "react";
import { usePresenceStore } from "@/app/_stores/presenceStore";
import { useSelfPositionStore } from "@/app/_stores/selfPositionStore";
import { EnterFloor } from "@/src/application/use-cases/EnterFloor";
import { LeaveFloor } from "@/src/application/use-cases/LeaveFloor";
import { buildFloor, DEFAULT_FLOOR_LAYOUT } from "@/src/domain/config/floorLayout";
import type { EmployeeRepository } from "@/src/domain/ports/EmployeeRepository";
import type { PresenceGateway, PresenceHandlers } from "@/src/domain/ports/PresenceGateway";
import { EmployeeId } from "@/src/domain/value-objects/EmployeeId";
import { Position } from "@/src/domain/value-objects/Position";

type SelfEmployee = {
  employeeId: string;
  displayName: string;
  avatarUrl: string | undefined;
};

export function usePresence(
  authUserId: string,
  gateway: PresenceGateway,
  selfEmployee: SelfEmployee
): void {
  const repo = useMemo(
    (): EmployeeRepository => ({
      findByAuthUserId: async (id) => {
        if (id !== authUserId) return undefined;
        return {
          id: authUserId,
          employeeId: EmployeeId.parse(selfEmployee.employeeId),
          displayName: selfEmployee.displayName,
          avatarUrl: selfEmployee.avatarUrl,
          isActive: true,
          authUserId,
          consentAcceptedAt: new Date(0),
          tutorialCompletedAt: new Date(0),
        };
      },
      findByEmployeeId: async () => undefined,
      recordConsent: async () => {},
      completeTutorial: async () => {},
      updateDisplayName: async () => {},
      updateAvatarUrl: async () => {},
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [authUserId, selfEmployee.employeeId, selfEmployee.displayName, selfEmployee.avatarUrl]
  );

  const enterFloor = useMemo(() => new EnterFloor(repo, gateway), [repo, gateway]);
  const leaveFloor = useMemo(() => new LeaveFloor(gateway), [gateway]);

  const setPresences = usePresenceStore((s) => s.setPresences);
  const upsertPresence = usePresenceStore((s) => s.upsertPresence);
  const removePresence = usePresenceStore((s) => s.removePresence);
  const setSelfPosition = useSelfPositionStore((s) => s.setPosition);
  const clearSelfPosition = useSelfPositionStore((s) => s.clearPosition);

  const floor = useMemo(() => buildFloor(DEFAULT_FLOOR_LAYOUT), []);

  useEffect(() => {
    const currentPresences = usePresenceStore.getState().presences;
    const occupiedPositions = Array.from(currentPresences.values()).map((p) =>
      Position.create(p.x, p.y)
    );

    const handlers: PresenceHandlers = {
      onSync: setPresences,
      onJoin: upsertPresence,
      onLeave: removePresence,
    };

    enterFloor
      .execute({ authUserId, floor, occupiedPositions, handlers })
      .then((result) => {
        if (result.success) {
          setSelfPosition(result.position.x, result.position.y);
        }
      })
      .catch((err) => console.error("[usePresence] EnterFloor failed:", err));

    return () => {
      clearSelfPosition();
      leaveFloor.execute().catch((err) => console.error("[usePresence] LeaveFloor failed:", err));
    };
  }, [
    authUserId,
    enterFloor,
    floor,
    leaveFloor,
    removePresence,
    setPresences,
    upsertPresence,
    setSelfPosition,
    clearSelfPosition,
  ]);
}
