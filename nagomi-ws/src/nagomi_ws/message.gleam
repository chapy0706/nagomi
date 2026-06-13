/// クライアント ↔ サーバー間の WebSocket メッセージ型と JSON 変換
///
/// なぜこの層が必要か:
///   Gleam は静的型付けなので、Wire フォーマット (JSON) と
///   アプリ内の型を明確に分離する。境界でのみ JSON ↔ 型変換を行う。

import gleam/dynamic
import gleam/json
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/result
import gleam/string

// ---------------------------------------------------------------------------
// 共通の値型
// ---------------------------------------------------------------------------

pub type PresenceStatus {
  Available
  Busy
  Away
  InCall
}

fn parse_status(s: String) -> PresenceStatus {
  case s {
    "busy" -> Busy
    "away" -> Away
    "in_call" -> InCall
    _ -> Available
  }
}

fn encode_status(s: PresenceStatus) -> String {
  case s {
    Available -> "available"
    Busy -> "busy"
    Away -> "away"
    InCall -> "in_call"
  }
}

pub type PresencePayload {
  PresencePayload(
    employee_id: String,
    auth_user_id: Option(String),
    display_name: String,
    avatar_url: Option(String),
    x: Float,
    y: Float,
    status: PresenceStatus,
    current_room_id: Option(String),
  )
}

pub type InvitationPayload {
  InvitationPayload(
    id: String,
    inviter_auth_id: String,
    inviter_display_name: String,
    inviter_avatar_url: Option(String),
    topic: Option(String),
    expires_at: String,
  )
}

pub type AcceptancePayload {
  AcceptancePayload(invitation_id: String, room_id: String)
}

pub type ActivitySnapshot {
  ActivitySnapshot(recent_speaker_event_count: Int, emitted_at: String)
}

// ---------------------------------------------------------------------------
// クライアント → サーバー メッセージ
// ---------------------------------------------------------------------------

pub type ClientMessage {
  PresenceJoin(payload: PresencePayload)
  PresenceUpdatePosition(x: Float, y: Float)
  PresenceUpdateStatus(status: PresenceStatus)
  PresenceUpdateRoom(room_id: Option(String))
  PresenceLeave
  InvitationSend(invitee_auth_id: String, payload: InvitationPayload)
  InvitationAccept(inviter_auth_id: String, payload: AcceptancePayload)
  InvitationSubscribe(invitee_auth_id: String)
  AcceptanceSubscribe(inviter_auth_id: String)
  RoomSubscribe(room_id: String)
  RoomUnsubscribe(room_id: String)
  RoomBroadcastActivity(room_id: String, snapshot: ActivitySnapshot)
  UnknownMessage
}

// ---------------------------------------------------------------------------
// JSON デコーダーヘルパー
// ---------------------------------------------------------------------------

fn optional_string_field(
  dyn: dynamic.Dynamic,
  key: String,
) -> Result(Option(String), dynamic.DecodeErrors) {
  dynamic.optional_field(key, dynamic.string)(dyn)
  |> result.map(fn(opt) { opt })
}

fn decode_presence_payload(
  dyn: dynamic.Dynamic,
) -> Result(PresencePayload, dynamic.DecodeErrors) {
  use employee_id <- result.try(dynamic.field("employeeId", dynamic.string)(
    dyn,
  ))
  use auth_user_id <- result.try(optional_string_field(dyn, "authUserId"))
  use display_name <- result.try(dynamic.field(
    "displayName",
    dynamic.string,
  )(dyn))
  use avatar_url <- result.try(optional_string_field(dyn, "avatarUrl"))
  use x <- result.try(dynamic.field("x", dynamic.float)(dyn))
  use y <- result.try(dynamic.field("y", dynamic.float)(dyn))
  use status_str <- result.try(dynamic.field("status", dynamic.string)(dyn))
  use current_room_id <- result.try(optional_string_field(
    dyn,
    "currentRoomId",
  ))

  Ok(PresencePayload(
    employee_id: employee_id,
    auth_user_id: auth_user_id,
    display_name: display_name,
    avatar_url: avatar_url,
    x: x,
    y: y,
    status: parse_status(status_str),
    current_room_id: current_room_id,
  ))
}

fn decode_invitation_payload(
  dyn: dynamic.Dynamic,
) -> Result(InvitationPayload, dynamic.DecodeErrors) {
  use id <- result.try(dynamic.field("id", dynamic.string)(dyn))
  use inviter_auth_id <- result.try(dynamic.field(
    "inviterAuthId",
    dynamic.string,
  )(dyn))
  use inviter_display_name <- result.try(dynamic.field(
    "inviterDisplayName",
    dynamic.string,
  )(dyn))
  use inviter_avatar_url <- result.try(optional_string_field(
    dyn,
    "inviterAvatarUrl",
  ))
  use topic <- result.try(optional_string_field(dyn, "topic"))
  use expires_at <- result.try(dynamic.field("expiresAt", dynamic.string)(dyn))

  Ok(InvitationPayload(
    id: id,
    inviter_auth_id: inviter_auth_id,
    inviter_display_name: inviter_display_name,
    inviter_avatar_url: inviter_avatar_url,
    topic: topic,
    expires_at: expires_at,
  ))
}

