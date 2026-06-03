import type { BlockRepository } from "@/src/domain/ports/BlockRepository";

// issue-18 でブロック機能が実装されるまでの仮実装。常に「ブロックなし」を返す。
export class NullBlockRepository implements BlockRepository {
  async isBlocked(_inviterAuthId: string, _inviteeAuthId: string): Promise<boolean> {
    return false;
  }
}
