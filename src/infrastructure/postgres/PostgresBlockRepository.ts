import { and, desc, eq, inArray } from "drizzle-orm";
import type { BlockedEmployeeSummary, BlockRepository } from "@/src/domain/ports/BlockRepository";
import type { getDb } from "./client";
import { blockRelations, employees } from "./schema";

export class PostgresBlockRepository implements BlockRepository {
  constructor(private readonly db: ReturnType<typeof getDb>) {}

  async isBlocked(blockerAuthId: string, blockedAuthId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: blockRelations.id })
      .from(blockRelations)
      .where(
        and(
          eq(blockRelations.blockerAuthId, blockerAuthId),
          eq(blockRelations.blockedAuthId, blockedAuthId)
        )
      )
      .limit(1);
    return rows.length > 0;
  }

  async block(blockerAuthId: string, blockedAuthId: string): Promise<void> {
    await this.db
      .insert(blockRelations)
      .values({ blockerAuthId, blockedAuthId })
      .onConflictDoNothing();
  }

  async unblock(blockerAuthId: string, blockedAuthId: string): Promise<void> {
    await this.db
      .delete(blockRelations)
      .where(
        and(
          eq(blockRelations.blockerAuthId, blockerAuthId),
          eq(blockRelations.blockedAuthId, blockedAuthId)
        )
      );
  }

  async findBlockedAuthIds(blockerAuthId: string): Promise<string[]> {
    const rows = await this.db
      .select({ blockedAuthId: blockRelations.blockedAuthId })
      .from(blockRelations)
      .where(eq(blockRelations.blockerAuthId, blockerAuthId));
    return rows.map((r) => r.blockedAuthId);
  }

  async findBlockedSummaries(blockerAuthId: string): Promise<BlockedEmployeeSummary[]> {
    const blocks = await this.db
      .select()
      .from(blockRelations)
      .where(eq(blockRelations.blockerAuthId, blockerAuthId))
      .orderBy(desc(blockRelations.createdAt));

    if (blocks.length === 0) return [];

    const blockedIds = blocks.map((b) => b.blockedAuthId);
    const emps = await this.db
      .select({
        authUserId: employees.authUserId,
        displayName: employees.displayName,
        avatarUrl: employees.avatarUrl,
      })
      .from(employees)
      .where(inArray(employees.authUserId, blockedIds));

    const empMap = new Map(emps.map((e) => [e.authUserId, e]));

    return blocks.map((b) => {
      const emp = empMap.get(b.blockedAuthId);
      return {
        blockedAuthId: b.blockedAuthId,
        displayName: emp?.displayName ?? "Unknown",
        avatarUrl: emp?.avatarUrl ?? undefined,
        blockedAt: b.createdAt,
      };
    });
  }
}
