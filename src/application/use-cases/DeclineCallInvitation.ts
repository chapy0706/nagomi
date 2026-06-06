import type { CallInvitationRepository } from "@/src/domain/ports/CallInvitationRepository";

export type DeclineCallInvitationInput = {
  invitationId: string;
};

/**
 * 招待の辞退記録のみを行う。招待者への通知は行わない（ADR-006: 断ることへの心理的ハードルを下げる）。
 */
export class DeclineCallInvitation {
  constructor(private readonly repository: CallInvitationRepository) {}

  async execute(input: DeclineCallInvitationInput): Promise<void> {
    await this.repository.markDeclined(input.invitationId);
  }
}
