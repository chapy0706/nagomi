"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { UnblockEmployee } from "@/src/application/use-cases/UnblockEmployee";
import { SupabaseBlockRepository } from "@/src/infrastructure/supabase/SupabaseBlockRepository";
import { createSupabaseServerClient } from "@/src/infrastructure/supabase/serverClient";

export async function unblockFromListAction(formData: FormData): Promise<void> {
  const client = await createSupabaseServerClient();
  const { data } = await client.auth.getUser();
  if (!data.user) redirect("/login");

  const blockedAuthId = formData.get("blockedAuthId");
  if (typeof blockedAuthId !== "string") return;

  const repo = new SupabaseBlockRepository(client);
  await new UnblockEmployee(repo).execute({
    blockerAuthId: data.user.id,
    blockedAuthId,
  });
  revalidatePath("/settings/blocks");
}
