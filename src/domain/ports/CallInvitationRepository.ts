import type { CallInvitation } from "@/src/domain/entities/CallInvitation";

export type CallInvitationRepository = {
  save(invitation: CallInvitation): Promise<void>;
  findRecentByParticipants(
    inviterAuthId: string,
    inviteeAuthId: string,
    since: Date
  ): Promise<CallInvitation | undefined>;
  markAccepted(invitationId: string): Promise<void>;
  markDeclined(invitationId: string): Promise<void>;
};
