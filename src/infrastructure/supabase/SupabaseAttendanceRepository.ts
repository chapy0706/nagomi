import type { SupabaseClient } from "@supabase/supabase-js";
import { AttendanceLog, type LogSource } from "@/src/domain/entities/AttendanceLog";
import type { AttendanceRepository } from "@/src/domain/ports/AttendanceRepository";

type AttendanceLogRow = {
  id: string;
  employee_auth_id: string;
  logged_in_at: string;
  logged_out_at: string | null;
  source: string;
};

function toEntity(row: AttendanceLogRow): AttendanceLog {
  return AttendanceLog.reconstruct({
    id: row.id,
    employeeAuthId: row.employee_auth_id,
    loggedInAt: new Date(row.logged_in_at),
    loggedOutAt: row.logged_out_at ? new Date(row.logged_out_at) : undefined,
    source: row.source as LogSource,
  });
}

export class SupabaseAttendanceRepository implements AttendanceRepository {
  constructor(private readonly client: SupabaseClient) {}

  async save(log: AttendanceLog): Promise<void> {
    const { error } = await this.client.from("attendance_logs").insert({
      id: log.id,
      employee_auth_id: log.employeeAuthId,
      logged_in_at: log.loggedInAt.toISOString(),
      logged_out_at: log.loggedOutAt?.toISOString() ?? null,
      source: log.source,
    });
    if (error) throw new Error(`在席ログの保存に失敗しました: ${error.message}`);
  }

  async findOpenSession(employeeAuthId: string): Promise<AttendanceLog | undefined> {
    const { data, error } = await this.client
      .from("attendance_logs")
      .select("*")
      .eq("employee_auth_id", employeeAuthId)
      .is("logged_out_at", null)
      .order("logged_in_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`在席ログの取得に失敗しました: ${error.message}`);
    return data ? toEntity(data as AttendanceLogRow) : undefined;
  }

  async closeSession(logId: string, loggedOutAt: Date, source: LogSource): Promise<void> {
    const { error } = await this.client
      .from("attendance_logs")
      .update({ logged_out_at: loggedOutAt.toISOString(), source })
      .eq("id", logId);
    if (error) throw new Error(`在席ログの更新に失敗しました: ${error.message}`);
  }

  async findByEmployeeAuthId(
    employeeAuthId: string,
    options?: { limit?: number; since?: Date }
  ): Promise<AttendanceLog[]> {
    let query = this.client
      .from("attendance_logs")
      .select("*")
      .eq("employee_auth_id", employeeAuthId)
      .order("logged_in_at", { ascending: false });
    if (options?.since) {
      query = query.gte("logged_in_at", options.since.toISOString());
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    const { data, error } = await query;
    if (error) throw new Error(`在席ログの取得に失敗しました: ${error.message}`);
    return (data ?? []).map((row) => toEntity(row as AttendanceLogRow));
  }
}
