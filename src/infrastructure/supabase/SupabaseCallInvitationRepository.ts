import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CallInvitation,
  type CallInvitationStatus,
  type InvitationTopic,
} from "@/src/domain/entities/CallInvitation";
import type { CallInvitationRepository } from "@/src/domain/ports/CallInvitationRepository";

function parseRow(row: unknown): CallInvitation | undefined {
  if (typeof row !== "object" || row === null) return undefined;
  const r = row as Record<string, unknown>;
  if (typeof r.id !== "string") return undefined;
  if (typeof r.inviter_auth_id !== "string") return undefined;
  if (typeof r.inviter_display_name !== "string") return undefined;
  if (typeof r.invitee_auth_id !== "string") return undefined;
  if (typeof r.status !== "string") return undefined;
  if (typeof r.expires_at !== "string") return undefined;
  if (typeof r.created_at !== "string") return undefined;

  const validStatuses: CallInvitationStatus[] = ["pending", "accepted", "declined", "expired"];
  if (!validStatuses.includes(r.status as CallInvitationStatus)) return undefined;

  const validTopics: InvitationTopic[] = ["counseling", "casual", "meeting"];
  const topic =
    typeof r.topic === "string" && validTopics.includes(r.topic as InvitationTopic)
      ? (r.topic as InvitationTopic)
      : undefined;

  return CallInvitation.issue({
    id: r.id,
    inviterAuthId: r.inviter_auth_id,
    inviterDisplayName: r.inviter_display_name,
    inviterAvatarUrl: typeof r.inviter_avatar_url === "string" ? r.inviter_avatar_url : undefined,
    inviteeAuthId: r.invitee_auth_id,
    topic,
    now: new Date(r.created_at),
  });
}

export class SupabaseCallInvitationRepository implements CallInvitationRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async save(invitation: CallInvitation): Promise<void> {
    const { error } = await this.supabase.from("call_invitations").insert({
      id: invitation.id,
      inviter_auth_id: invitation.inviterAuthId,
      inviter_display_name: invitation.inviterDisplayName,
      inviter_avatar_url: invitation.inviterAvatarUrl ?? null,
      invitee_auth_id: invitation.inviteeAuthId,
      topic: invitation.topic ?? null,
      status: invitation.status,
      expires_at: invitation.expiresAt.toISOString(),
      created_at: invitation.createdAt.toISOString(),
    });
    if (error) throw new Error(`招待の保存に失敗しました: ${error.message}`);
  }

  async findRecentByParticipants(
    inviterAuthId: string,
    inviteeAuthId: string,
    since: Date
  ): Promise<CallInvitation | undefined> {
    const { data, error } = await this.supabase
      .from("call_invitations")
      .select("*")
      .eq("inviter_auth_id", inviterAuthId)
      .eq("invitee_auth_id", inviteeAuthId)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(`招待履歴の取得に失敗しました: ${error.message}`);
    if (!data) return undefined;
    return parseRow(data);
  }

  async markAccepted(invitationId: string): Promise<void> {
    const { error } = await this.supabase
      .from("call_invitations")
      .update({ status: "accepted" })
      .eq("id", invitationId);
    if (error) throw new Error(`招待の承諾記録に失敗しました: ${error.message}`);
  }

  async markDeclined(invitationId: string): Promise<void> {
    const { error } = await this.supabase
      .from("call_invitations")
      .update({ status: "declined" })
      .eq("id", invitationId);
    if (error) throw new Error(`招待の辞退記録に失敗しました: ${error.message}`);
  }
}
