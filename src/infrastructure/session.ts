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
  // TEMP: 認証ループ調査用の到達点ログ（原因特定後に削除する）。
  // Node ランタイム（RSC）なので常時出力で確実に観測する。
  // authUserId は Keycloak sub（ユーザー識別子・秘匿トークンではない）。
  // employees.auth_user_id と一致するかを現地で突き合わせるために出す。
  console.log("[getSessionContext] enter");

  const authGateway = await createAuthGateway();
  const authUserId = await authGateway.getAuthUserId();
  console.log("[getSessionContext] authUserId=", authUserId ?? null);
  if (!authUserId) {
    console.log("[getSessionContext] redirect(/login) reason=no-authUserId");
    redirect("/login");
  }

  const repo = createEmployeeRepository();
  let employee: Awaited<ReturnType<typeof repo.findByAuthUserId>>;
  try {
    employee = await repo.findByAuthUserId(authUserId);
  } catch (error) {
    // 握りつぶさず文脈を付けて再送出（DB 障害等は redirect ループでなく 500 で気づける）。
    console.error("[getSessionContext] findByAuthUserId failed", { authUserId }, error);
    throw error;
  }
  console.log("[getSessionContext] employee lookup", {
    found: Boolean(employee),
    isActive: employee?.isActive ?? null,
  });

  // employees に未登録 / 無効化済みのときは /login へ戻す。
  // ここは Server Component 文脈のため signOut（Cookie 変更）は呼べない。
  // セッション破棄が要る場合は logoutAction（Server Action）経由で行う。
  // なお Keycloak モードでは signIn コールバックが未登録ユーザーの session 発行を
  // 防ぐため、この分岐は基本的に「在籍中に無効化された」ケースのみ到達する。
  if (!employee?.isActive) {
    console.log(
      "[getSessionContext] redirect(/login) reason=employee-missing-or-inactive authUserId=",
      authUserId
    );
    redirect("/login");
  }

  console.log("[getSessionContext] ok employeeId=", employee.employeeId.value);
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