fn decode_acceptance_payload(
  dyn: dynamic.Dynamic,
) -> Result(AcceptancePayload, dynamic.DecodeErrors) {
  use invitation_id <- result.try(dynamic.field(
    "invitationId",
    dynamic.string,
  )(dyn))
  use room_id <- result.try(dynamic.field("roomId", dynamic.string)(dyn))
  Ok(AcceptancePayload(invitation_id: invitation_id, room_id: room_id))
}

fn decode_activity_snapshot(
  dyn: dynamic.Dynamic,
) -> Result(ActivitySnapshot, dynamic.DecodeErrors) {
  use count <- result.try(dynamic.field(
    "recentSpeakerEventCount",
    dynamic.int,
  )(dyn))
  use emitted_at <- result.try(dynamic.field("emittedAt", dynamic.string)(dyn))
  Ok(ActivitySnapshot(
    recent_speaker_event_count: count,
    emitted_at: emitted_at,
  ))
}

/// JSON テキストをクライアントメッセージにパースする。
/// パース失敗時は UnknownMessage を返す（接続は切らない）。
pub fn parse_client_message(text: String) -> ClientMessage {
  let type_result =
    json.decode(text, dynamic.field("type", dynamic.string))
    |> result.unwrap("")

  case type_result {
    "presence:join" -> {
      case
        json.decode(
          text,
          dynamic.field("payload", decode_presence_payload),
        )
      {
        Ok(payload) -> PresenceJoin(payload: payload)
        Error(_) -> UnknownMessage
      }
    }

    "presence:update_position" -> {
      case
        json.decode(
          text,
          dynamic.decode2(
            fn(x, y) { #(x, y) },
            dynamic.field("x", dynamic.float),
            dynamic.field("y", dynamic.float),
          ),
        )
      {
        Ok(#(x, y)) -> PresenceUpdatePosition(x: x, y: y)
        Error(_) -> UnknownMessage
      }
    }

    "presence:update_status" -> {
      case json.decode(text, dynamic.field("status", dynamic.string)) {
        Ok(s) -> PresenceUpdateStatus(status: parse_status(s))
        Error(_) -> UnknownMessage
      }
    }

    "presence:update_room" -> {
      case
        json.decode(
          text,
          dynamic.optional_field("room_id", dynamic.string),
        )
      {
        Ok(room_id) -> PresenceUpdateRoom(room_id: room_id)
        Error(_) -> UnknownMessage
      }
    }

    "presence:leave" -> PresenceLeave

    "invitation:send" -> {
      case
        json.decode(
          text,
          dynamic.decode2(
            fn(id, p) { #(id, p) },
            dynamic.field("invitee_auth_id", dynamic.string),
            dynamic.field("payload", decode_invitation_payload),
          ),
        )
      {
        Ok(#(id, p)) -> InvitationSend(invitee_auth_id: id, payload: p)
        Error(_) -> UnknownMessage
      }
    }

    "invitation:accept" -> {
      case
        json.decode(
          text,
          dynamic.decode2(
            fn(id, p) { #(id, p) },
            dynamic.field("inviter_auth_id", dynamic.string),
            dynamic.field("payload", decode_acceptance_payload),
          ),
        )
      {
        Ok(#(id, p)) -> InvitationAccept(inviter_auth_id: id, payload: p)
        Error(_) -> UnknownMessage
      }
    }

    "invitation:subscribe" -> {
      case json.decode(text, dynamic.field("invitee_auth_id", dynamic.string)) {
        Ok(id) -> InvitationSubscribe(invitee_auth_id: id)
        Error(_) -> UnknownMessage
      }
    }

    "acceptance:subscribe" -> {
      case json.decode(text, dynamic.field("inviter_auth_id", dynamic.string)) {
        Ok(id) -> AcceptanceSubscribe(inviter_auth_id: id)
        Error(_) -> UnknownMessage
      }
    }

    "room:subscribe" -> {
      case json.decode(text, dynamic.field("room_id", dynamic.string)) {
        Ok(id) -> RoomSubscribe(room_id: id)
        Error(_) -> UnknownMessage
      }
    }

    "room:unsubscribe" -> {
      case json.decode(text, dynamic.field("room_id", dynamic.string)) {
        Ok(id) -> RoomUnsubscribe(room_id: id)
        Error(_) -> UnknownMessage
      }
    }

    "room:activity" -> {
      case
        json.decode(
          text,
          dynamic.decode2(
            fn(id, s) { #(id, s) },
            dynamic.field("room_id", dynamic.string),
            dynamic.field("snapshot", decode_activity_snapshot),
          ),
        )
      {
        Ok(#(id, s)) -> RoomBroadcastActivity(room_id: id, snapshot: s)
        Error(_) -> UnknownMessage
      }
    }

    _ -> UnknownMessage
  }
}

// ---------------------------------------------------------------------------
// サーバー → クライアント メッセージ (JSON エンコード)
// ---------------------------------------------------------------------------

fn encode_presence(p: PresencePayload) -> json.Json {
  json.object([
    #("employeeId", json.string(p.employee_id)),
    #(
      "authUserId",
      case p.auth_user_id {
        Some(id) -> json.string(id)
        None -> json.null()
      },
    ),
    #("displayName", json.string(p.display_name)),
    #(
      "avatarUrl",
      case p.avatar_url {
        Some(url) -> json.string(url)
        None -> json.null()
      },
    ),
    #("x", json.float(p.x)),
    #("y", json.float(p.y)),
    #("status", json.string(encode_status(p.status))),
    #(
      "currentRoomId",
      case p.current_room_id {
        Some(id) -> json.string(id)
        None -> json.null()
      },
    ),
  ])
}

fn encode_invitation(p: InvitationPayload) -> json.Json {
  json.object([
    #("id", json.string(p.id)),
    #("inviterAuthId", json.string(p.inviter_auth_id)),
    #("inviterDisplayName", json.string(p.inviter_display_name)),
    #(
      "inviterAvatarUrl",
      case p.inviter_avatar_url {
        Some(url) -> json.string(url)
        None -> json.null()
      },
    ),
    #(
      "topic",
      case p.topic {
        Some(t) -> json.string(t)
        None -> json.null()
      },
    ),
    #("expiresAt", json.string(p.expires_at)),
  ])
}

fn encode_acceptance(p: AcceptancePayload) -> json.Json {
  json.object([
    #("invitationId", json.string(p.invitation_id)),
    #("roomId", json.string(p.room_id)),
  ])
}

fn encode_snapshot(s: ActivitySnapshot) -> json.Json {
  json.object([
    #("recentSpeakerEventCount", json.int(s.recent_speaker_event_count)),
    #("emittedAt", json.string(s.emitted_at)),
  ])
}

pub fn encode_presence_sync(presences: List(PresencePayload)) -> String {
  json.object([
    #("type", json.string("presence:sync")),
    #("presences", json.array(presences, encode_presence)),
  ])
  |> json.to_string
}

pub fn encode_presence_joined(presence: PresencePayload) -> String {
  json.object([
    #("type", json.string("presence:joined")),
    #("presence", encode_presence(presence)),
  ])
  |> json.to_string
}

pub fn encode_presence_left(employee_id: String) -> String {
  json.object([
    #("type", json.string("presence:left")),
    #("employeeId", json.string(employee_id)),
  ])
  |> json.to_string
}

pub fn encode_invitation_received(payload: InvitationPayload) -> String {
  json.object([
    #("type", json.string("invitation:received")),
    #("payload", encode_invitation(payload)),
  ])
  |> json.to_string
}

pub fn encode_acceptance_received(payload: AcceptancePayload) -> String {
  json.object([
    #("type", json.string("acceptance:received")),
    #("payload", encode_acceptance(payload)),
  ])
  |> json.to_string
}

pub fn encode_room_activity(
  room_id: String,
  snapshot: ActivitySnapshot,
) -> String {
  json.object([
    #("type", json.string("room:activity")),
    #("roomId", json.string(room_id)),
    #("snapshot", encode_snapshot(snapshot)),
  ])
  |> json.to_string
}

pub fn encode_error(reason: String) -> String {
  json.object([
    #("type", json.string("error")),
    #("reason", json.string(reason)),
  ])
  |> json.to_string
}

// ---------------------------------------------------------------------------
// テスト補助
// ---------------------------------------------------------------------------

/// presence_payload を PresencePayload に更新したコピーを返す
pub fn update_position(p: PresencePayload, x: Float, y: Float) -> PresencePayload {
  PresencePayload(..p, x: x, y: y)
}

pub fn update_status(p: PresencePayload, status: PresenceStatus) -> PresencePayload {
  PresencePayload(..p, status: status)
}

pub fn update_room(
  p: PresencePayload,
  room_id: Option(String),
) -> PresencePayload {
  PresencePayload(..p, current_room_id: room_id)
}
