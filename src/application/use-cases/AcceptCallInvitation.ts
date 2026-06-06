import type { CallInvitationRepository } from "@/src/domain/ports/CallInvitationRepository";
import type { Clock } from "@/src/domain/ports/Clock";
import type { InvitationBroadcastGateway } from "@/src/domain/ports/InvitationBroadcastGateway";

export type AcceptCallInvitationInput = {
  invitationId: string;
  inviterAuthId: string;
  expiresAt: Date;
};

export type AcceptCallInvitationResult =
  | { success: true; roomId: string }
  | { success: false; reason: "expired" };

export class AcceptCallInvitation {
  constructor(
    private readonly repository: CallInvitationRepository,
    private readonly broadcastGateway: InvitationBroadcastGateway,
    private readonly clock: Clock
  ) {}

  async execute(input: AcceptCallInvitationInput): Promise<AcceptCallInvitationResult> {
    const now = this.clock.now();
    if (now >= input.expiresAt) {
      return { success: false, reason: "expired" };
    }

    const roomId = input.invitationId;
    await this.repository.markAccepted(input.invitationId);
    await this.broadcastGateway.broadcastAcceptance(input.inviterAuthId, {
      invitationId: input.invitationId,
      roomId,
    });
    return { success: true, roomId };
  }
}
