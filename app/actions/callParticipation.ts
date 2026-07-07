"use server";

import { RecordCallJoin } from "@/src/application/use-cases/RecordCallJoin";
import { RecordCallLeave } from "@/src/application/use-cases/RecordCallLeave";
import type { CallTopicKind } from "@/src/domain/value-objects/CallTopic";
import { createCallParticipationRepository } from "@/src/infrastructure/repositoryFactory";
import { SystemClock } from "@/src/infrastructure/SystemClock";
import { getAuthenticatedUserId } from "@/src/infrastructure/session";

export async function recordCallJoinAction(roomId: string, topic: CallTopicKind): Promise<void> {
  const authUserId = await getAuthenticatedUserId();
  if (!authUserId) return;

  await new RecordCallJoin(createCallParticipationRepository(), SystemClock).execute({
    employeeAuthId: authUserId,
    roomId,
    topic,
  });
}

export async function recordCallLeaveAction(): Promise<void> {
  const authUserId = await getAuthenticatedUserId();
  if (!authUserId) return;

  await new RecordCallLeave(createCallParticipationRepository(), SystemClock).execute(authUserId);
}
