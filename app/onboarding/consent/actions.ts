"use server";

import { redirect } from "next/navigation";
import { AcceptConsent } from "@/src/application/use-cases/AcceptConsent";
import {
  createAuthGateway,
  createEmployeeRepository,
} from "@/src/infrastructure/repositoryFactory";

export type ConsentState = {
  errorMessage: string | undefined;
};

export async function consentAction(
  _prev: ConsentState,
  formData: FormData
): Promise<ConsentState> {
  const authUserId = await (await createAuthGateway()).getAuthUserId();
  if (!authUserId) redirect("/login");

  const result = await new AcceptConsent(createEmployeeRepository()).execute({
    authUserId,
    agreed: formData.get("agreed") === "true",
  });

  if (!result.success) {
    return { errorMessage: result.errorMessage };
  }

  redirect("/onboarding/tutorial");
}
