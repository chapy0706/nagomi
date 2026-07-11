import type { Clock } from "@/src/domain/ports/Clock";
import type { PresenceSessionRepository } from "@/src/domain/ports/PresenceSessionRepository";

/// WebSocket 接続終了を在室証跡として記録する（開いているセッションの終了時刻を確定）。
/// 時刻は Clock ポート経由で取得する（new Date() を直接呼ばない）。
export class RecordPresenceSessionEnd {
  constructor(
    private readonly repo: PresenceSessionRepository,
    private readonly clock: Clock
  ) {}

  async execute(input: { connectionId: string }): Promise<void> {
    await this.repo.recordDisconnected(input.connectionId, this.clock.now());
  }
}
