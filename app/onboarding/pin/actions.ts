"use server";

import { redirect } from "next/navigation";
import { ChangePIN } from "@/src/application/use-cases/ChangePIN";
import { createEmployeeRepository } from "@/src/infrastructure/repositoryFactory";
import { SupabaseAuthGateway } from "@/src/infrastructure/supabase/SupabaseAuthGateway";
import { createSupabaseServerClient } from "@/src/infrastructure/supabase/serverClient";

export type ChangePinState = {
  errorMessage: string | undefined;
};

// 注: PIN（= Supabase パスワード）変更は Supabase モード専用。
// Keycloak モードでは pin ページ（page.tsx）が isKeycloakAuthProvider() で
// /onboarding/consent に退避するため、この action には到達しない。
// したがって認可を agnostic 化せず、あえて Supabase 認証のまま残す（ADR-010）。
export async function changePinAction(
  _prev: ChangePinState,
  formData: FormData
): Promise<ChangePinState> {
  const serverClient = await createSupabaseServerClient();
  const { data } = await serverClient.auth.getUser();
  if (!data.user) redirect("/login");

  const authGateway = new SupabaseAuthGateway(serverClient);
  const useCase = new ChangePIN(authGateway, createEmployeeRepository());

  const result = await useCase.execute({
    authUserId: data.user.id,
    currentPin: String(formData.get("currentPin") ?? ""),
    newPin: formData.get("newPin"),
    confirmPin: formData.get("confirmPin"),
  });

  if (!result.success) {
    return { errorMessage: result.errorMessage };
  }

  redirect("/onboarding/consent");
}
