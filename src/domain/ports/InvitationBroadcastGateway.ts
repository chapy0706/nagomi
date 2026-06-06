import type { InvitationTopic } from "@/src/domain/entities/CallInvitation";

export type InvitationPayload = {
  readonly id: string;
  readonly inviterAuthId: string;
  readonly inviterDisplayName: string;
  readonly inviterAvatarUrl: string | undefined;
  readonly topic: InvitationTopic | undefined;
  readonly expiresAt: string;
};

export type InvitationAcceptancePayload = {
  readonly invitationId: string;
  readonly roomId: string;
};

export type Unsubscribe = () => void;

export type InvitationBroadcastGateway = {
  broadcastInvitation(inviteeAuthId: string, payload: InvitationPayload): Promise<void>;
  broadcastAcceptance(inviterAuthId: string, payload: InvitationAcceptancePayload): Promise<void>;
  subscribeToInvitations(
    inviteeAuthId: string,
    onReceive: (payload: InvitationPayload) => void
  ): Promise<Unsubscribe>;
  subscribeToAcceptances(
    inviterAuthId: string,
    onReceive: (payload: InvitationAcceptancePayload) => void
  ): Promise<Unsubscribe>;
};
