"use server";

import { redirect } from "next/navigation";
import { CompleteTutorial } from "@/src/application/use-cases/CompleteTutorial";
import { createSupabaseAdminClient } from "@/src/infrastructure/supabase/adminClient";
import { SupabaseEmployeeRepository } from "@/src/infrastructure/supabase/SupabaseEmployeeRepository";
import { createSupabaseServerClient } from "@/src/infrastructure/supabase/serverClient";

export async function completeTutorialAction(): Promise<void> {
  const serverClient = await createSupabaseServerClient();
  const { data } = await serverClient.auth.getUser();
  if (!data.user) redirect("/login");

  const adminClient = createSupabaseAdminClient();
  const repo = new SupabaseEmployeeRepository(adminClient);
  const useCase = new CompleteTutorial(repo);

  await useCase.execute(data.user.id);

  redirect("/");
}
