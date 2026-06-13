import type { SupabaseClient } from "@supabase/supabase-js";
import type { Report } from "@/src/domain/entities/Report";
import type { ReportGateway } from "@/src/domain/ports/ReportGateway";

export class SupabaseReportGateway implements ReportGateway {
  constructor(private readonly client: SupabaseClient) {}

  async submit(report: Report): Promise<void> {
    const { error } = await this.client.from("reports").insert({
      id: report.id,
      reported_employee_id: report.reportedEmployeeId,
      category: report.category,
      content: report.content,
      context: report.context ?? null,
      created_at: report.createdAt.toISOString(),
    });
    if (error) throw new Error(`通報の送信に失敗しました: ${error.message}`);
  }
}
