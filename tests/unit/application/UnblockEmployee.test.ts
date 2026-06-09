import { describe, expect, it, vi } from "vitest";
import { UnblockEmployee } from "@/src/application/use-cases/UnblockEmployee";
import type { BlockRepository } from "@/src/domain/ports/BlockRepository";

function makeRepo(): BlockRepository {
  return {
    isBlocked: vi.fn(async () => false),
    block: vi.fn(async () => {}),
    unblock: vi.fn(async () => {}),
    findBlockedAuthIds: vi.fn(async () => []),
    findBlockedSummaries: vi.fn(async () => []),
  };
}

describe("UnblockEmployee", () => {
  it("正常系: ブロック解除が呼ばれる", async () => {
    const repo = makeRepo();
    const useCase = new UnblockEmployee(repo);

    await useCase.execute({ blockerAuthId: "auth-a", blockedAuthId: "auth-b" });

    expect(repo.unblock).toHaveBeenCalledWith("auth-a", "auth-b");
  });
});
