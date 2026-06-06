import { describe, expect, it, vi } from "vitest";
import { IssueCallInvitation } from "@/src/application/use-cases/IssueCallInvitation";
import type { CallInvitation } from "@/src/domain/entities/CallInvitation";
import type { BlockRepository } from "@/src/domain/ports/BlockRepository";
import type { CallInvitationRepository } from "@/src/domain/ports/CallInvitationRepository";
import type { Clock } from "@/src/domain/ports/Clock";
import type { InvitationBroadcastGateway } from "@/src/domain/ports/InvitationBroadcastGateway";

const FIXED_NOW = new Date("2026-06-03T10:00:00Z");

function makeClock(): Clock {
  return { now: () => FIXED_NOW };
}

function makeRepo(recent?: CallInvitation): CallInvitationRepository {
  return {
    save: vi.fn(async () => {}),
    findRecentByParticipants: vi.fn(async () => recent),
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

function makeBlockRepo(blocked = false): BlockRepository {
  return { isBlocked: vi.fn(async () => blocked) };
}

const BASE_INPUT = {
  inviterAuthId: "auth-a",
  inviterDisplayName: "Alice",
  inviterAvatarUrl: undefined,
  inviteeAuthId: "auth-b",
  inviteeStatus: "available" as const,
  topic: undefined,
};

describe("IssueCallInvitation", () => {
  it("正常系: 招待が保存・ブロードキャストされ success を返す", async () => {
    const repo = makeRepo();
    const broadcast = makeBroadcast();
    const useCase = new IssueCallInvitation(repo, broadcast, makeBlockRepo(), makeClock());

    const result = await useCase.execute(BASE_INPUT);

    expect(result.success).toBe(true);
    expect(repo.save).toHaveBeenCalledOnce();
    expect(broadcast.broadcastInvitation).toHaveBeenCalledWith(
      "auth-b",
      expect.objectContaining({ inviterDisplayName: "Alice", inviterAuthId: "auth-a" })
    );
  });

  it("自己招待は self_invite を返しDB保存しない", async () => {
    const repo = makeRepo();
    const useCase = new IssueCallInvitation(repo, makeBroadcast(), makeBlockRepo(), makeClock());

    const result = await useCase.execute({
      ...BASE_INPUT,
      inviteeAuthId: BASE_INPUT.inviterAuthId,
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("self_invite");
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("invitee が busy なら invitee_unavailable を返す", async () => {
    const useCase = new IssueCallInvitation(
      makeRepo(),
      makeBroadcast(),
      makeBlockRepo(),
      makeClock()
    );
    const result = await useCase.execute({ ...BASE_INPUT, inviteeStatus: "busy" });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("invitee_unavailable");
  });

  it("invitee が in_call なら invitee_unavailable を返す", async () => {
    const useCase = new IssueCallInvitation(
      makeRepo(),
      makeBroadcast(),
      makeBlockRepo(),
      makeClock()
    );
    const result = await useCase.execute({ ...BASE_INPUT, inviteeStatus: "in_call" });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("invitee_unavailable");
  });

  it("ブロック中は blocked を返しDB保存しない", async () => {
    const repo = makeRepo();
    const useCase = new IssueCallInvitation(
      repo,
      makeBroadcast(),
      makeBlockRepo(true),
      makeClock()
    );

    const result = await useCase.execute(BASE_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("blocked");
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("クールダウン中は cooldown を返しDB保存しない", async () => {
    const recentInvitation = {} as CallInvitation;
    const repo = makeRepo(recentInvitation);
    const useCase = new IssueCallInvitation(repo, makeBroadcast(), makeBlockRepo(), makeClock());

    const result = await useCase.execute(BASE_INPUT);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("cooldown");
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("クールダウンチェックに正しい since 時刻を渡す", async () => {
    const repo = makeRepo();
    const useCase = new IssueCallInvitation(repo, makeBroadcast(), makeBlockRepo(), makeClock());

    await useCase.execute(BASE_INPUT);

    const expectedSince = new Date(FIXED_NOW.getTime() - 60_000);
    expect(repo.findRecentByParticipants).toHaveBeenCalledWith("auth-a", "auth-b", expectedSince);
  });
});
