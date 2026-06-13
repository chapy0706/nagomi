import { NextResponse } from "next/server";
import { RecordLogout } from "@/src/application/use-cases/RecordLogout";
import { SystemClock } from "@/src/infrastructure/SystemClock";
import { createSupabaseAdminClient } from "@/src/infrastructure/supabase/adminClient";
import { SupabaseAttendanceRepository } from "@/src/infrastructure/supabase/SupabaseAttendanceRepository";
import { createSupabaseServerClient } from "@/src/infrastructure/supabase/serverClient";

export async function POST(): Promise<NextResponse> {
  const serverClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await serverClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const adminClient = createSupabaseAdminClient();
  const repo = new SupabaseAttendanceRepository(adminClient);
  const useCase = new RecordLogout(repo, SystemClock);
  await useCase.execute(user.id, "inferred");

  return NextResponse.json({ ok: true });
}
