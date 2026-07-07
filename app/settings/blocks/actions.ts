"use server";

import { revalidatePath } from "next/cache";
import { UnblockEmployee } from "@/src/application/use-cases/UnblockEmployee";
import { createBlockRepository } from "@/src/infrastructure/repositoryFactory";
import { getAuthUserIdOrRedirect } from "@/src/infrastructure/session";

export async function unblockFromListAction(formData: FormData): Promise<void> {
  const blockerAuthId = await getAuthUserIdOrRedirect();

  const blockedAuthId = formData.get("blockedAuthId");
  if (typeof blockedAuthId !== "string") return;

  await new UnblockEmployee(createBlockRepository()).execute({
    blockerAuthId,
    blockedAuthId,
  });
  revalidatePath("/settings/blocks");
}
