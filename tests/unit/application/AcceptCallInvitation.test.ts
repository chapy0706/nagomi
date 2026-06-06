import { describe, expect, it, vi } from "vitest";
import { AcceptCallInvitation } from "@/src/application/use-cases/AcceptCallInvitation";
import type { CallInvitationRepository } from "@/src/domain/ports/CallInvitationRepository";
import type { Clock } from "@/src/domain/ports/Clock";
import type { InvitationBroadcastGateway } from "@/src/domain/ports/InvitationBroadcastGateway";

const FIXED_NOW = new Date("2026-06-03T10:00:00Z");

function makeClock(now: Date = FIXED_NOW): Clock {
  return { now: () => now };
}

function makeRepo(): CallInvitationRepository {
  return {
    save: vi.fn(async () => {}),
    findRecentByParticipants: vi.fn(async () => undefined),
    markAccepted: vi.fn(async () => {}),
    markDeclined: vi.fn(async () => {}),
  };
}

function makeBroadcast(): InvitationBroadcastGateway {
  return {
    broadcastInvitation: vi.fn(async () => {}),
    broadcastAcceptance: vi.fn(async () => {}),
    subscribeToInvitations: vi.fn(async () => () => {}),
    subscribeToAcceptances: vi.fn(async () => () => {}),
  };
}

const BASE_INPUT = {
  invitationId: "inv-1",
  inviterAuthId: "auth-a",
  expiresAt: new Date(FIXED_NOW.getTime() + 10_000),
};

describe("AcceptCallInvitation", () => {
  it("有効な招待を承諾し、roomId が返る", async () => {
    const repo = makeRepo();
    const broadcast = makeBroadcast();
    const useCase = new AcceptCallInvitation(repo, broadcast, makeClock());

    const result = await useCase.execute(BASE_INPUT);

    expect(result.success).toBe(true);
    if (result.success) expect(result.roomId).toBe("inv-1");
    expect(repo.markAccepted).toHaveBeenCalledWith("inv-1");
    expect(broadcast.broadcastAcceptance).toHaveBeenCalledWith("auth-a", {
      invitationId: "inv-1",
      roomId: "inv-1",
    });
  });

  it("失効済みなら expired を返し、DB 更新もブロードキャストも行わない", async () => {
    const repo = makeRepo();
    const broadcast = makeBroadcast();
    const useCase = new AcceptCallInvitation(repo, broadcast, makeClock());

    const result = await useCase.execute({
      ...BASE_INPUT,
      expiresAt: new Date(FIXED_NOW.getTime() - 1),
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("expired");
    expect(repo.markAccepted).not.toHaveBeenCalled();
    expect(broadcast.broadcastAcceptance).not.toHaveBeenCalled();
  });

  it("有効期限ちょうどは expired として扱う", async () => {
    const repo = makeRepo();
    const useCase = new AcceptCallInvitation(repo, makeBroadcast(), makeClock());

    const result = await useCase.execute({ ...BASE_INPUT, expiresAt: FIXED_NOW });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("expired");
  });
});
