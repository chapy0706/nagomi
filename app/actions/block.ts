"use server";

import { redirect } from "next/navigation";
import { BlockEmployee } from "@/src/application/use-cases/BlockEmployee";
import { UnblockEmployee } from "@/src/application/use-cases/UnblockEmployee";
import { SupabaseBlockRepository } from "@/src/infrastructure/supabase/SupabaseBlockRepository";
import { createSupabaseServerClient } from "@/src/infrastructure/supabase/serverClient";

async function getSelfAuthUserId(): Promise<string> {
  const client = await createSupabaseServerClient();
  const { data } = await client.auth.getUser();
  if (!data.user) redirect("/login");
  return data.user.id;
}

export async function blockEmployeeAction(blockedAuthId: string): Promise<void> {
  const client = await createSupabaseServerClient();
  const blockerAuthId = await getSelfAuthUserId();
  const repo = new SupabaseBlockRepository(client);
  await new BlockEmployee(repo).execute({ blockerAuthId, blockedAuthId });
}

export async function unblockEmployeeAction(blockedAuthId: string): Promise<void> {
  const client = await createSupabaseServerClient();
  const blockerAuthId = await getSelfAuthUserId();
  const repo = new SupabaseBlockRepository(client);
  await new UnblockEmployee(repo).execute({ blockerAuthId, blockedAuthId });
}
