import { describe, expect, it } from "vitest";
import { Report } from "@/src/domain/entities/Report";

const BASE = {
  id: "rep-1",
  reportedEmployeeId: "emp-uuid-1",
  category: "harassment" as const,
  content: "内容",
  createdAt: new Date("2026-06-13T10:00:00Z"),
};

describe("Report", () => {
  it("正常系: 通報を作成できる", () => {
    const report = Report.create(BASE);
    expect(report.reportedEmployeeId).toBe("emp-uuid-1");
    expect(report.category).toBe("harassment");
    expect(report.content).toBe("内容");
  });

  it("スキーマに通報者IDフィールドが存在しない", () => {
    const report = Report.create(BASE);
    // 通報者IDを持つプロパティが一切ないことを確認（ADR-005 の要件）
    expect("reporterAuthId" in report).toBe(false);
    expect("reporterEmployeeId" in report).toBe(false);
    expect("reporterUserId" in report).toBe(false);
  });

  it("無効なカテゴリはエラーになる", () => {
    expect(() => Report.create({ ...BASE, category: "invalid" as never })).toThrowError(
      "無効なカテゴリです"
    );
  });

  it("内容が空はエラーになる", () => {
    expect(() => Report.create({ ...BASE, content: "   " })).toThrowError(
      "通報内容を入力してください"
    );
  });

  it("2000文字を超える内容はエラーになる", () => {
    expect(() => Report.create({ ...BASE, content: "a".repeat(2001) })).toThrowError(
      "2000文字以内"
    );
  });

  it("2000文字ちょうどは作成できる", () => {
    const report = Report.create({ ...BASE, content: "a".repeat(2000) });
    expect(report.content).toHaveLength(2000);
  });

  it("全カテゴリが作成可能", () => {
    for (const category of [
      "harassment",
      "inappropriate_speech",
      "rule_violation",
      "other",
    ] as const) {
      expect(() => Report.create({ ...BASE, category })).not.toThrow();
    }
  });
});
