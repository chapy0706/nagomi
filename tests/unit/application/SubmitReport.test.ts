import { describe, expect, it, vi } from "vitest";
import { SubmitReport } from "@/src/application/use-cases/SubmitReport";
import type { Report } from "@/src/domain/entities/Report";
import type { Clock } from "@/src/domain/ports/Clock";
import type { ReportGateway } from "@/src/domain/ports/ReportGateway";

const FIXED_NOW = new Date("2026-06-13T10:00:00Z");

function makeClock(): Clock {
  return { now: () => FIXED_NOW };
}

function makeGateway(): ReportGateway {
  return { submit: vi.fn(async (_report: Report) => {}) };
}

const BASE_INPUT = {
  reportedEmployeeId: "emp-uuid-1",
  category: "harassment" as const,
  content: "詳細な状況を記載",
};

describe("SubmitReport", () => {
  it("正常系: 通報が送信され success を返す", async () => {
    const gateway = makeGateway();
    const useCase = new SubmitReport(gateway, makeClock());

    const result = await useCase.execute(BASE_INPUT);

    expect(result.success).toBe(true);
    expect(gateway.submit).toHaveBeenCalledOnce();
  });

  it("送信された Report に通報者を特定できる情報が含まれない", async () => {
    const gateway = makeGateway();
    const useCase = new SubmitReport(gateway, makeClock());

    await useCase.execute(BASE_INPUT);

    const submitted = vi.mocked(gateway.submit).mock.calls[0][0];
    expect("reporterAuthId" in submitted).toBe(false);
    expect("reporterEmployeeId" in submitted).toBe(false);
    expect(submitted.reportedEmployeeId).toBe("emp-uuid-1");
  });

  it("内容が空は success=false を返しゲートウェイを呼ばない", async () => {
    const gateway = makeGateway();
    const useCase = new SubmitReport(gateway, makeClock());

    const result = await useCase.execute({ ...BASE_INPUT, content: "" });

    expect(result.success).toBe(false);
    expect(gateway.submit).not.toHaveBeenCalled();
  });

  it("2001文字は success=false を返す", async () => {
    const gateway = makeGateway();
    const useCase = new SubmitReport(gateway, makeClock());

    const result = await useCase.execute({ ...BASE_INPUT, content: "a".repeat(2001) });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.errorMessage).toMatch("2000文字");
    expect(gateway.submit).not.toHaveBeenCalled();
  });

  it("全カテゴリで送信できる", async () => {
    for (const category of [
      "harassment",
      "inappropriate_speech",
      "rule_violation",
      "other",
    ] as const) {
      const gateway = makeGateway();
      const useCase = new SubmitReport(gateway, makeClock());
      const result = await useCase.execute({ ...BASE_INPUT, category });
      expect(result.success).toBe(true);
    }
  });
});
