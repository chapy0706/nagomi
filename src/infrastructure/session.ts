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

// AUTH_DEBUG=1 のときだけ server ログ（Coolify の nagomi コンテナログ）に出す。
// どこで /login に弾かれているかを切り分けるための一時的なデバッグ。
function debugLog(message: string): void {
  if (process.env.AUTH_DEBUG === "1") {
    console.log(`[auth-debug] ${message}`);
  }
}

export async function getSessionContext(): Promise<SessionContext> {
  const authGateway = await createAuthGateway();
  const authUserId = await authGateway.getAuthUserId();
  debugLog(
    `provider=${process.env.AUTH_PROVIDER ?? "supabase"} dataProvider=${process.env.DATA_PROVIDER ?? "supabase"} authUserId=${authUserId ?? "(none)"}`
  );
  if (!authUserId) {
    debugLog("redirect /login (authUserId なし＝session 復号失敗 or 未ログイン)");
    redirect("/login");
  }

  const repo = createEmployeeRepository();
  const employee = await repo.findByAuthUserId(authUserId);
  debugLog(
    `employee found=${Boolean(employee)} isActive=${employee?.isActive ?? "n/a"} consentAcceptedAt=${String(employee?.consentAcceptedAt)}`
  );

  // employees に未登録 / 無効化済みのときは /login へ戻す。
  // ここは Server Component 文脈のため signOut（Cookie 変更）は呼べない。
  // セッション破棄が要る場合は logoutAction（Server Action）経由で行う。
  // なお Keycloak モードでは signIn コールバックが未登録ユーザーの session 発行を
  // 防ぐため、この分岐は基本的に「在籍中に無効化された」ケースのみ到達する。
  if (!employee?.isActive) {
    debugLog("redirect /login (employee 未登録 or 無効＝sub 未マッピングの可能性)");
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
