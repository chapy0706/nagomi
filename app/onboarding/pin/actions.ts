"use server";

import { redirect } from "next/navigation";
import { ChangePIN } from "@/src/application/use-cases/ChangePIN";
import { createSupabaseAdminClient } from "@/src/infrastructure/supabase/adminClient";
import { SupabaseAuthGateway } from "@/src/infrastructure/supabase/SupabaseAuthGateway";
import { SupabaseEmployeeRepository } from "@/src/infrastructure/supabase/SupabaseEmployeeRepository";
import { createSupabaseServerClient } from "@/src/infrastructure/supabase/serverClient";

export type ChangePinState = {
  errorMessage: string | undefined;
};

export async function changePinAction(
  _prev: ChangePinState,
  formData: FormData
): Promise<ChangePinState> {
  const serverClient = await createSupabaseServerClient();
  const { data } = await serverClient.auth.getUser();
  if (!data.user) redirect("/login");

  const adminClient = createSupabaseAdminClient();
  const authGateway = new SupabaseAuthGateway(serverClient);
  const employeeRepository = new SupabaseEmployeeRepository(adminClient);
  const useCase = new ChangePIN(authGateway, employeeRepository);

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
