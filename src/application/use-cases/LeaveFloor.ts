import type { PresenceGateway } from "@/src/domain/ports/PresenceGateway";

export class LeaveFloor {
  constructor(private readonly presenceGateway: PresenceGateway) {}

  async execute(): Promise<void> {
    await this.presenceGateway.leave();
  }
}
