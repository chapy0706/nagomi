import { redirect } from "next/navigation";
import { LogoutButton } from "@/app/_components/LogoutButton";
import { getSessionContext } from "@/src/infrastructure/supabase/session";

export default async function Home() {
  const { employee } = await getSessionContext();

  if (employee.consentAcceptedAt === undefined) redirect("/onboarding/pin");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-gray-900">nagomi</h1>
        <p className="mt-2 text-sm text-gray-500">ようこそ、{employee.displayName} さん</p>
      </div>
      <div className="mt-8">
        <LogoutButton />
      </div>
    </main>
  );
}
