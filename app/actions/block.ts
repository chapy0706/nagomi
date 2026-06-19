"use server";

import { redirect } from "next/navigation";
import { BlockEmployee } from "@/src/application/use-cases/BlockEmployee";
import { UnblockEmployee } from "@/src/application/use-cases/UnblockEmployee";
import { createBlockRepository } from "@/src/infrastructure/repositoryFactory";
import { createSupabaseServerClient } from "@/src/infrastructure/supabase/serverClient";

async function getSelfAuthUserId(): Promise<string> {
  const client = await createSupabaseServerClient();
  const { data } = await client.auth.getUser();
  if (!data.user) redirect("/login");
  return data.user.id;
}

export async function blockEmployeeAction(blockedAuthId: string): Promise<void> {
  const blockerAuthId = await getSelfAuthUserId();
  const repo = createBlockRepository();
  await new BlockEmployee(repo).execute({ blockerAuthId, blockedAuthId });
}

export async function unblockEmployeeAction(blockedAuthId: string): Promise<void> {
  const blockerAuthId = await getSelfAuthUserId();
  const repo = createBlockRepository();
  await new UnblockEmployee(repo).execute({ blockerAuthId, blockedAuthId });
}

export async function getMyBlockedAuthIdsAction(): Promise<string[]> {
  const selfAuthUserId = await getSelfAuthUserId();
  const repo = createBlockRepository();
  return repo.findBlockedAuthIds(selfAuthUserId);
}
