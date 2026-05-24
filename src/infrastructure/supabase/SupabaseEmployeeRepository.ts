import type { SupabaseClient } from "@supabase/supabase-js";
import type { Employee, EmployeeRepository } from "@/src/domain/ports/EmployeeRepository";
import { EmployeeId } from "@/src/domain/value-objects/EmployeeId";

type EmployeeRow = {
  id: string;
  employee_id: string;
  display_name: string;
  is_active: boolean;
  auth_user_id: string | null;
  consent_accepted_at: string | null;
};

function rowToEmployee(row: EmployeeRow): Employee {
  return {
    id: row.id,
    employeeId: EmployeeId.parse(row.employee_id),
    displayName: row.display_name,
    isActive: row.is_active,
    authUserId: row.auth_user_id ?? undefined,
    consentAcceptedAt: row.consent_accepted_at ? new Date(row.consent_accepted_at) : undefined,
  };
}

export class SupabaseEmployeeRepository implements EmployeeRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findByEmployeeId(employeeId: EmployeeId): Promise<Employee | undefined> {
    const { data, error } = await this.client
      .from("employees")
      .select("id, employee_id, display_name, is_active, auth_user_id, consent_accepted_at")
      .eq("employee_id", employeeId.value)
      .single();

    if (error || !data) return undefined;
    return rowToEmployee(data as EmployeeRow);
  }

  async findByAuthUserId(authUserId: string): Promise<Employee | undefined> {
    const { data, error } = await this.client
      .from("employees")
      .select("id, employee_id, display_name, is_active, auth_user_id, consent_accepted_at")
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
}
