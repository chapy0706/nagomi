import type { PresenceGateway, PresenceStatus } from "@/src/domain/ports/PresenceGateway";

export class UpdateStatus {
  constructor(private readonly presenceGateway: PresenceGateway) {}

  async execute(status: PresenceStatus): Promise<void> {
    await this.presenceGateway.updateStatus(status);
  }
}
