import type { SupabaseClient } from "@supabase/supabase-js";
import { CallParticipationLog } from "@/src/domain/entities/CallParticipationLog";
import type { CallParticipationRepository } from "@/src/domain/ports/CallParticipationRepository";
import type { CallTopicKind } from "@/src/domain/value-objects/CallTopic";

type CallParticipationRow = {
  id: string;
  employee_auth_id: string;
  room_id: string;
  topic: string;
  joined_at: string;
  left_at: string | null;
};

function toEntity(row: CallParticipationRow): CallParticipationLog {
  return CallParticipationLog.reconstruct({
    id: row.id,
    employeeAuthId: row.employee_auth_id,
    roomId: row.room_id,
    topic: row.topic as CallTopicKind,
    joinedAt: new Date(row.joined_at),
    leftAt: row.left_at ? new Date(row.left_at) : undefined,
  });
}

export class SupabaseCallParticipationRepository implements CallParticipationRepository {
  constructor(private readonly client: SupabaseClient) {}

  async save(log: CallParticipationLog): Promise<void> {
    const { error } = await this.client.from("call_participation_logs").insert({
      id: log.id,
      employee_auth_id: log.employeeAuthId,
      room_id: log.roomId,
      topic: log.topic,
      joined_at: log.joinedAt.toISOString(),
      left_at: log.leftAt?.toISOString() ?? null,
    });
    if (error) throw new Error(`通話参加ログの保存に失敗しました: ${error.message}`);
  }

  async findOpenSession(employeeAuthId: string): Promise<CallParticipationLog | undefined> {
    const { data, error } = await this.client
      .from("call_participation_logs")
      .select("*")
      .eq("employee_auth_id", employeeAuthId)
      .is("left_at", null)
      .order("joined_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`通話参加ログの取得に失敗しました: ${error.message}`);
    return data ? toEntity(data as CallParticipationRow) : undefined;
  }

  async closeSession(logId: string, leftAt: Date): Promise<void> {
    const { error } = await this.client
      .from("call_participation_logs")
      .update({ left_at: leftAt.toISOString() })
      .eq("id", logId);
    if (error) throw new Error(`通話参加ログの更新に失敗しました: ${error.message}`);
  }
}
