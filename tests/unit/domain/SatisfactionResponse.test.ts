import { describe, expect, it } from "vitest";
import { SatisfactionResponse } from "@/src/domain/entities/SatisfactionResponse";

const FIXED_NOW = new Date("2026-06-13T10:00:00Z");

describe("SatisfactionResponse.forSession", () => {
  it("有効な評価（1〜5）で生成できる", () => {
    const r = SatisfactionResponse.forSession({
      id: "res-1",
      rating: 4,
      comment: undefined,
      submittedAt: FIXED_NOW,
    });
    expect(r.surveyType).toBe("session");
    expect(r.rating).toBe(4);
    expect(r.npsScore).toBeUndefined();
  });

  it("employeeId / authUserId フィールドを持たない（匿名性）", () => {
    const r = SatisfactionResponse.forSession({
      id: "res-anon",
      rating: 3,
      comment: undefined,
      submittedAt: FIXED_NOW,
    });
    // biome-ignore lint/suspicious/noExplicitAny: anonymity assertion
    expect((r as any).employeeId).toBeUndefined();
    // biome-ignore lint/suspicious/noExplicitAny: anonymity assertion
    expect((r as any).authUserId).toBeUndefined();
  });

  it("コメントが 300 文字以内なら保持する", () => {
    const comment = "a".repeat(300);
    const r = SatisfactionResponse.forSession({
      id: "res-2",
      rating: 5,
      comment,
      submittedAt: FIXED_NOW,
    });
    expect(r.comment).toBe(comment);
  });

  it("評価が範囲外（0）は例外", () => {
    expect(() =>
      SatisfactionResponse.forSession({
        id: "res-3",
        rating: 0,
        comment: undefined,
        submittedAt: FIXED_NOW,
      })
    ).toThrow("1〜5");
  });

  it("評価が範囲外（6）は例外", () => {
    expect(() =>
      SatisfactionResponse.forSession({
        id: "res-4",
        rating: 6,
        comment: undefined,
        submittedAt: FIXED_NOW,
      })
    ).toThrow("1〜5");
  });

  it("評価が小数は例外", () => {
    expect(() =>
      SatisfactionResponse.forSession({
        id: "res-5",
        rating: 3.5,
        comment: undefined,
        submittedAt: FIXED_NOW,
      })
    ).toThrow("1〜5");
  });

  it("コメントが 301 文字以上は例外", () => {
    expect(() =>
      SatisfactionResponse.forSession({
        id: "res-6",
        rating: 3,
        comment: "a".repeat(301),
        submittedAt: FIXED_NOW,
      })
    ).toThrow("300文字");
  });
});

describe("SatisfactionResponse.forNps", () => {
  it("有効なスコア（0〜10）で生成できる", () => {
    const r = SatisfactionResponse.forNps({
      id: "nps-1",
      npsScore: 8,
      comment: undefined,
      submittedAt: FIXED_NOW,
    });
    expect(r.surveyType).toBe("nps");
    expect(r.npsScore).toBe(8);
    expect(r.rating).toBeUndefined();
  });

  it("スコア 0 は有効", () => {
    const r = SatisfactionResponse.forNps({
      id: "nps-2",
      npsScore: 0,
      comment: undefined,
      submittedAt: FIXED_NOW,
    });
    expect(r.npsScore).toBe(0);
  });

  it("スコアが 11 以上は例外", () => {
    expect(() =>
      SatisfactionResponse.forNps({
        id: "nps-3",
        npsScore: 11,
        comment: undefined,
        submittedAt: FIXED_NOW,
      })
    ).toThrow("0〜10");
  });

  it("スコアが負の数は例外", () => {
    expect(() =>
      SatisfactionResponse.forNps({
        id: "nps-4",
        npsScore: -1,
        comment: undefined,
        submittedAt: FIXED_NOW,
      })
    ).toThrow("0〜10");
  });

  it("employeeId / authUserId フィールドを持たない（匿名性）", () => {
    const r = SatisfactionResponse.forNps({
      id: "nps-anon",
      npsScore: 7,
      comment: undefined,
      submittedAt: FIXED_NOW,
    });
    // biome-ignore lint/suspicious/noExplicitAny: anonymity assertion
    expect((r as any).employeeId).toBeUndefined();
    // biome-ignore lint/suspicious/noExplicitAny: anonymity assertion
    expect((r as any).authUserId).toBeUndefined();
  });
});
