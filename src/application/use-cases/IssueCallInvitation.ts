import type { CallInvitation, InvitationTopic } from "@/src/domain/entities/CallInvitation";
import { CallInvitation as CallInvitationEntity } from "@/src/domain/entities/CallInvitation";
import type { BlockRepository } from "@/src/domain/ports/BlockRepository";
import type { CallInvitationRepository } from "@/src/domain/ports/CallInvitationRepository";
import type { Clock } from "@/src/domain/ports/Clock";
import type { InvitationBroadcastGateway } from "@/src/domain/ports/InvitationBroadcastGateway";
import type { PresenceStatus } from "@/src/domain/ports/PresenceGateway";

const COOLDOWN_MS = 60_000;

export type IssueCallInvitationInput = {
  inviterAuthId: string;
  inviterDisplayName: string;
  inviterAvatarUrl: string | undefined;
  inviteeAuthId: string;
  inviteeStatus: PresenceStatus;
  topic: InvitationTopic | undefined;
};

export type IssueCallInvitationResult =
  | { success: true; invitation: CallInvitation }
  | {
      success: false;
      reason: "self_invite" | "invitee_unavailable" | "blocked" | "cooldown";
    };

export class IssueCallInvitation {
  constructor(
    private readonly repository: CallInvitationRepository,
    private readonly broadcastGateway: InvitationBroadcastGateway,
    private readonly blockRepository: BlockRepository,
    private readonly clock: Clock
  ) {}

  async execute(input: IssueCallInvitationInput): Promise<IssueCallInvitationResult> {
    if (input.inviterAuthId === input.inviteeAuthId) {
      return { success: false, reason: "self_invite" };
    }

    if (input.inviteeStatus === "busy" || input.inviteeStatus === "in_call") {
      return { success: false, reason: "invitee_unavailable" };
    }

    const blocked = await this.blockRepository.isBlocked(input.inviterAuthId, input.inviteeAuthId);
    if (blocked) {
      return { success: false, reason: "blocked" };
    }

    const now = this.clock.now();
    const cooldownSince = new Date(now.getTime() - COOLDOWN_MS);
    const recent = await this.repository.findRecentByParticipants(
      input.inviterAuthId,
      input.inviteeAuthId,
      cooldownSince
    );
    if (recent) {
      return { success: false, reason: "cooldown" };
    }

    const invitation = CallInvitationEntity.issue({
      id: crypto.randomUUID(),
      inviterAuthId: input.inviterAuthId,
      inviterDisplayName: input.inviterDisplayName,
      inviterAvatarUrl: input.inviterAvatarUrl,
      inviteeAuthId: input.inviteeAuthId,
      topic: input.topic,
      now,
    });

    await this.repository.save(invitation);

    await this.broadcastGateway.broadcastInvitation(input.inviteeAuthId, {
      id: invitation.id,
      inviterAuthId: invitation.inviterAuthId,
      inviterDisplayName: invitation.inviterDisplayName,
      inviterAvatarUrl: invitation.inviterAvatarUrl,
      topic: invitation.topic,
      expiresAt: invitation.expiresAt.toISOString(),
    });

    return { success: true, invitation };
  }
}
