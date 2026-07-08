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

/// Server Action / API から使う、プロバイダ非依存の「自己」認証ユーザーID解決。
///
/// createAuthGateway 経由のため AUTH_PROVIDER（keycloak / supabase）の切替・切り戻しを保つ。
/// 認証チェックの知識をこの1箇所に集約し、各 action は認証方式を知らずに済む（関心の分離）。
/// これにより「一部 action だけ未移行」という移行漏れが構造的に起きなくなる。
export async function getAuthenticatedUserId(): Promise<string | undefined> {
  const authGateway = await createAuthGateway();
  return authGateway.getAuthUserId();
}

/// 認証必須の Server Action / RSC 用。未認証なら /login へリダイレクトする。
/// （API Route は Response を返す必要があるため getAuthenticatedUserId を使い自前で 401 にする）
export async function getAuthUserIdOrRedirect(): Promise<string> {
  const authUserId = await getAuthenticatedUserId();
  if (!authUserId) redirect("/login");
  return authUserId;
}
