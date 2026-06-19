import { redirect } from "next/navigation";
import { createEmployeeRepository } from "@/src/infrastructure/repositoryFactory";
import { createSupabaseServerClient } from "@/src/infrastructure/supabase/serverClient";
import { ChangePinForm } from "./ChangePinForm";

export const metadata = { title: "PIN設定 | nagomi" };

export default async function ChangePinPage() {
  const serverClient = await createSupabaseServerClient();
  const { data } = await serverClient.auth.getUser();
  if (!data.user) redirect("/login");

  const employee = await createEmployeeRepository().findByAuthUserId(data.user.id);

  if (employee?.consentAcceptedAt !== undefined) redirect("/");

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-md">
        <h1 className="mb-2 text-center text-2xl font-semibold text-gray-900">ようこそ</h1>
        <p className="mb-6 text-center text-sm text-gray-500">
          最初に、新しいPINを設定してください。
        </p>
        <ChangePinForm />
      </div>
    </main>
  );
}
