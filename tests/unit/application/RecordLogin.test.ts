import { describe, expect, it, vi } from "vitest";
import { RecordLogin } from "@/src/application/use-cases/RecordLogin";
import type { AttendanceLog } from "@/src/domain/entities/AttendanceLog";
import type { AttendanceRepository } from "@/src/domain/ports/AttendanceRepository";
import type { Clock } from "@/src/domain/ports/Clock";

const FIXED_NOW = new Date("2026-06-13T09:00:00Z");

function makeClock(): Clock {
  return { now: () => FIXED_NOW };
}

function makeRepo(): AttendanceRepository {
  return {
    save: vi.fn(async (_log: AttendanceLog) => {}),
    findOpenSession: vi.fn(async () => undefined),
    closeSession: vi.fn(async () => {}),
    findByEmployeeAuthId: vi.fn(async () => []),
  };
}

describe("RecordLogin", () => {
  it("新規ログインセッションを保存する", async () => {
    const repo = makeRepo();
    const useCase = new RecordLogin(repo, makeClock());

    await useCase.execute("auth-user-1");

    expect(repo.save).toHaveBeenCalledOnce();
    const saved = vi.mocked(repo.save).mock.calls[0][0];
    expect(saved.employeeAuthId).toBe("auth-user-1");
    expect(saved.loggedInAt).toEqual(FIXED_NOW);
    expect(saved.loggedOutAt).toBeUndefined();
    expect(saved.isOpen()).toBe(true);
  });

  it("id は UUID 形式で生成される", async () => {
    const repo = makeRepo();
    const useCase = new RecordLogin(repo, makeClock());

    await useCase.execute("auth-user-1");

    const saved = vi.mocked(repo.save).mock.calls[0][0];
    expect(saved.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });
});
