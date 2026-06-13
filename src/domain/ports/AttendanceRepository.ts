import type { AttendanceLog, LogSource } from "@/src/domain/entities/AttendanceLog";

export type AttendanceRepository = {
  save(log: AttendanceLog): Promise<void>;
  findOpenSession(employeeAuthId: string): Promise<AttendanceLog | undefined>;
  closeSession(logId: string, loggedOutAt: Date, source: LogSource): Promise<void>;
  findByEmployeeAuthId(
    employeeAuthId: string,
    options?: { limit?: number; since?: Date }
  ): Promise<AttendanceLog[]>;
};
