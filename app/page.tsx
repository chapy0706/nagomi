import { redirect } from "next/navigation";
import { FloorCanvas } from "@/app/_components/FloorCanvas";
import { isKeycloakAuthProvider } from "@/src/infrastructure/repositoryFactory";
import { getSessionContext } from "@/src/infrastructure/session";

export default async function Home() {
  const { authUserId, employee } = await getSessionContext();

  // 未同意ならオンボーディングへ。Keycloak モードでは PIN 設定（Supabase パスワード）が
  // 不要なため PIN ステップを飛ばして同意から始める（ADR-010）。
  if (employee.consentAcceptedAt === undefined) {
    redirect(isKeycloakAuthProvider() ? "/onboarding/consent" : "/onboarding/pin");
  }

  return (
    <main className="w-full h-dvh overflow-hidden">
      <FloorCanvas
        authUserId={authUserId}
        selfEmployeeId={employee.employeeId}
        selfDisplayName={employee.displayName}
        selfAvatarUrl={employee.avatarUrl}
      />
    </main>
  );
}
