import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/src/infrastructure/supabase/adminClient";
import { SupabaseEmployeeRepository } from "@/src/infrastructure/supabase/SupabaseEmployeeRepository";
import { getSessionContext } from "@/src/infrastructure/supabase/session";
import { AvatarUploadForm } from "./AvatarUploadForm";
import { DisplayNameForm } from "./DisplayNameForm";

export const metadata = { title: "プロフィール設定 | nagomi" };

export default async function ProfilePage() {
  const { authUserId, employee } = await getSessionContext();

  if (employee.consentAcceptedAt === undefined) redirect("/onboarding/pin");

  const adminClient = createSupabaseAdminClient();
  const repo = new SupabaseEmployeeRepository(adminClient);
  const emp = await repo.findByAuthUserId(authUserId);

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <h1 className="mb-8 text-2xl font-semibold text-gray-900">プロフィール設定</h1>

      <section className="mb-8 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-medium text-gray-800">アバター画像</h2>
        <AvatarUploadForm
          displayName={employee.displayName}
          avatarUrl={employee.avatarUrl}
          seed={authUserId}
        />
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-medium text-gray-800">表示名</h2>
        <DisplayNameForm currentDisplayName={emp?.displayName ?? employee.displayName} />
      </section>
    </main>
  );
}
