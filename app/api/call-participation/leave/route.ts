import { NextResponse } from "next/server";
import { RecordCallLeave } from "@/src/application/use-cases/RecordCallLeave";
import { createCallParticipationRepository } from "@/src/infrastructure/repositoryFactory";
import { SystemClock } from "@/src/infrastructure/SystemClock";
import { getAuthenticatedUserId } from "@/src/infrastructure/session";

export async function POST(): Promise<NextResponse> {
  const authUserId = await getAuthenticatedUserId();
  if (!authUserId) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  await new RecordCallLeave(createCallParticipationRepository(), SystemClock).execute(authUserId);

  return NextResponse.json({ ok: true });
}
