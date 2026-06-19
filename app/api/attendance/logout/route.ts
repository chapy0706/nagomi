import { NextResponse } from "next/server";
import { RecordLogout } from "@/src/application/use-cases/RecordLogout";
import { createAttendanceRepository } from "@/src/infrastructure/repositoryFactory";
import { SystemClock } from "@/src/infrastructure/SystemClock";
import { createSupabaseServerClient } from "@/src/infrastructure/supabase/serverClient";

export async function POST(): Promise<NextResponse> {
  const serverClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await serverClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  await new RecordLogout(createAttendanceRepository(), SystemClock).execute(user.id, "inferred");

  return NextResponse.json({ ok: true });
}
