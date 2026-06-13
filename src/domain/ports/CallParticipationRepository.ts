import type { CallParticipationLog } from "@/src/domain/entities/CallParticipationLog";

export type CallParticipationRepository = {
  save(log: CallParticipationLog): Promise<void>;
  findOpenSession(employeeAuthId: string): Promise<CallParticipationLog | undefined>;
  closeSession(logId: string, leftAt: Date): Promise<void>;
};
