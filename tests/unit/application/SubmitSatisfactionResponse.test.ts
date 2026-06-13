import { describe, expect, it, vi } from "vitest";
import { SubmitSatisfactionResponse } from "@/src/application/use-cases/SubmitSatisfactionResponse";
import type { SatisfactionResponse } from "@/src/domain/entities/SatisfactionResponse";
import type { Clock } from "@/src/domain/ports/Clock";
import type { SatisfactionResponseGateway } from "@/src/domain/ports/SatisfactionResponseGateway";

const FIXED_NOW = new Date("2026-06-13T10:00:00Z");

function makeClock(): Clock {
  return { now: () => FIXED_NOW };
}

function makeGateway(): SatisfactionResponseGateway {
  return { submit: vi.fn(async (_r: SatisfactionResponse) => {}) };
}

describe("SubmitSatisfactionResponse — session", () => {
  it("有効な評価で success を返す", async () => {
    const gateway = makeGateway();
    const useCase = new SubmitSatisfactionResponse(gateway, makeClock());
    const result = await useCase.execute({ type: "session", rating: 4 });
    expect(result.success).toBe(true);
    expect(gateway.submit).toHaveBeenCalledOnce();
  });

  it("評価 0 は success=false を返しゲートウェイを呼ばない", async () => {
    const gateway = makeGateway();
    const useCase = new SubmitSatisfactionResponse(gateway, makeClock());
    const result = await useCase.execute({ type: "session", rating: 0 });
    expect(result.success).toBe(false);
    expect(gateway.submit).not.toHaveBeenCalled();
  });

  it("評価 6 は success=false を返す", async () => {
    const gateway = makeGateway();
    const useCase = new SubmitSatisfactionResponse(gateway, makeClock());
    const result = await useCase.execute({ type: "session", rating: 6 });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errorMessage).toBeTruthy();
  });

  it("送信された回答に employeeId / authUserId が含まれない（匿名性）", async () => {
    const gateway = makeGateway();
    const useCase = new SubmitSatisfactionResponse(gateway, makeClock());
    await useCase.execute({ type: "session", rating: 3 });
    const submitted = vi.mocked(gateway.submit).mock.calls[0][0];
    // biome-ignore lint/suspicious/noExplicitAny: anonymity assertion
    expect((submitted as any).employeeId).toBeUndefined();
    // biome-ignore lint/suspicious/noExplicitAny: anonymity assertion
    expect((submitted as any).authUserId).toBeUndefined();
  });

  it("surveyType が session である", async () => {
    const gateway = makeGateway();
    const useCase = new SubmitSatisfactionResponse(gateway, makeClock());
    await useCase.execute({ type: "session", rating: 5 });
    const submitted = vi.mocked(gateway.submit).mock.calls[0][0];
    expect(submitted.surveyType).toBe("session");
  });
});

describe("SubmitSatisfactionResponse — nps", () => {
  it("有効なスコアで success を返す", async () => {
    const gateway = makeGateway();
    const useCase = new SubmitSatisfactionResponse(gateway, makeClock());
    const result = await useCase.execute({ type: "nps", npsScore: 9 });
    expect(result.success).toBe(true);
    expect(gateway.submit).toHaveBeenCalledOnce();
  });

  it("スコア 0 は有効", async () => {
    const gateway = makeGateway();
    const useCase = new SubmitSatisfactionResponse(gateway, makeClock());
    const result = await useCase.execute({ type: "nps", npsScore: 0 });
    expect(result.success).toBe(true);
  });

  it("スコア 11 は success=false を返す", async () => {
    const gateway = makeGateway();
    const useCase = new SubmitSatisfactionResponse(gateway, makeClock());
    const result = await useCase.execute({ type: "nps", npsScore: 11 });
    expect(result.success).toBe(false);
    expect(gateway.submit).not.toHaveBeenCalled();
  });

  it("surveyType が nps である", async () => {
    const gateway = makeGateway();
    const useCase = new SubmitSatisfactionResponse(gateway, makeClock());
    await useCase.execute({ type: "nps", npsScore: 7 });
    const submitted = vi.mocked(gateway.submit).mock.calls[0][0];
    expect(submitted.surveyType).toBe("nps");
  });
});
