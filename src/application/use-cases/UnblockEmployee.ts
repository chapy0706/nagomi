import type { BlockRepository } from "@/src/domain/ports/BlockRepository";

export type UnblockEmployeeInput = {
  blockerAuthId: string;
  blockedAuthId: string;
};

export class UnblockEmployee {
  constructor(private readonly blockRepository: BlockRepository) {}

  async execute(input: UnblockEmployeeInput): Promise<void> {
    await this.blockRepository.unblock(input.blockerAuthId, input.blockedAuthId);
  }
}
