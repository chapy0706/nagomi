import type { Report } from "@/src/domain/entities/Report";

export type ReportGateway = {
  submit(report: Report): Promise<void>;
};
