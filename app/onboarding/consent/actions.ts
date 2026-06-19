"use server";

import { redirect } from "next/navigation";
import { AcceptConsent } from "@/src/application/use-cases/AcceptConsent";
import { createEmployeeRepository } from "@/src/infrastructure/repositoryFactory";
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

  const result = await new AcceptConsent(createEmployeeRepository()).execute({
    authUserId: data.user.id,
    agreed: formData.get("agreed") === "true",
  });

  if (!result.success) {
    return { errorMessage: result.errorMessage };
  }

  redirect("/onboarding/tutorial");
}
