import type { CallTopicKind } from "@/src/domain/value-objects/CallTopic";

export type CallInvitationStatus = "pending" | "accepted" | "declined" | "expired";
export type InvitationTopic = CallTopicKind;

const EXPIRY_SECONDS = 30;

export class CallInvitation {
  private constructor(
    readonly id: string,
    readonly inviterAuthId: string,
    readonly inviterDisplayName: string,
    readonly inviterAvatarUrl: string | undefined,
    readonly inviteeAuthId: string,
    readonly topic: InvitationTopic | undefined,
    readonly status: CallInvitationStatus,
    readonly expiresAt: Date,
    readonly createdAt: Date
  ) {}

  static issue(params: {
    id: string;
    inviterAuthId: string;
    inviterDisplayName: string;
    inviterAvatarUrl: string | undefined;
    inviteeAuthId: string;
    topic: InvitationTopic | undefined;
    now: Date;
  }): CallInvitation {
    if (params.inviterAuthId === params.inviteeAuthId) {
      throw new Error("自分自身には招待を送れません");
    }
    const expiresAt = new Date(params.now.getTime() + EXPIRY_SECONDS * 1000);
    return new CallInvitation(
      params.id,
      params.inviterAuthId,
      params.inviterDisplayName,
      params.inviterAvatarUrl,
      params.inviteeAuthId,
      params.topic,
      "pending",
      expiresAt,
      params.now
    );
  }

  isExpired(now: Date): boolean {
    return now >= this.expiresAt;
  }

  isPending(): boolean {
    return this.status === "pending";
  }
}
