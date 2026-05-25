import { redirect } from "next/navigation";
import { FloorCanvas } from "@/app/_components/FloorCanvas";
import { getSessionContext } from "@/src/infrastructure/supabase/session";

export default async function Home() {
  const { authUserId, employee } = await getSessionContext();

  if (employee.consentAcceptedAt === undefined) redirect("/onboarding/pin");

  return (
    <main className="w-screen h-screen overflow-hidden">
      <FloorCanvas
        authUserId={authUserId}
        selfEmployeeId={employee.employeeId}
        selfDisplayName={employee.displayName}
        selfAvatarUrl={employee.avatarUrl}
      />
    </main>
  );
}
