/// リアルタイムゲートウェイファクトリ（ステップ8: 切り替え機構）
///
/// NEXT_PUBLIC_REALTIME_PROVIDER=websocket のとき nagomi-ws 実装を返す。
/// それ以外（デフォルト: supabase）のとき既存 Supabase 実装を返す。
///
/// 切り替えはここだけ。Domain / Application 層は触らない。
/// 既存の Supabase 実装はそのまま残り、ロールバックも環境変数 1 つで済む。

import type { SupabaseClient } from "@supabase/supabase-js";
import type { InvitationBroadcastGateway } from "@/src/domain/ports/InvitationBroadcastGateway";
import type { PresenceGateway } from "@/src/domain/ports/PresenceGateway";
import type { RoomActivityGateway } from "@/src/domain/ports/RoomActivityGateway";
import { SupabaseInvitationBroadcastGateway } from "@/src/infrastructure/supabase/SupabaseInvitationBroadcastGateway";
import { SupabasePresenceGateway } from "@/src/infrastructure/supabase/SupabasePresenceGateway";
import { SupabaseRoomActivityGateway } from "@/src/infrastructure/supabase/SupabaseRoomActivityGateway";
import { getWebSocketClient } from "@/src/infrastructure/websocket/WebSocketClient";
import { WebSocketInvitationBroadcastGateway } from "@/src/infrastructure/websocket/WebSocketInvitationBroadcastGateway";
import { WebSocketPresenceGateway } from "@/src/infrastructure/websocket/WebSocketPresenceGateway";
import { WebSocketRoomActivityGateway } from "@/src/infrastructure/websocket/WebSocketRoomActivityGateway";

function isWebSocketProvider(): boolean {
  return process.env.NEXT_PUBLIC_REALTIME_PROVIDER === "websocket";
}

export function createPresenceGateway(supabase: SupabaseClient): PresenceGateway {
  if (isWebSocketProvider()) {
    return new WebSocketPresenceGateway(getWebSocketClient());
  }
  return new SupabasePresenceGateway(supabase);
}

export function createInvitationGateway(supabase: SupabaseClient): InvitationBroadcastGateway {
  if (isWebSocketProvider()) {
    return new WebSocketInvitationBroadcastGateway(getWebSocketClient());
  }
  return new SupabaseInvitationBroadcastGateway(supabase);
}

export function createRoomActivityGateway(supabase: SupabaseClient): RoomActivityGateway {
  if (isWebSocketProvider()) {
    return new WebSocketRoomActivityGateway(getWebSocketClient());
  }
  return new SupabaseRoomActivityGateway(supabase);
}
