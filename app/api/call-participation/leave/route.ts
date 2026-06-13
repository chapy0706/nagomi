import { NextResponse } from "next/server";
import { RecordCallLeave } from "@/src/application/use-cases/RecordCallLeave";
import { SystemClock } from "@/src/infrastructure/SystemClock";
import { createSupabaseAdminClient } from "@/src/infrastructure/supabase/adminClient";
import { SupabaseCallParticipationRepository } from "@/src/infrastructure/supabase/SupabaseCallParticipationRepository";
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
  const repo = new SupabaseCallParticipationRepository(adminClient);
  const useCase = new RecordCallLeave(repo, SystemClock);
  await useCase.execute(user.id);

  return NextResponse.json({ ok: true });
}
