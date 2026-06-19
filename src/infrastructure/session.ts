/// 認証は引き続き Supabase Auth を使用する（issue-33 まで変更しない）。
/// 従業員データの取得は repositoryFactory 経由で DATA_PROVIDER に従い切り替わる。

import { redirect } from "next/navigation";
import { createEmployeeRepository } from "./repositoryFactory";
import { createSupabaseServerClient } from "./supabase/serverClient";

export type SessionEmployee = {
  employeeId: string;
  displayName: string;
  avatarUrl: string | undefined;
  consentAcceptedAt: Date | undefined;
  tutorialCompletedAt: Date | undefined;
};

export type SessionContext = {
  authUserId: string;
  employee: SessionEmployee;
};

export async function getSessionContext(): Promise<SessionContext> {
  const serverClient = await createSupabaseServerClient();
  const { data } = await serverClient.auth.getUser();
  if (!data.user) redirect("/login");

  const repo = createEmployeeRepository();
  const employee = await repo.findByAuthUserId(data.user.id);

  if (!employee?.isActive) {
    await serverClient.auth.signOut();
    redirect("/login");
  }

  return {
    authUserId: data.user.id,
    employee: {
      employeeId: employee.employeeId.value,
      displayName: employee.displayName,
      avatarUrl: employee.avatarUrl,
      consentAcceptedAt: employee.consentAcceptedAt,
      tutorialCompletedAt: employee.tutorialCompletedAt,
    },
  };
}
