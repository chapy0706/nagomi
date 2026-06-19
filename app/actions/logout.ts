"use server";

import { redirect } from "next/navigation";
import { RecordLogout } from "@/src/application/use-cases/RecordLogout";
import { createAttendanceRepository } from "@/src/infrastructure/repositoryFactory";
import { SystemClock } from "@/src/infrastructure/SystemClock";
import { createSupabaseServerClient } from "@/src/infrastructure/supabase/serverClient";

export async function logoutAction(): Promise<void> {
  const client = await createSupabaseServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (user) {
    await new RecordLogout(createAttendanceRepository(), SystemClock).execute(user.id, "explicit");
  }

  await client.auth.signOut();
  redirect("/login");
}
