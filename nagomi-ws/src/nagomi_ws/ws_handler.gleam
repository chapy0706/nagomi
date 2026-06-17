/// WebSocket 接続ハンドラ
///
/// 1 接続 = 1 OTP プロセス。mist が各接続ごとにこのハンドラを呼ぶ。
/// メッセージはクライアントから来る WebSocket テキストと、
/// 他プロセスから来るブロードキャスト（mist.Custom）の 2 種類がある。
///
/// ビジネス判断（誰に何を届けるか）はここで行い、
/// レジストリはデータの保持と転送だけを担う。

import gleam/erlang/process
import gleam/int
import gleam/io
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/otp/actor
import mist.{type Connection, type WebsocketMessage}
import nagomi_ws/connection_registry
import nagomi_ws/invitation_router
import nagomi_ws/jwt
import nagomi_ws/message.{
  type ClientMessage, type PresencePayload, AcceptanceSubscribe, InvitationAccept,
  InvitationSend, InvitationSubscribe, PresenceJoin, PresenceLeave,
  PresenceUpdatePosition, PresenceUpdateRoom, PresenceUpdateStatus,
  RoomBroadcastActivity, RoomSubscribe, RoomUnsubscribe, UnknownMessage,
}
import nagomi_ws/presence_registry
import nagomi_ws/room_activity_router
import nagomi_ws/server_state.{type ServerState}

// ---------------------------------------------------------------------------
// 接続ごとの状態
// ---------------------------------------------------------------------------

pub type ConnectionState {
  ConnectionState(
    conn_id: String,
    auth_user_id: String,
    server: ServerState,
    presence: Option(PresencePayload),
    invitation_sub: Option(String),
    acceptance_sub: Option(String),
  )
}

// 他プロセスから届くメッセージ型（ブロードキャスト文字列）
pub type OutgoingMessage =
  String

// ---------------------------------------------------------------------------
// 接続 ID 生成（Erlang ref → 文字列）
// ---------------------------------------------------------------------------

@external(erlang, "erlang", "unique_integer")
fn unique_integer() -> Int

fn gen_conn_id() -> String {
  "conn-" <> int.to_string(unique_integer())
}

// ---------------------------------------------------------------------------
// mist WebSocket コールバック
// ---------------------------------------------------------------------------

pub fn on_open(
  server: ServerState,
  conn: Connection,
  token_result: Result(String, String),
) -> #(ConnectionState, process.Selector(OutgoingMessage)) {
  let auth_user_id = case token_result {
    Ok(uid) -> uid
    Error(reason) -> {
      io.println("[ws_handler] auth failed: " <> reason)
      // 認証失敗でも接続は受け入れ、メッセージ処理時にエラーを返す
      ""
    }
  }

  let conn_id = gen_conn_id()

  // このプロセスへのメールボックス Subject を作り、接続レジストリに登録
  let subject = process.new_subject()
  connection_registry.register(server.connection_registry, conn_id, subject)

  let selector =
    process.new_selector()
    |> process.select(subject)

  let state =
    ConnectionState(
      conn_id: conn_id,
      auth_user_id: auth_user_id,
      server: server,
      presence: None,
      invitation_sub: None,
      acceptance_sub: None,
    )

  io.println("[ws_handler] opened: " <> conn_id)
  #(state, selector)
}

pub fn on_close(state: ConnectionState) -> Nil {
  io.println("[ws_handler] closed: " <> state.conn_id)

  connection_registry.unregister(state.server.connection_registry, state.conn_id)

  // Presence から退出し、フロア全体に通知
  case state.presence {
    Some(p) -> {
      presence_registry.untrack(state.server.presence_registry, state.conn_id)
      connection_registry.broadcast(
        state.server.connection_registry,
        message.encode_presence_left(p.employee_id),
      )
    }
    None -> Nil
  }

  // 招待サブスクリプション解除
  case state.invitation_sub {
    Some(id) ->
      invitation_router.unsubscribe(
        state.server.invitation_router,
        id,
        state.conn_id,
      )
    None -> Nil
  }

  case state.acceptance_sub {
    Some(id) ->
      invitation_router.unsubscribe(
        state.server.invitation_router,
        id,
        state.conn_id,
      )
    None -> Nil
  }

  // ルームサブスクリプション一括解除
  room_activity_router.unsubscribe_all(
    state.server.room_activity_router,
    state.conn_id,
  )
}

pub fn handler(
  state: ConnectionState,
  conn: Connection,
  msg: WebsocketMessage(OutgoingMessage),
) -> actor.Next(OutgoingMessage, ConnectionState) {
  case msg {
    mist.Text(text) -> handle_client_message(state, conn, text)
    mist.Binary(_) -> actor.continue(state)
    // 他プロセスからのブロードキャスト文字列をそのまま送信
    mist.Custom(text) -> {
      let _ = mist.send_text_frame(conn, text)
      actor.continue(state)
    }
  }
}

// ---------------------------------------------------------------------------
// クライアントメッセージ処理
// ---------------------------------------------------------------------------

fn handle_client_message(
  state: ConnectionState,
  conn: Connection,
  text: String,
) -> actor.Next(OutgoingMessage, ConnectionState) {
  // 未認証接続はすべて拒否
  case state.auth_user_id == "" {
    True -> {
      let _ =
        mist.send_text_frame(conn, message.encode_error("unauthorized"))
      actor.continue(state)
    }
    False -> dispatch(state, conn, message.parse_client_message(text))
  }
}

