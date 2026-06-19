import type { Report } from "@/src/domain/entities/Report";
import type { ReportGateway } from "@/src/domain/ports/ReportGateway";
import type { getDb } from "./client";
import { reports } from "./schema";

export class PostgresReportGateway implements ReportGateway {
  constructor(private readonly db: ReturnType<typeof getDb>) {}

  async submit(report: Report): Promise<void> {
    await this.db.insert(reports).values({
      id: report.id,
      reportedEmployeeId: report.reportedEmployeeId,
      category: report.category,
      content: report.content,
      context: report.context ?? null,
      createdAt: report.createdAt,
    });
  }
}
