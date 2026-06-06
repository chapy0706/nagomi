import { describe, expect, it, vi } from "vitest";
import { DeclineCallInvitation } from "@/src/application/use-cases/DeclineCallInvitation";
import type { CallInvitationRepository } from "@/src/domain/ports/CallInvitationRepository";

function makeRepo(): CallInvitationRepository {
  return {
    save: vi.fn(async () => {}),
    findRecentByParticipants: vi.fn(async () => undefined),
    markAccepted: vi.fn(async () => {}),
    markDeclined: vi.fn(async () => {}),
  };
}

describe("DeclineCallInvitation", () => {
  it("招待を declined として記録する", async () => {
    const repo = makeRepo();
    const useCase = new DeclineCallInvitation(repo);

    await useCase.execute({ invitationId: "inv-1" });

    expect(repo.markDeclined).toHaveBeenCalledWith("inv-1");
  });

  it("招待者への通知は行わない（broadcast gateway を依存に持たない）", () => {
    const repo = makeRepo();
    // コンストラクタが repository のみで成立することを型レベルで保証する。
    const useCase = new DeclineCallInvitation(repo);
    expect(useCase).toBeDefined();
  });
});
