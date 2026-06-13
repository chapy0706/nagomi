import { describe, expect, it, vi } from "vitest";
import { RecordCallJoin } from "@/src/application/use-cases/RecordCallJoin";
import type { CallParticipationLog } from "@/src/domain/entities/CallParticipationLog";
import type { CallParticipationRepository } from "@/src/domain/ports/CallParticipationRepository";
import type { Clock } from "@/src/domain/ports/Clock";

const FIXED_NOW = new Date("2026-06-13T10:00:00Z");

function makeClock(): Clock {
  return { now: () => FIXED_NOW };
}

function makeRepo(): CallParticipationRepository {
  return {
    save: vi.fn(async (_log: CallParticipationLog) => {}),
    findOpenSession: vi.fn(async () => undefined),
    closeSession: vi.fn(async () => {}),
  };
}

describe("RecordCallJoin", () => {
  it("参加ログを保存する", async () => {
    const repo = makeRepo();
    const useCase = new RecordCallJoin(repo, makeClock());

    await useCase.execute({ employeeAuthId: "auth-1", roomId: "room-casual", topic: "casual" });

    expect(repo.save).toHaveBeenCalledOnce();
    const saved = vi.mocked(repo.save).mock.calls[0][0];
    expect(saved.employeeAuthId).toBe("auth-1");
    expect(saved.roomId).toBe("room-casual");
    expect(saved.topic).toBe("casual");
    expect(saved.joinedAt).toEqual(FIXED_NOW);
    expect(saved.leftAt).toBeUndefined();
    expect(saved.isOpen()).toBe(true);
  });

  it("id は UUID 形式で生成される", async () => {
    const repo = makeRepo();
    const useCase = new RecordCallJoin(repo, makeClock());

    await useCase.execute({ employeeAuthId: "auth-1", roomId: "room-casual", topic: "casual" });

    const saved = vi.mocked(repo.save).mock.calls[0][0];
    expect(saved.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });

  it("通話相手の情報は含まない", async () => {
    const repo = makeRepo();
    const useCase = new RecordCallJoin(repo, makeClock());

    await useCase.execute({ employeeAuthId: "auth-1", roomId: "room-casual", topic: "casual" });

    const saved = vi.mocked(repo.save).mock.calls[0][0];
    expect("participantIds" in saved).toBe(false);
    expect("partnerAuthId" in saved).toBe(false);
  });
});
