import type { LogSource } from "@/src/domain/entities/AttendanceLog";
import type { AttendanceRepository } from "@/src/domain/ports/AttendanceRepository";
import type { Clock } from "@/src/domain/ports/Clock";

export class RecordLogout {
  constructor(
    private readonly repo: AttendanceRepository,
    private readonly clock: Clock
  ) {}

  async execute(employeeAuthId: string, source: LogSource): Promise<void> {
    const openSession = await this.repo.findOpenSession(employeeAuthId);
    if (!openSession) return;
    await this.repo.closeSession(openSession.id, this.clock.now(), source);
  }
}
