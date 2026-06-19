import type { SupabaseClient } from "@supabase/supabase-js";
import type { BlockedEmployeeSummary, BlockRepository } from "@/src/domain/ports/BlockRepository";

type BlockRow = { blocked_auth_id: string; created_at: string };
type EmployeeRow = { auth_user_id: string; display_name: string; avatar_url: string | null };

export class SupabaseBlockRepository implements BlockRepository {
  constructor(private readonly client: SupabaseClient) {}

  async isBlocked(blockerAuthId: string, blockedAuthId: string): Promise<boolean> {
    const { data, error } = await this.client
      .from("block_relations")
      .select("id")
      .eq("blocker_auth_id", blockerAuthId)
      .eq("blocked_auth_id", blockedAuthId)
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`ブロック確認エラー: ${error.message}`);
    return data !== null;
  }

  async block(blockerAuthId: string, blockedAuthId: string): Promise<void> {
    const { error } = await this.client.from("block_relations").insert({
      blocker_auth_id: blockerAuthId,
      blocked_auth_id: blockedAuthId,
    });
    // 重複ブロックは無視する（UNIQUE 制約違反 = 23505）
    if (error && error.code !== "23505") {
      throw new Error(`ブロック登録エラー: ${error.message}`);
    }
  }

  async unblock(blockerAuthId: string, blockedAuthId: string): Promise<void> {
    const { error } = await this.client
      .from("block_relations")
      .delete()
      .eq("blocker_auth_id", blockerAuthId)
      .eq("blocked_auth_id", blockedAuthId);
    if (error) throw new Error(`ブロック解除エラー: ${error.message}`);
  }

  async findBlockedAuthIds(blockerAuthId: string): Promise<string[]> {
    const { data, error } = await this.client
      .from("block_relations")
      .select("blocked_auth_id")
      .eq("blocker_auth_id", blockerAuthId);
    if (error) throw new Error(`ブロックリスト取得エラー: ${error.message}`);
    return (data ?? []).map((r: Pick<BlockRow, "blocked_auth_id">) => r.blocked_auth_id);
  }

  /**
   * ブロックリスト一覧（表示名・アバター付き）。
   * employees テーブルへの参照が必要なため、service role クライアントで呼び出すこと。
   */
  async findBlockedSummaries(blockerAuthId: string): Promise<BlockedEmployeeSummary[]> {
    const { data: blockData, error: blockError } = await this.client
      .from("block_relations")
      .select("blocked_auth_id, created_at")
      .eq("blocker_auth_id", blockerAuthId)
      .order("created_at", { ascending: false });
    if (blockError) throw new Error(`ブロックリスト取得エラー: ${blockError.message}`);
    if (!blockData || blockData.length === 0) return [];

    const blockedIds = (blockData as BlockRow[]).map((r) => r.blocked_auth_id);
    const { data: empData, error: empError } = await this.client
      .from("employees")
      .select("auth_user_id, display_name, avatar_url")
      .in("auth_user_id", blockedIds);
    if (empError) throw new Error(`従業員情報取得エラー: ${empError.message}`);

    const empMap = new Map(((empData as EmployeeRow[]) ?? []).map((e) => [e.auth_user_id, e]));

    return (blockData as BlockRow[]).map((r) => {
      const emp = empMap.get(r.blocked_auth_id);
      return {
        blockedAuthId: r.blocked_auth_id,
        displayName: emp?.display_name ?? "Unknown",
        avatarUrl: emp?.avatar_url ?? undefined,
        blockedAt: new Date(r.created_at),
      };
    });
  }
}
