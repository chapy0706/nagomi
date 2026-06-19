import { and, desc, eq, gte, isNull } from "drizzle-orm";
import { AttendanceLog, type LogSource } from "@/src/domain/entities/AttendanceLog";
import type { AttendanceRepository } from "@/src/domain/ports/AttendanceRepository";
import type { getDb } from "./client";
import { attendanceLogs } from "./schema";

type Row = typeof attendanceLogs.$inferSelect;

function toEntity(row: Row): AttendanceLog {
  return AttendanceLog.reconstruct({
    id: row.id,
    employeeAuthId: row.employeeAuthId,
    loggedInAt: row.loggedInAt,
    loggedOutAt: row.loggedOutAt ?? undefined,
    source: row.source as LogSource,
  });
}

export class PostgresAttendanceRepository implements AttendanceRepository {
  constructor(private readonly db: ReturnType<typeof getDb>) {}

  async save(log: AttendanceLog): Promise<void> {
    await this.db.insert(attendanceLogs).values({
      id: log.id,
      employeeAuthId: log.employeeAuthId,
      loggedInAt: log.loggedInAt,
      loggedOutAt: log.loggedOutAt ?? null,
      source: log.source,
    });
  }

  async findOpenSession(employeeAuthId: string): Promise<AttendanceLog | undefined> {
    const rows = await this.db
      .select()
      .from(attendanceLogs)
      .where(
        and(eq(attendanceLogs.employeeAuthId, employeeAuthId), isNull(attendanceLogs.loggedOutAt))
      )
      .orderBy(desc(attendanceLogs.loggedInAt))
      .limit(1);
    return rows[0] ? toEntity(rows[0]) : undefined;
  }

  async closeSession(logId: string, loggedOutAt: Date, source: LogSource): Promise<void> {
    await this.db
      .update(attendanceLogs)
      .set({ loggedOutAt, source })
      .where(eq(attendanceLogs.id, logId));
  }

  async findByEmployeeAuthId(
    employeeAuthId: string,
    options?: { limit?: number; since?: Date }
  ): Promise<AttendanceLog[]> {
    const conditions = [eq(attendanceLogs.employeeAuthId, employeeAuthId)];
    if (options?.since) conditions.push(gte(attendanceLogs.loggedInAt, options.since));

    let query = this.db
      .select()
      .from(attendanceLogs)
      .where(and(...conditions))
      .orderBy(desc(attendanceLogs.loggedInAt));

    if (options?.limit) {
      query = query.limit(options.limit) as typeof query;
    }

    const rows = await query;
    return rows.map(toEntity);
  }
}
