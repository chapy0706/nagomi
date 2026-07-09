/// サーバー起動時に生成され、全 WebSocket 接続で共有されるグローバル状態
///
/// OTP アクターの Subject（プロセスへのメールボックス参照）を束ねる構造体。
/// ws_handler はこれを closure でキャプチャし、各メッセージ処理で使う。

import gleam/erlang/process.{type Subject}
import nagomi_ws/connection_registry
import nagomi_ws/invitation_router
import nagomi_ws/key_cache
import nagomi_ws/presence_registry
import nagomi_ws/room_activity_router

pub type ServerState {
  ServerState(
    connection_registry: Subject(connection_registry.Message),
    presence_registry: Subject(presence_registry.Message),
    invitation_router: Subject(invitation_router.Message),
    room_activity_router: Subject(room_activity_router.Message),
    // JWKS 公開鍵キャッシュ（RS256 検証で kid → 公開鍵 を引く）
    key_cache: Subject(key_cache.Message),
  )
}
