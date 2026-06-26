import { redirect } from "next/navigation";
import {
  createAuthGateway,
  createEmployeeRepository,
  isKeycloakAuthProvider,
} from "@/src/infrastructure/repositoryFactory";
import { TutorialStepper } from "./TutorialStepper";

export const metadata = { title: "使い方ガイド | nagomi" };

export default async function TutorialPage() {
  const authUserId = await (await createAuthGateway()).getAuthUserId();
  if (!authUserId) redirect("/login");

  const employee = await createEmployeeRepository().findByAuthUserId(authUserId);

  if (!employee) redirect("/login");
  if (employee.consentAcceptedAt === undefined) {
    redirect(isKeycloakAuthProvider() ? "/onboarding/consent" : "/onboarding/pin");
  }

  const isFirstTime = employee.tutorialCompletedAt === undefined;

  return <TutorialStepper isFirstTime={isFirstTime} />;
}
