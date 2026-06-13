export type ReportCategory = "harassment" | "inappropriate_speech" | "rule_violation" | "other";

export const REPORT_CATEGORIES: readonly ReportCategory[] = [
  "harassment",
  "inappropriate_speech",
  "rule_violation",
  "other",
] as const;

const MAX_CONTENT_LENGTH = 2000;

export class Report {
  private constructor(
    readonly id: string,
    readonly reportedEmployeeId: string,
    readonly category: ReportCategory,
    readonly content: string,
    readonly context: Record<string, unknown> | undefined,
    readonly createdAt: Date
  ) {}

  static create(params: {
    id: string;
    reportedEmployeeId: string;
    category: ReportCategory;
    content: string;
    context?: Record<string, unknown>;
    createdAt: Date;
  }): Report {
    if (!REPORT_CATEGORIES.includes(params.category)) {
      throw new Error("無効なカテゴリです");
    }
    if (params.content.trim().length === 0) {
      throw new Error("通報内容を入力してください");
    }
    if (params.content.length > MAX_CONTENT_LENGTH) {
      throw new Error(`通報内容は${MAX_CONTENT_LENGTH}文字以内で入力してください`);
    }
    return new Report(
      params.id,
      params.reportedEmployeeId,
      params.category,
      params.content,
      params.context,
      params.createdAt
    );
  }
}
