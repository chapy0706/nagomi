import { describe, expect, it, vi } from "vitest";
import { RecordCallLeave } from "@/src/application/use-cases/RecordCallLeave";
import { CallParticipationLog } from "@/src/domain/entities/CallParticipationLog";
import type { CallParticipationRepository } from "@/src/domain/ports/CallParticipationRepository";
import type { Clock } from "@/src/domain/ports/Clock";

const FIXED_JOIN = new Date("2026-06-13T10:00:00Z");
const FIXED_NOW = new Date("2026-06-13T11:30:00Z");

const OPEN_SESSION = CallParticipationLog.open({
  id: "log-xyz",
  employeeAuthId: "auth-1",
  roomId: "room-casual",
  topic: "casual",
  joinedAt: FIXED_JOIN,
});

function makeClock(): Clock {
  return { now: () => FIXED_NOW };
}

function makeRepo(openSession: CallParticipationLog): CallParticipationRepository {
  return {
    save: vi.fn(async () => {}),
    findOpenSession: vi.fn(async () => openSession),
    closeSession: vi.fn(async () => {}),
  };
}

function makeEmptyRepo(): CallParticipationRepository {
  return {
    save: vi.fn(async () => {}),
    findOpenSession: vi.fn(async () => undefined),
    closeSession: vi.fn(async () => {}),
  };
}

describe("RecordCallLeave", () => {
  it("オープンセッションを leftAt で閉じる", async () => {
    const repo = makeRepo(OPEN_SESSION);
    const useCase = new RecordCallLeave(repo, makeClock());

    await useCase.execute("auth-1");

    expect(repo.closeSession).toHaveBeenCalledWith("log-xyz", FIXED_NOW);
  });

  it("オープンセッションがない場合は何もしない", async () => {
    const repo = makeEmptyRepo();
    const useCase = new RecordCallLeave(repo, makeClock());

    await useCase.execute("auth-1");

    expect(repo.closeSession).not.toHaveBeenCalled();
  });
});
