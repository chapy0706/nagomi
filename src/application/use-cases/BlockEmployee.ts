import type { BlockRepository } from "@/src/domain/ports/BlockRepository";

export type BlockEmployeeInput = {
  blockerAuthId: string;
  blockedAuthId: string;
};

export type BlockEmployeeResult = { success: true } | { success: false; reason: "self_block" };

export class BlockEmployee {
  constructor(private readonly blockRepository: BlockRepository) {}

  async execute(input: BlockEmployeeInput): Promise<BlockEmployeeResult> {
    if (input.blockerAuthId === input.blockedAuthId) {
      return { success: false, reason: "self_block" };
    }
    await this.blockRepository.block(input.blockerAuthId, input.blockedAuthId);
    return { success: true };
  }
}
