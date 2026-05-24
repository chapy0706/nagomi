"use client";

import { useEffect, useMemo } from "react";
import { usePresenceStore } from "@/app/_stores/presenceStore";
import { EnterFloor } from "@/src/application/use-cases/EnterFloor";
import { LeaveFloor } from "@/src/application/use-cases/LeaveFloor";
import { buildFloor, DEFAULT_FLOOR_LAYOUT } from "@/src/domain/config/floorLayout";
import type { PresenceHandlers } from "@/src/domain/ports/PresenceGateway";
import { Position } from "@/src/domain/value-objects/Position";
import { createSupabaseBrowserClient } from "@/src/infrastructure/supabase/browserClient";
import { SupabaseEmployeeRepository } from "@/src/infrastructure/supabase/SupabaseEmployeeRepository";
import { SupabasePresenceGateway } from "@/src/infrastructure/supabase/SupabasePresenceGateway";

export function usePresence(authUserId: string): void {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const repo = useMemo(() => new SupabaseEmployeeRepository(supabase), [supabase]);
  const gateway = useMemo(() => new SupabasePresenceGateway(supabase), [supabase]);
  const enterFloor = useMemo(() => new EnterFloor(repo, gateway), [repo, gateway]);
  const leaveFloor = useMemo(() => new LeaveFloor(gateway), [gateway]);

  const setPresences = usePresenceStore((s) => s.setPresences);
  const upsertPresence = usePresenceStore((s) => s.upsertPresence);
  const removePresence = usePresenceStore((s) => s.removePresence);

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
      .catch((err) => console.error("[usePresence] EnterFloor failed:", err));

    return () => {
      leaveFloor.execute().catch((err) => console.error("[usePresence] LeaveFloor failed:", err));
    };
  }, [authUserId, enterFloor, floor, leaveFloor, removePresence, setPresences, upsertPresence]);
}
