import type { CallTopicKind } from "@/src/domain/value-objects/CallTopic";

export class CallParticipationLog {
  private constructor(
    readonly id: string,
    readonly employeeAuthId: string,
    readonly roomId: string,
    readonly topic: CallTopicKind,
    readonly joinedAt: Date,
    readonly leftAt: Date | undefined
  ) {}

  static open(params: {
    id: string;
    employeeAuthId: string;
    roomId: string;
    topic: CallTopicKind;
    joinedAt: Date;
  }): CallParticipationLog {
    return new CallParticipationLog(
      params.id,
      params.employeeAuthId,
      params.roomId,
      params.topic,
      params.joinedAt,
      undefined
    );
  }

  static reconstruct(params: {
    id: string;
    employeeAuthId: string;
    roomId: string;
    topic: CallTopicKind;
    joinedAt: Date;
    leftAt: Date | undefined;
  }): CallParticipationLog {
    return new CallParticipationLog(
      params.id,
      params.employeeAuthId,
      params.roomId,
      params.topic,
      params.joinedAt,
      params.leftAt
    );
  }

  isOpen(): boolean {
    return this.leftAt === undefined;
  }

  durationMs(now: Date): number {
    const end = this.leftAt ?? now;
    return Math.max(0, end.getTime() - this.joinedAt.getTime());
  }
}
