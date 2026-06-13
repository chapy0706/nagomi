import { AttendanceLog } from "@/src/domain/entities/AttendanceLog";
import type { AttendanceRepository } from "@/src/domain/ports/AttendanceRepository";
import type { Clock } from "@/src/domain/ports/Clock";

export class RecordLogin {
  constructor(
    private readonly repo: AttendanceRepository,
    private readonly clock: Clock
  ) {}

  async execute(employeeAuthId: string): Promise<void> {
    const log = AttendanceLog.open({
      id: crypto.randomUUID(),
      employeeAuthId,
      loggedInAt: this.clock.now(),
    });
    await this.repo.save(log);
  }
}
