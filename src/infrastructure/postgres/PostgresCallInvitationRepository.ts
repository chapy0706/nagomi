import { and, desc, eq, gte } from "drizzle-orm";
import { CallInvitation, type InvitationTopic } from "@/src/domain/entities/CallInvitation";
import type { CallInvitationRepository } from "@/src/domain/ports/CallInvitationRepository";
import type { getDb } from "./client";
import { callInvitations } from "./schema";

type Row = typeof callInvitations.$inferSelect;

const VALID_TOPICS: InvitationTopic[] = ["counseling", "casual", "meeting"];

function toEntity(row: Row): CallInvitation {
  const topic =
    row.topic && VALID_TOPICS.includes(row.topic as InvitationTopic)
      ? (row.topic as InvitationTopic)
      : undefined;

  return CallInvitation.issue({
    id: row.id,
    inviterAuthId: row.inviterAuthId,
    inviterDisplayName: row.inviterDisplayName,
    inviterAvatarUrl: row.inviterAvatarUrl ?? undefined,
    inviteeAuthId: row.inviteeAuthId,
    topic,
    now: row.createdAt,
  });
}

export class PostgresCallInvitationRepository implements CallInvitationRepository {
  constructor(private readonly db: ReturnType<typeof getDb>) {}

  async save(invitation: CallInvitation): Promise<void> {
    await this.db.insert(callInvitations).values({
      id: invitation.id,
      inviterAuthId: invitation.inviterAuthId,
      inviterDisplayName: invitation.inviterDisplayName,
      inviterAvatarUrl: invitation.inviterAvatarUrl ?? null,
      inviteeAuthId: invitation.inviteeAuthId,
      topic: invitation.topic ?? null,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
    });
  }

  async findRecentByParticipants(
    inviterAuthId: string,
    inviteeAuthId: string,
    since: Date
  ): Promise<CallInvitation | undefined> {
    const rows = await this.db
      .select()
      .from(callInvitations)
      .where(
        and(
          eq(callInvitations.inviterAuthId, inviterAuthId),
          eq(callInvitations.inviteeAuthId, inviteeAuthId),
          gte(callInvitations.createdAt, since)
        )
      )
      .orderBy(desc(callInvitations.createdAt))
      .limit(1);
    return rows[0] ? toEntity(rows[0]) : undefined;
  }

  async markAccepted(invitationId: string): Promise<void> {
    await this.db
      .update(callInvitations)
      .set({ status: "accepted" })
      .where(eq(callInvitations.id, invitationId));
  }

  async markDeclined(invitationId: string): Promise<void> {
    await this.db
      .update(callInvitations)
      .set({ status: "declined" })
      .where(eq(callInvitations.id, invitationId));
  }
}
