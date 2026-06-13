import { Report, type ReportCategory } from "@/src/domain/entities/Report";
import type { Clock } from "@/src/domain/ports/Clock";
import type { ReportGateway } from "@/src/domain/ports/ReportGateway";

export type SubmitReportInput = {
  reportedEmployeeId: string;
  category: ReportCategory;
  content: string;
  context?: Record<string, unknown>;
};

export type SubmitReportResult = { success: true } | { success: false; errorMessage: string };

export class SubmitReport {
  constructor(
    private readonly reportGateway: ReportGateway,
    private readonly clock: Clock
  ) {}

  async execute(input: SubmitReportInput): Promise<SubmitReportResult> {
    let report: Report;
    try {
      report = Report.create({
        id: crypto.randomUUID(),
        reportedEmployeeId: input.reportedEmployeeId,
        category: input.category,
        content: input.content,
        context: input.context,
        createdAt: this.clock.now(),
      });
    } catch (err) {
      return {
        success: false,
        errorMessage: err instanceof Error ? err.message : "通報の作成に失敗しました",
      };
    }
    await this.reportGateway.submit(report);
    return { success: true };
  }
}
