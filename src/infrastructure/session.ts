/// 認証は AUTH_PROVIDER（keycloak / supabase）で切り替わる。
/// 従業員データの取得は DATA_PROVIDER（a1 / supabase）で切り替わる。
/// いずれも repositoryFactory に集約し、このファイルはプロバイダを知らない。

import { redirect } from "next/navigation";
import { createAuthGateway, createEmployeeRepository } from "./repositoryFactory";

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
  const authGateway = await createAuthGateway();
  const authUserId = await authGateway.getAuthUserId();
  if (!authUserId) redirect("/login");

  const repo = createEmployeeRepository();
  const employee = await repo.findByAuthUserId(authUserId);

  if (!employee?.isActive) {
    await authGateway.signOut();
    redirect("/login");
  }

  return {
    authUserId,
    employee: {
      employeeId: employee.employeeId.value,
      displayName: employee.displayName,
      avatarUrl: employee.avatarUrl,
      consentAcceptedAt: employee.consentAcceptedAt,
      tutorialCompletedAt: employee.tutorialCompletedAt,
    },
  };
}
