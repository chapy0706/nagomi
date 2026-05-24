"use server";

import { redirect } from "next/navigation";
import { AcceptConsent } from "@/src/application/use-cases/AcceptConsent";
import { createSupabaseAdminClient } from "@/src/infrastructure/supabase/adminClient";
import { SupabaseEmployeeRepository } from "@/src/infrastructure/supabase/SupabaseEmployeeRepository";
import { createSupabaseServerClient } from "@/src/infrastructure/supabase/serverClient";

export type ConsentState = {
  errorMessage: string | undefined;
};

export async function consentAction(
  _prev: ConsentState,
  formData: FormData
): Promise<ConsentState> {
  const serverClient = await createSupabaseServerClient();
  const { data } = await serverClient.auth.getUser();
  if (!data.user) redirect("/login");

  const adminClient = createSupabaseAdminClient();
  const employeeRepository = new SupabaseEmployeeRepository(adminClient);
  const useCase = new AcceptConsent(employeeRepository);

  const result = await useCase.execute({
    authUserId: data.user.id,
    agreed: formData.get("agreed") === "true",
  });

  if (!result.success) {
    return { errorMessage: result.errorMessage };
  }

  redirect("/");
}
