import type { CallParticipationRepository } from "@/src/domain/ports/CallParticipationRepository";
import type { Clock } from "@/src/domain/ports/Clock";

export class RecordCallLeave {
  constructor(
    private readonly repo: CallParticipationRepository,
    private readonly clock: Clock
  ) {}

  async execute(employeeAuthId: string): Promise<void> {
    const openSession = await this.repo.findOpenSession(employeeAuthId);
    if (!openSession) return;
    await this.repo.closeSession(openSession.id, this.clock.now());
  }
}
