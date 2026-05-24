"use server";

import { redirect } from "next/navigation";
import { AuthenticateEmployee } from "@/src/application/use-cases/AuthenticateEmployee";
import { createSupabaseAdminClient } from "@/src/infrastructure/supabase/adminClient";
import { SupabaseAuthGateway } from "@/src/infrastructure/supabase/SupabaseAuthGateway";
import { SupabaseEmployeeRepository } from "@/src/infrastructure/supabase/SupabaseEmployeeRepository";
import { createSupabaseServerClient } from "@/src/infrastructure/supabase/serverClient";

export type LoginState = {
  errorMessage: string | undefined;
};

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const rawEmployeeId = formData.get("employeeId");
  const pin = formData.get("pin");

  if (typeof pin !== "string") {
    return { errorMessage: "社員IDまたはPINが正しくありません" };
  }

  const serverClient = await createSupabaseServerClient();
  const adminClient = createSupabaseAdminClient();

  const authGateway = new SupabaseAuthGateway(serverClient);
  const employeeRepository = new SupabaseEmployeeRepository(adminClient);
  const useCase = new AuthenticateEmployee(authGateway, employeeRepository);

  const result = await useCase.execute({ rawEmployeeId, pin });

  if (!result.success) {
    return { errorMessage: result.errorMessage };
  }

  redirect("/");
}
