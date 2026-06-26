"use server";

import { redirect } from "next/navigation";
import { CompleteTutorial } from "@/src/application/use-cases/CompleteTutorial";
import {
  createAuthGateway,
  createEmployeeRepository,
} from "@/src/infrastructure/repositoryFactory";

export async function completeTutorialAction(): Promise<void> {
  const authUserId = await (await createAuthGateway()).getAuthUserId();
  if (!authUserId) redirect("/login");

  await new CompleteTutorial(createEmployeeRepository()).execute(authUserId);

  redirect("/");
}
