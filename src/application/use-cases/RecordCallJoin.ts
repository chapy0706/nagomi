import { CallParticipationLog } from "@/src/domain/entities/CallParticipationLog";
import type { CallParticipationRepository } from "@/src/domain/ports/CallParticipationRepository";
import type { Clock } from "@/src/domain/ports/Clock";
import type { CallTopicKind } from "@/src/domain/value-objects/CallTopic";

export type RecordCallJoinInput = {
  employeeAuthId: string;
  roomId: string;
  topic: CallTopicKind;
};

export class RecordCallJoin {
  constructor(
    private readonly repo: CallParticipationRepository,
    private readonly clock: Clock
  ) {}

  async execute(input: RecordCallJoinInput): Promise<void> {
    const log = CallParticipationLog.open({
      id: crypto.randomUUID(),
      employeeAuthId: input.employeeAuthId,
      roomId: input.roomId,
      topic: input.topic,
      joinedAt: this.clock.now(),
    });
    await this.repo.save(log);
  }
}
