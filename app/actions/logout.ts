"use server";

import { redirect } from "next/navigation";
import { RecordLogout } from "@/src/application/use-cases/RecordLogout";
import {
  createAttendanceRepository,
  createAuthGateway,
} from "@/src/infrastructure/repositoryFactory";
import { SystemClock } from "@/src/infrastructure/SystemClock";

export async function logoutAction(): Promise<void> {
  const authGateway = await createAuthGateway();
  const authUserId = await authGateway.getAuthUserId();

  if (authUserId) {
    await new RecordLogout(createAttendanceRepository(), SystemClock).execute(
      authUserId,
      "explicit"
    );
  }

  await authGateway.signOut();
  redirect("/login");
}
