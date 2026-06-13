import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "./adminClient";
import { createSupabaseServerClient } from "./serverClient";

export type SessionEmployee = {
  employeeId: string;
  displayName: string;
  avatarUrl: string | undefined;
  consentAcceptedAt: Date | undefined;
  tutorialCompletedAt: Date | undefined;
};

export type SessionContext = {
  authUserId: string;
  employee: SessionEmployee;
};

export async function getSessionContext(): Promise<SessionContext> {
  const serverClient = await createSupabaseServerClient();
  const { data } = await serverClient.auth.getUser();
  if (!data.user) redirect("/login");

  const adminClient = createSupabaseAdminClient();
  const { data: row } = await adminClient
    .from("employees")
    .select(
      "employee_id, display_name, avatar_url, is_active, consent_accepted_at, tutorial_completed_at"
    )
    .eq("auth_user_id", data.user.id)
    .maybeSingle();

  if (!row?.is_active) {
    await serverClient.auth.signOut();
    redirect("/login");
  }

  return {
    authUserId: data.user.id,
    employee: {
      employeeId: row.employee_id as string,
      displayName: row.display_name as string,
      avatarUrl: (row.avatar_url as string | null) ?? undefined,
      consentAcceptedAt: row.consent_accepted_at
        ? new Date(row.consent_accepted_at as string)
        : undefined,
      tutorialCompletedAt: row.tutorial_completed_at
        ? new Date(row.tutorial_completed_at as string)
        : undefined,
    },
  };
}
