import type { InvitationTopic } from "@/src/domain/entities/CallInvitation";

export type InvitationPayload = {
  readonly id: string;
  readonly inviterDisplayName: string;
  readonly inviterAvatarUrl: string | undefined;
  readonly topic: InvitationTopic | undefined;
  readonly expiresAt: string;
};

export type InvitationBroadcastGateway = {
  broadcastInvitation(inviteeAuthId: string, payload: InvitationPayload): Promise<void>;
};
