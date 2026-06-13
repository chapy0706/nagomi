/// nagomi-ws ↔ Next.js クライアント間のメッセージ型定義
///
/// Gleam 側の message.gleam と対称になるよう維持すること。
/// ここを変えたら nagomi-ws/src/nagomi_ws/message.gleam も合わせて変える。

import type {
  InvitationAcceptancePayload,
  InvitationPayload,
} from "@/src/domain/ports/InvitationBroadcastGateway";
import type { PresencePayload, PresenceStatus } from "@/src/domain/ports/PresenceGateway";
import type { RoomActivitySnapshot } from "@/src/domain/ports/RoomActivityGateway";

// ---------------------------------------------------------------------------
// クライアント → サーバー
// ---------------------------------------------------------------------------

export type ClientMessage =
  | { type: "presence:join"; payload: PresencePayload }
  | { type: "presence:update_position"; x: number; y: number }
  | { type: "presence:update_status"; status: PresenceStatus }
  | { type: "presence:update_room"; room_id: string | null }
  | { type: "presence:leave" }
  | { type: "invitation:send"; invitee_auth_id: string; payload: InvitationPayload }
  | { type: "invitation:accept"; inviter_auth_id: string; payload: InvitationAcceptancePayload }
  | { type: "invitation:subscribe"; invitee_auth_id: string }
  | { type: "acceptance:subscribe"; inviter_auth_id: string }
  | { type: "room:subscribe"; room_id: string }
  | { type: "room:unsubscribe"; room_id: string }
  | { type: "room:activity"; room_id: string; snapshot: RoomActivitySnapshot };

// ---------------------------------------------------------------------------
// サーバー → クライアント
// ---------------------------------------------------------------------------

export type ServerMessage =
  | { type: "presence:sync"; presences: PresencePayload[] }
  | { type: "presence:joined"; presence: PresencePayload }
  | { type: "presence:left"; employeeId: string }
  | { type: "invitation:received"; payload: InvitationPayload }
  | { type: "acceptance:received"; payload: InvitationAcceptancePayload }
  | { type: "room:activity"; roomId: string; snapshot: RoomActivitySnapshot }
  | { type: "error"; reason: string };

export type ServerMessageType = ServerMessage["type"];
