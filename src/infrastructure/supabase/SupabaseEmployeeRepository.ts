import type { SupabaseClient } from "@supabase/supabase-js";
import type { Employee, EmployeeRepository } from "@/src/domain/ports/EmployeeRepository";
import { EmployeeId } from "@/src/domain/value-objects/EmployeeId";

type EmployeeRow = {
  id: string;
  employee_id: string;
  display_name: string;
  is_active: boolean;
  auth_user_id: string | null;
};

export class SupabaseEmployeeRepository implements EmployeeRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findByEmployeeId(employeeId: EmployeeId): Promise<Employee | undefined> {
    const { data, error } = await this.client
      .from("employees")
      .select("id, employee_id, display_name, is_active, auth_user_id")
      .eq("employee_id", employeeId.value)
      .single();

    if (error || !data) return undefined;

    const row = data as EmployeeRow;
    return {
      id: row.id,
      employeeId: EmployeeId.parse(row.employee_id),
      displayName: row.display_name,
      isActive: row.is_active,
      authUserId: row.auth_user_id ?? undefined,
    };
  }
}
