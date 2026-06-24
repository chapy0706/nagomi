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

  // employees に未登録 / 無効化済みのときは /login へ戻す。
  // ここは Server Component 文脈のため signOut（Cookie 変更）は呼べない。
  // セッション破棄が要る場合は logoutAction（Server Action）経由で行う。
  // なお Keycloak モードでは signIn コールバックが未登録ユーザーの session 発行を
  // 防ぐため、この分岐は基本的に「在籍中に無効化された」ケースのみ到達する。
  if (!employee?.isActive) {
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
