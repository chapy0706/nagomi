"use server";

import { RecordCallJoin } from "@/src/application/use-cases/RecordCallJoin";
import { RecordCallLeave } from "@/src/application/use-cases/RecordCallLeave";
import type { CallTopicKind } from "@/src/domain/value-objects/CallTopic";
import { createCallParticipationRepository } from "@/src/infrastructure/repositoryFactory";
import { SystemClock } from "@/src/infrastructure/SystemClock";
import { createSupabaseServerClient } from "@/src/infrastructure/supabase/serverClient";

export async function recordCallJoinAction(roomId: string, topic: CallTopicKind): Promise<void> {
  const serverClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await serverClient.auth.getUser();
  if (!user) return;

  await new RecordCallJoin(createCallParticipationRepository(), SystemClock).execute({
    employeeAuthId: user.id,
    roomId,
    topic,
  });
}

export async function recordCallLeaveAction(): Promise<void> {
  const serverClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await serverClient.auth.getUser();
  if (!user) return;

  await new RecordCallLeave(createCallParticipationRepository(), SystemClock).execute(user.id);
}
