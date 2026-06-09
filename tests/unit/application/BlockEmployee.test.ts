import { describe, expect, it, vi } from "vitest";
import { BlockEmployee } from "@/src/application/use-cases/BlockEmployee";
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

describe("BlockEmployee", () => {
  it("正常系: ブロックが登録される", async () => {
    const repo = makeRepo();
    const useCase = new BlockEmployee(repo);

    const result = await useCase.execute({
      blockerAuthId: "auth-a",
      blockedAuthId: "auth-b",
    });

    expect(result.success).toBe(true);
    expect(repo.block).toHaveBeenCalledWith("auth-a", "auth-b");
  });

  it("自己ブロックは self_block を返しDB操作しない", async () => {
    const repo = makeRepo();
    const useCase = new BlockEmployee(repo);

    const result = await useCase.execute({
      blockerAuthId: "auth-a",
      blockedAuthId: "auth-a",
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("self_block");
    expect(repo.block).not.toHaveBeenCalled();
  });
});
