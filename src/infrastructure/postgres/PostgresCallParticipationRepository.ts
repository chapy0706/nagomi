import { and, desc, eq, isNull } from "drizzle-orm";
import { CallParticipationLog } from "@/src/domain/entities/CallParticipationLog";
import type { CallParticipationRepository } from "@/src/domain/ports/CallParticipationRepository";
import type { CallTopicKind } from "@/src/domain/value-objects/CallTopic";
import type { getDb } from "./client";
import { callParticipationLogs } from "./schema";

type Row = typeof callParticipationLogs.$inferSelect;

function toEntity(row: Row): CallParticipationLog {
  return CallParticipationLog.reconstruct({
    id: row.id,
    employeeAuthId: row.employeeAuthId,
    roomId: row.roomId,
    topic: row.topic as CallTopicKind,
    joinedAt: row.joinedAt,
    leftAt: row.leftAt ?? undefined,
  });
}

export class PostgresCallParticipationRepository implements CallParticipationRepository {
  constructor(private readonly db: ReturnType<typeof getDb>) {}

  async save(log: CallParticipationLog): Promise<void> {
    await this.db.insert(callParticipationLogs).values({
      id: log.id,
      employeeAuthId: log.employeeAuthId,
      roomId: log.roomId,
      topic: log.topic,
      joinedAt: log.joinedAt,
      leftAt: log.leftAt ?? null,
    });
  }

  async findOpenSession(employeeAuthId: string): Promise<CallParticipationLog | undefined> {
    const rows = await this.db
      .select()
      .from(callParticipationLogs)
      .where(
        and(
          eq(callParticipationLogs.employeeAuthId, employeeAuthId),
          isNull(callParticipationLogs.leftAt)
        )
      )
      .orderBy(desc(callParticipationLogs.joinedAt))
      .limit(1);
    return rows[0] ? toEntity(rows[0]) : undefined;
  }

  async closeSession(logId: string, leftAt: Date): Promise<void> {
    await this.db
      .update(callParticipationLogs)
      .set({ leftAt })
      .where(eq(callParticipationLogs.id, logId));
  }
}
