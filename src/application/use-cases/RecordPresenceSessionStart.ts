import type { PresenceSessionRepository } from "@/src/domain/ports/PresenceSessionRepository";

/// WebSocket 接続確立を在室証跡として記録する。
export class RecordPresenceSessionStart {
  constructor(private readonly repo: PresenceSessionRepository) {}

  async execute(input: { employeeAuthId: string; connectionId: string }): Promise<void> {
    await this.repo.recordConnected(input);
  }
}
