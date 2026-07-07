"use server";

import { BlockEmployee } from "@/src/application/use-cases/BlockEmployee";
import { UnblockEmployee } from "@/src/application/use-cases/UnblockEmployee";
import { createBlockRepository } from "@/src/infrastructure/repositoryFactory";
import { getAuthUserIdOrRedirect } from "@/src/infrastructure/session";

export async function blockEmployeeAction(blockedAuthId: string): Promise<void> {
  const blockerAuthId = await getAuthUserIdOrRedirect();
  const repo = createBlockRepository();
  await new BlockEmployee(repo).execute({ blockerAuthId, blockedAuthId });
}

export async function unblockEmployeeAction(blockedAuthId: string): Promise<void> {
  const blockerAuthId = await getAuthUserIdOrRedirect();
  const repo = createBlockRepository();
  await new UnblockEmployee(repo).execute({ blockerAuthId, blockedAuthId });
}

export async function getMyBlockedAuthIdsAction(): Promise<string[]> {
  const selfAuthUserId = await getAuthUserIdOrRedirect();
  const repo = createBlockRepository();
  return repo.findBlockedAuthIds(selfAuthUserId);
}
