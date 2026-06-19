"use server";

import { redirect } from "next/navigation";
import { CompleteTutorial } from "@/src/application/use-cases/CompleteTutorial";
import { createEmployeeRepository } from "@/src/infrastructure/repositoryFactory";
import { createSupabaseServerClient } from "@/src/infrastructure/supabase/serverClient";

export async function completeTutorialAction(): Promise<void> {
  const serverClient = await createSupabaseServerClient();
  const { data } = await serverClient.auth.getUser();
  if (!data.user) redirect("/login");

  await new CompleteTutorial(createEmployeeRepository()).execute(data.user.id);

  redirect("/");
}
