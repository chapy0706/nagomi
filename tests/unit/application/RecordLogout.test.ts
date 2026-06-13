import { describe, expect, it, vi } from "vitest";
import { RecordLogout } from "@/src/application/use-cases/RecordLogout";
import { AttendanceLog } from "@/src/domain/entities/AttendanceLog";
import type { AttendanceRepository } from "@/src/domain/ports/AttendanceRepository";
import type { Clock } from "@/src/domain/ports/Clock";

const FIXED_IN = new Date("2026-06-13T09:00:00Z");
const FIXED_NOW = new Date("2026-06-13T17:30:00Z");

function makeClock(): Clock {
  return { now: () => FIXED_NOW };
}

const OPEN_SESSION = AttendanceLog.open({
  id: "log-abc",
  employeeAuthId: "auth-1",
  loggedInAt: FIXED_IN,
});

function makeRepo(openSession: AttendanceLog): AttendanceRepository {
  return {
    save: vi.fn(async () => {}),
    findOpenSession: vi.fn(async () => openSession),
    closeSession: vi.fn(async () => {}),
    findByEmployeeAuthId: vi.fn(async () => []),
  };
}

function makeEmptyRepo(): AttendanceRepository {
  return {
    save: vi.fn(async () => {}),
    findOpenSession: vi.fn(async () => undefined),
    closeSession: vi.fn(async () => {}),
    findByEmployeeAuthId: vi.fn(async () => []),
  };
}

describe("RecordLogout", () => {
  it("明示ログアウト時に openSession を explicit で閉じる", async () => {
    const repo = makeRepo(OPEN_SESSION);
    const useCase = new RecordLogout(repo, makeClock());

    await useCase.execute("auth-1", "explicit");

    expect(repo.closeSession).toHaveBeenCalledWith("log-abc", FIXED_NOW, "explicit");
  });

  it("inferred ログアウト時は inferred で閉じる", async () => {
    const repo = makeRepo(OPEN_SESSION);
    const useCase = new RecordLogout(repo, makeClock());

    await useCase.execute("auth-1", "inferred");

    expect(repo.closeSession).toHaveBeenCalledWith("log-abc", FIXED_NOW, "inferred");
  });

  it("オープンセッションがない場合は何もしない", async () => {
    const repo = makeEmptyRepo();
    const useCase = new RecordLogout(repo, makeClock());

    await useCase.execute("auth-1", "explicit");

    expect(repo.closeSession).not.toHaveBeenCalled();
  });
});
