import type { BlockedEmployeeSummary, BlockRepository } from "@/src/domain/ports/BlockRepository";

// issue-18 でブロック機能が実装されるまでの仮実装。常に「ブロックなし」を返す。
export class NullBlockRepository implements BlockRepository {
  async isBlocked(_blockerAuthId: string, _blockedAuthId: string): Promise<boolean> {
    return false;
  }

  async block(_blockerAuthId: string, _blockedAuthId: string): Promise<void> {}

  async unblock(_blockerAuthId: string, _blockedAuthId: string): Promise<void> {}

  async findBlockedAuthIds(_blockerAuthId: string): Promise<string[]> {
    return [];
  }

  async findBlockedSummaries(_blockerAuthId: string): Promise<BlockedEmployeeSummary[]> {
    return [];
  }
}
