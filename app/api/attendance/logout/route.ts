import { NextResponse } from "next/server";
import { RecordLogout } from "@/src/application/use-cases/RecordLogout";
import { createAttendanceRepository } from "@/src/infrastructure/repositoryFactory";
import { SystemClock } from "@/src/infrastructure/SystemClock";
import { getAuthenticatedUserId } from "@/src/infrastructure/session";

export async function POST(): Promise<NextResponse> {
  const authUserId = await getAuthenticatedUserId();
  if (!authUserId) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  await new RecordLogout(createAttendanceRepository(), SystemClock).execute(authUserId, "inferred");

  return NextResponse.json({ ok: true });
}
