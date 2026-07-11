import { and, eq, isNull } from "drizzle-orm";
import type { PresenceSessionRepository } from "@/src/domain/ports/PresenceSessionRepository";
import type { getDb } from "./client";
import { presenceSessions } from "./schema";

export class PostgresPresenceSessionRepository implements PresenceSessionRepository {
  constructor(private readonly db: ReturnType<typeof getDb>) {}

  async recordConnected(input: { employeeAuthId: string; connectionId: string }): Promise<void> {
    await this.db.insert(presenceSessions).values({
      employeeAuthId: input.employeeAuthId,
      connectionId: input.connectionId,
    });
  }

  // append-only 例外: 開いているセッション（disconnected_at IS NULL）の終了時刻のみ確定する。
  // 既に閉じた行や他列は書き換えない。
  async recordDisconnected(connectionId: string, disconnectedAt: Date): Promise<void> {
    await this.db
      .update(presenceSessions)
      .set({ disconnectedAt })
      .where(
        and(
          eq(presenceSessions.connectionId, connectionId),
          isNull(presenceSessions.disconnectedAt)
        )
      );
  }
}
