import type { SupabaseClient } from "@supabase/supabase-js";
import type { Employee, EmployeeRepository } from "@/src/domain/ports/EmployeeRepository";
import type { DisplayName } from "@/src/domain/value-objects/DisplayName";
import { EmployeeId } from "@/src/domain/value-objects/EmployeeId";

type EmployeeRow = {
  id: string;
  employee_id: string;
  display_name: string;
  is_active: boolean;
  auth_user_id: string | null;
  consent_accepted_at: string | null;
  tutorial_completed_at: string | null;
  avatar_url: string | null;
};

function rowToEmployee(row: EmployeeRow): Employee {
  return {
    id: row.id,
    employeeId: EmployeeId.parse(row.employee_id),
    displayName: row.display_name,
    isActive: row.is_active,
    authUserId: row.auth_user_id ?? undefined,
    consentAcceptedAt: row.consent_accepted_at ? new Date(row.consent_accepted_at) : undefined,
    tutorialCompletedAt: row.tutorial_completed_at
      ? new Date(row.tutorial_completed_at)
      : undefined,
    avatarUrl: row.avatar_url ?? undefined,
  };
}

const SELECT_FIELDS =
  "id, employee_id, display_name, is_active, auth_user_id, consent_accepted_at, tutorial_completed_at, avatar_url";

export class SupabaseEmployeeRepository implements EmployeeRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findByEmployeeId(employeeId: EmployeeId): Promise<Employee | undefined> {
    const { data, error } = await this.client
      .from("employees")
      .select(SELECT_FIELDS)
      .eq("employee_id", employeeId.value)
      .single();

    if (error || !data) return undefined;
    return rowToEmployee(data as EmployeeRow);
  }

  async findByAuthUserId(authUserId: string): Promise<Employee | undefined> {
    const { data, error } = await this.client
      .from("employees")
      .select(SELECT_FIELDS)
      .eq("auth_user_id", authUserId)
      .single();

    if (error || !data) return undefined;
    return rowToEmployee(data as EmployeeRow);
  }

  async recordConsent(employeeId: EmployeeId): Promise<void> {
    const { error } = await this.client
      .from("employees")
      .update({ consent_accepted_at: new Date().toISOString() })
      .eq("employee_id", employeeId.value);

    if (error) throw new Error(`同意の記録に失敗しました: ${error.message}`);
  }

  async completeTutorial(authUserId: string): Promise<void> {
    const { error } = await this.client
      .from("employees")
      .update({ tutorial_completed_at: new Date().toISOString() })
      .eq("auth_user_id", authUserId)
      .is("tutorial_completed_at", null);

    if (error) throw new Error(`チュートリアル完了の記録に失敗しました: ${error.message}`);
  }

  async updateDisplayName(employeeId: EmployeeId, displayName: DisplayName): Promise<void> {
    const { error } = await this.client
      .from("employees")
      .update({ display_name: displayName.value })
      .eq("employee_id", employeeId.value);

    if (error) throw new Error(`表示名の更新に失敗しました: ${error.message}`);
  }

  async updateAvatarUrl(employeeId: EmployeeId, url: string | undefined): Promise<void> {
    const { error } = await this.client
      .from("employees")
      .update({ avatar_url: url ?? null })
      .eq("employee_id", employeeId.value);

    if (error) throw new Error(`アバター画像URLの更新に失敗しました: ${error.message}`);
  }
}
