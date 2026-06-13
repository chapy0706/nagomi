"use server";

import { redirect } from "next/navigation";
import { RecordLogout } from "@/src/application/use-cases/RecordLogout";
import { SystemClock } from "@/src/infrastructure/SystemClock";
import { createSupabaseAdminClient } from "@/src/infrastructure/supabase/adminClient";
import { SupabaseAttendanceRepository } from "@/src/infrastructure/supabase/SupabaseAttendanceRepository";
import { createSupabaseServerClient } from "@/src/infrastructure/supabase/serverClient";

export async function logoutAction(): Promise<void> {
  const client = await createSupabaseServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (user) {
    const adminClient = createSupabaseAdminClient();
    const repo = new SupabaseAttendanceRepository(adminClient);
    const useCase = new RecordLogout(repo, SystemClock);
    await useCase.execute(user.id, "explicit");
  }

  await client.auth.signOut();
  redirect("/login");
}
