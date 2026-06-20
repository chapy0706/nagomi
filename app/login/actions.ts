"use server";

import { redirect } from "next/navigation";
import { AuthenticateEmployee } from "@/src/application/use-cases/AuthenticateEmployee";
import { RecordLogin } from "@/src/application/use-cases/RecordLogin";
import { signIn } from "@/src/infrastructure/keycloak/auth";
import {
  createAttendanceRepository,
  createAuthGateway,
  createEmployeeRepository,
} from "@/src/infrastructure/repositoryFactory";
import { SystemClock } from "@/src/infrastructure/SystemClock";

export type LoginState = {
  errorMessage: string | undefined;
};

/// Keycloak（OIDC）ログイン。Keycloak のログイン画面へリダイレクトする。
/// 認証成功後 /api/auth/callback/keycloak に戻り、最終的に "/" へ遷移する。
/// AUTH_PROVIDER=keycloak のときに LoginForm のボタンから呼ばれる。
/// 在席ログイン（attendance_logs）の記録はセッション確立後の導線で扱う。
export async function keycloakLoginAction(): Promise<void> {
  await signIn("keycloak", { redirectTo: "/" });
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const rawEmployeeId = formData.get("employeeId");
  const pin = formData.get("pin");

  if (typeof pin !== "string") {
    return { errorMessage: "社員IDまたはPINが正しくありません" };
  }

  // 擬似メール + PIN フォーム経由のログイン（AUTH_PROVIDER=supabase 用）。
  // Keycloak モードではこの action は使われず、OIDC リダイレクトに置き換わる。
  const authGateway = await createAuthGateway();
  const useCase = new AuthenticateEmployee(authGateway, createEmployeeRepository());

  const result = await useCase.execute({ rawEmployeeId, pin });

  if (!result.success) {
    return { errorMessage: result.errorMessage };
  }

  await new RecordLogin(createAttendanceRepository(), SystemClock).execute(result.authUserId);

  redirect("/");
}
