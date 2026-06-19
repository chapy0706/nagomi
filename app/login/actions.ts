"use server";

import { redirect } from "next/navigation";
import { AuthenticateEmployee } from "@/src/application/use-cases/AuthenticateEmployee";
import { RecordLogin } from "@/src/application/use-cases/RecordLogin";
import {
  createAttendanceRepository,
  createEmployeeRepository,
} from "@/src/infrastructure/repositoryFactory";
import { SystemClock } from "@/src/infrastructure/SystemClock";
import { SupabaseAuthGateway } from "@/src/infrastructure/supabase/SupabaseAuthGateway";
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
  const authGateway = new SupabaseAuthGateway(serverClient);
  const useCase = new AuthenticateEmployee(authGateway, createEmployeeRepository());

  const result = await useCase.execute({ rawEmployeeId, pin });

  if (!result.success) {
    return { errorMessage: result.errorMessage };
  }

  await new RecordLogin(createAttendanceRepository(), SystemClock).execute(result.authUserId);

  redirect("/");
}
