"use server";

import { RecordCallJoin } from "@/src/application/use-cases/RecordCallJoin";
import { RecordCallLeave } from "@/src/application/use-cases/RecordCallLeave";
import type { CallTopicKind } from "@/src/domain/value-objects/CallTopic";
import { SystemClock } from "@/src/infrastructure/SystemClock";
import { createSupabaseAdminClient } from "@/src/infrastructure/supabase/adminClient";
import { SupabaseCallParticipationRepository } from "@/src/infrastructure/supabase/SupabaseCallParticipationRepository";
import { createSupabaseServerClient } from "@/src/infrastructure/supabase/serverClient";

export async function recordCallJoinAction(roomId: string, topic: CallTopicKind): Promise<void> {
  const serverClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await serverClient.auth.getUser();
  if (!user) return;

  const adminClient = createSupabaseAdminClient();
  const repo = new SupabaseCallParticipationRepository(adminClient);
  const useCase = new RecordCallJoin(repo, SystemClock);
  await useCase.execute({ employeeAuthId: user.id, roomId, topic });
}

export async function recordCallLeaveAction(): Promise<void> {
  const serverClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await serverClient.auth.getUser();
  if (!user) return;

  const adminClient = createSupabaseAdminClient();
  const repo = new SupabaseCallParticipationRepository(adminClient);
  const useCase = new RecordCallLeave(repo, SystemClock);
  await useCase.execute(user.id);
}
