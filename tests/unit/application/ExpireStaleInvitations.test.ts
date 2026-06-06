import { describe, expect, it } from "vitest";
import { ExpireStaleInvitations } from "@/src/application/use-cases/ExpireStaleInvitations";
import type { Clock } from "@/src/domain/ports/Clock";

const FIXED_NOW = new Date("2026-06-03T10:00:00Z");

function makeClock(now: Date = FIXED_NOW): Clock {
  return { now: () => now };
}

describe("ExpireStaleInvitations.isExpired", () => {
  it("有効期限前は false", () => {
    const useCase = new ExpireStaleInvitations(makeClock());
    expect(useCase.isExpired({ expiresAt: new Date(FIXED_NOW.getTime() + 1) })).toBe(false);
  });

  it("有効期限と同時刻は true", () => {
    const useCase = new ExpireStaleInvitations(makeClock());
    expect(useCase.isExpired({ expiresAt: FIXED_NOW })).toBe(true);
  });

  it("有効期限後は true", () => {
    const useCase = new ExpireStaleInvitations(makeClock());
    expect(useCase.isExpired({ expiresAt: new Date(FIXED_NOW.getTime() - 1) })).toBe(true);
  });
});

describe("ExpireStaleInvitations.partition", () => {
  it("active と expired に分割する", () => {
    const useCase = new ExpireStaleInvitations(makeClock());
    const invitations = [
      { id: "a", expiresAt: new Date(FIXED_NOW.getTime() + 10_000) },
      { id: "b", expiresAt: new Date(FIXED_NOW.getTime() - 1) },
      { id: "c", expiresAt: new Date(FIXED_NOW.getTime() + 1) },
    ];

    const result = useCase.partition(invitations);

    expect(result.active.map((i) => i.id)).toEqual(["a", "c"]);
    expect(result.expired.map((i) => i.id)).toEqual(["b"]);
  });

  it("空配列を渡すと両方とも空配列", () => {
    const useCase = new ExpireStaleInvitations(makeClock());
    const result = useCase.partition([]);
    expect(result.active).toEqual([]);
    expect(result.expired).toEqual([]);
  });
});
