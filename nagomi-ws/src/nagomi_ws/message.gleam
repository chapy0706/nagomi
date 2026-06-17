/// クライアント ↔ サーバー間の WebSocket メッセージ型と JSON 変換
///
/// なぜこの層が必要か:
///   Gleam は静的型付けなので、Wire フォーマット (JSON) と
///   アプリ内の型を明確に分離する。境界でのみ JSON ↔ 型変換を行う。

import gleam/dynamic/decode
import gleam/json
import gleam/option.{type Option, None, Some}
import gleam/result

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
// JSON デコーダー（gleam/dynamic/decode API）
// ---------------------------------------------------------------------------

fn presence_payload_decoder() -> decode.Decoder(PresencePayload) {
  use employee_id <- decode.field("employeeId", decode.string)
  use auth_user_id <- decode.optional_field(
    "authUserId",
    None,
    decode.optional(decode.string),
  )
  use display_name <- decode.field("displayName", decode.string)
  use avatar_url <- decode.optional_field(
    "avatarUrl",
    None,
    decode.optional(decode.string),
  )
  use x <- decode.field("x", decode.float)
  use y <- decode.field("y", decode.float)
  use status_str <- decode.field("status", decode.string)
  use current_room_id <- decode.optional_field(
    "currentRoomId",
    None,
    decode.optional(decode.string),
  )
  decode.success(PresencePayload(
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

fn invitation_payload_decoder() -> decode.Decoder(InvitationPayload) {
  use id <- decode.field("id", decode.string)
  use inviter_auth_id <- decode.field("inviterAuthId", decode.string)
  use inviter_display_name <- decode.field("inviterDisplayName", decode.string)
  use inviter_avatar_url <- decode.optional_field(
    "inviterAvatarUrl",
    None,
    decode.optional(decode.string),
  )
  use topic <- decode.optional_field(
    "topic",
    None,
    decode.optional(decode.string),
  )
  use expires_at <- decode.field("expiresAt", decode.string)
  decode.success(InvitationPayload(
    id: id,
    inviter_auth_id: inviter_auth_id,
    inviter_display_name: inviter_display_name,
    inviter_avatar_url: inviter_avatar_url,
    topic: topic,
    expires_at: expires_at,
  ))
}

fn acceptance_payload_decoder() -> decode.Decoder(AcceptancePayload) {
  use invitation_id <- decode.field("invitationId", decode.string)
  use room_id <- decode.field("roomId", decode.string)
  decode.success(AcceptancePayload(
    invitation_id: invitation_id,
    room_id: room_id,
  ))
}

fn activity_snapshot_decoder() -> decode.Decoder(ActivitySnapshot) {
  use count <- decode.field("recentSpeakerEventCount", decode.int)
  use emitted_at <- decode.field("emittedAt", decode.string)
  decode.success(ActivitySnapshot(
    recent_speaker_event_count: count,
    emitted_at: emitted_at,
  ))
}

/// JSON テキストをクライアントメッセージにパースする。
/// パース失敗時は UnknownMessage を返す（接続は切らない）。
pub fn parse_client_message(text: String) -> ClientMessage {
  let type_result =
    json.parse(from: text, using: {
      use t <- decode.field("type", decode.string)
      decode.success(t)
    })
    |> result.unwrap("")

  case type_result {
    "presence:join" -> {
      case
        json.parse(from: text, using: {
          use payload <- decode.field("payload", presence_payload_decoder())
          decode.success(payload)
        })
      {
        Ok(payload) -> PresenceJoin(payload: payload)
        Error(_) -> UnknownMessage
      }
    }

    "presence:update_position" -> {
      case
        json.parse(from: text, using: {
          use x <- decode.field("x", decode.float)
          use y <- decode.field("y", decode.float)
          decode.success(#(x, y))
        })
      {
        Ok(#(x, y)) -> PresenceUpdatePosition(x: x, y: y)
        Error(_) -> UnknownMessage
      }
    }

    "presence:update_status" -> {
      case
        json.parse(from: text, using: {
          use s <- decode.field("status", decode.string)
          decode.success(s)
        })
      {
        Ok(s) -> PresenceUpdateStatus(status: parse_status(s))
        Error(_) -> UnknownMessage
      }
    }

    "presence:update_room" -> {
      case
        json.parse(from: text, using: {
          use room_id <- decode.optional_field(
            "room_id",
            None,
            decode.optional(decode.string),
          )
          decode.success(room_id)
        })
      {
        Ok(room_id) -> PresenceUpdateRoom(room_id: room_id)
        Error(_) -> UnknownMessage
      }
    }

    "presence:leave" -> PresenceLeave

    "invitation:send" -> {
      case
        json.parse(from: text, using: {
          use id <- decode.field("invitee_auth_id", decode.string)
          use p <- decode.field("payload", invitation_payload_decoder())
          decode.success(#(id, p))
        })
      {
        Ok(#(id, p)) -> InvitationSend(invitee_auth_id: id, payload: p)
        Error(_) -> UnknownMessage
      }
    }

    "invitation:accept" -> {
      case
        json.parse(from: text, using: {
          use id <- decode.field("inviter_auth_id", decode.string)
          use p <- decode.field("payload", acceptance_payload_decoder())
          decode.success(#(id, p))
        })
      {
        Ok(#(id, p)) -> InvitationAccept(inviter_auth_id: id, payload: p)
        Error(_) -> UnknownMessage
      }
    }

    "invitation:subscribe" -> {
      case
        json.parse(from: text, using: {
          use id <- decode.field("invitee_auth_id", decode.string)
          decode.success(id)
        })
      {
        Ok(id) -> InvitationSubscribe(invitee_auth_id: id)
        Error(_) -> UnknownMessage
      }
    }

    "acceptance:subscribe" -> {
      case
        json.parse(from: text, using: {
          use id <- decode.field("inviter_auth_id", decode.string)
          decode.success(id)
        })
      {
        Ok(id) -> AcceptanceSubscribe(inviter_auth_id: id)
        Error(_) -> UnknownMessage
      }
    }

    "room:subscribe" -> {
      case
        json.parse(from: text, using: {
          use id <- decode.field("room_id", decode.string)
          decode.success(id)
        })
      {
        Ok(id) -> RoomSubscribe(room_id: id)
        Error(_) -> UnknownMessage
      }
    }

    "room:unsubscribe" -> {
      case
        json.parse(from: text, using: {
          use id <- decode.field("room_id", decode.string)
          decode.success(id)
        })
      {
        Ok(id) -> RoomUnsubscribe(room_id: id)
        Error(_) -> UnknownMessage
      }
    }

    "room:activity" -> {
      case
        json.parse(from: text, using: {
          use id <- decode.field("room_id", decode.string)
          use s <- decode.field("snapshot", activity_snapshot_decoder())
          decode.success(#(id, s))
        })
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