fn dispatch(
  state: ConnectionState,
  conn: Connection,
  client_msg: ClientMessage,
) -> actor.Next(OutgoingMessage, ConnectionState) {
  case client_msg {
    // ---- Presence --------------------------------------------------------
    PresenceJoin(payload: payload) -> handle_presence_join(state, conn, payload)

    PresenceUpdatePosition(x: x, y: y) ->
      handle_presence_update(state, conn, fn(p) { message.update_position(p, x, y) })

    PresenceUpdateStatus(status: status) ->
      handle_presence_update(state, conn, fn(p) {
        message.update_status(p, status)
      })

    PresenceUpdateRoom(room_id: room_id) ->
      handle_presence_update(state, conn, fn(p) {
        message.update_room(p, room_id)
      })

    PresenceLeave -> handle_presence_leave(state)

    // ---- Invitation -------------------------------------------------------
    InvitationSubscribe(invitee_auth_id: id) -> {
      invitation_router.subscribe(state.server.invitation_router, id, state.conn_id)
      actor.continue(ConnectionState(..state, invitation_sub: Some(id)))
    }

    AcceptanceSubscribe(inviter_auth_id: id) -> {
      invitation_router.subscribe(state.server.invitation_router, id, state.conn_id)
      actor.continue(ConnectionState(..state, acceptance_sub: Some(id)))
    }

    InvitationSend(invitee_auth_id: invitee_id, payload: payload) -> {
      case
        invitation_router.get_conn_id(state.server.invitation_router, invitee_id)
      {
        Ok(target_conn_id) ->
          connection_registry.send_to(
            state.server.connection_registry,
            target_conn_id,
            message.encode_invitation_received(payload),
          )
        Error(_) -> Nil
      }
      actor.continue(state)
    }

    InvitationAccept(inviter_auth_id: inviter_id, payload: payload) -> {
      case
        invitation_router.get_conn_id(state.server.invitation_router, inviter_id)
      {
        Ok(target_conn_id) ->
          connection_registry.send_to(
            state.server.connection_registry,
            target_conn_id,
            message.encode_acceptance_received(payload),
          )
        Error(_) -> Nil
      }
      actor.continue(state)
    }

    // ---- Room Activity ----------------------------------------------------
    RoomSubscribe(room_id: room_id) -> {
      room_activity_router.subscribe(
        state.server.room_activity_router,
        room_id,
        state.conn_id,
      )
      actor.continue(state)
    }

    RoomUnsubscribe(room_id: room_id) -> {
      room_activity_router.unsubscribe(
        state.server.room_activity_router,
        room_id,
        state.conn_id,
      )
      actor.continue(state)
    }

    RoomBroadcastActivity(room_id: room_id, snapshot: snapshot) -> {
      let encoded = message.encode_room_activity(room_id, snapshot)
      let subscribers =
        room_activity_router.get_subscribers(
          state.server.room_activity_router,
          room_id,
        )
      list.each(subscribers, fn(conn_id) {
        connection_registry.send_to(
          state.server.connection_registry,
          conn_id,
          encoded,
        )
      })
      actor.continue(state)
    }

    UnknownMessage -> actor.continue(state)
  }
}

// ---------------------------------------------------------------------------
// Presence 状態変更ヘルパー
// ---------------------------------------------------------------------------

fn handle_presence_join(
  state: ConnectionState,
  conn: Connection,
  payload: PresencePayload,
) -> actor.Next(OutgoingMessage, ConnectionState) {
  presence_registry.track(state.server.presence_registry, state.conn_id, payload)

  // 新規参加者には全員の現在状態を送信
  let all_presences = presence_registry.get_all(state.server.presence_registry)
  let _ =
    mist.send_text_frame(conn, message.encode_presence_sync(all_presences))

  // 他の全員に新規参加者の情報をブロードキャスト
  connection_registry.broadcast_except(
    state.server.connection_registry,
    state.conn_id,
    message.encode_presence_joined(payload),
  )

  actor.continue(ConnectionState(..state, presence: Some(payload)))
}

fn handle_presence_update(
  state: ConnectionState,
  _conn: Connection,
  updater: fn(PresencePayload) -> PresencePayload,
) -> actor.Next(OutgoingMessage, ConnectionState) {
  case state.presence {
    None -> actor.continue(state)
    Some(current) -> {
      let updated = updater(current)
      presence_registry.update(
        state.server.presence_registry,
        state.conn_id,
        updated,
      )
      // 全員に更新を通知（onJoin で upsert させる）
      connection_registry.broadcast(
        state.server.connection_registry,
        message.encode_presence_joined(updated),
      )
      actor.continue(ConnectionState(..state, presence: Some(updated)))
    }
  }
}

fn handle_presence_leave(
  state: ConnectionState,
) -> actor.Next(OutgoingMessage, ConnectionState) {
  case state.presence {
    None -> actor.continue(state)
    Some(p) -> {
      presence_registry.untrack(state.server.presence_registry, state.conn_id)
      connection_registry.broadcast(
        state.server.connection_registry,
        message.encode_presence_left(p.employee_id),
      )
      actor.continue(ConnectionState(..state, presence: None))
    }
  }
}

