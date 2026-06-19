import { redirect } from "next/navigation";
import { createEmployeeRepository } from "@/src/infrastructure/repositoryFactory";
import { createSupabaseServerClient } from "@/src/infrastructure/supabase/serverClient";
import { TutorialStepper } from "./TutorialStepper";

export const metadata = { title: "使い方ガイド | nagomi" };

export default async function TutorialPage() {
  const serverClient = await createSupabaseServerClient();
  const { data } = await serverClient.auth.getUser();
  if (!data.user) redirect("/login");

  const employee = await createEmployeeRepository().findByAuthUserId(data.user.id);

  if (!employee) redirect("/login");
  if (employee.consentAcceptedAt === undefined) redirect("/onboarding/pin");

  const isFirstTime = employee.tutorialCompletedAt === undefined;

  return <TutorialStepper isFirstTime={isFirstTime} />;
}
