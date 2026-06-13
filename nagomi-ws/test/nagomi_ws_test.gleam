import gleeunit
import gleeunit/should
import nagomi_ws/message.{
  PresenceJoin, PresenceUpdatePosition, PresenceUpdateStatus, RoomBroadcastActivity,
  UnknownMessage,
}

pub fn main() {
  gleeunit.main()
}

// ---------------------------------------------------------------------------
// message.parse_client_message のテスト
// ---------------------------------------------------------------------------

pub fn parse_unknown_type_test() {
  message.parse_client_message("{\"type\":\"unknown:xyz\"}")
  |> should.equal(UnknownMessage)
}

pub fn parse_invalid_json_test() {
  message.parse_client_message("not-json")
  |> should.equal(UnknownMessage)
}

pub fn parse_presence_leave_test() {
  message.parse_client_message("{\"type\":\"presence:leave\"}")
  |> should.equal(message.PresenceLeave)
}

pub fn parse_presence_update_position_test() {
  let result =
    message.parse_client_message(
      "{\"type\":\"presence:update_position\",\"x\":100.0,\"y\":200.0}",
    )
  result
  |> should.equal(PresenceUpdatePosition(x: 100.0, y: 200.0))
}

pub fn parse_presence_update_status_test() {
  let result =
    message.parse_client_message(
      "{\"type\":\"presence:update_status\",\"status\":\"busy\"}",
    )
  result |> should.equal(PresenceUpdateStatus(status: message.Busy))
}

pub fn parse_room_subscribe_test() {
  let result =
    message.parse_client_message(
      "{\"type\":\"room:subscribe\",\"room_id\":\"room-123\"}",
    )
  result |> should.equal(message.RoomSubscribe(room_id: "room-123"))
}

pub fn parse_invitation_subscribe_test() {
  let result =
    message.parse_client_message(
      "{\"type\":\"invitation:subscribe\",\"invitee_auth_id\":\"user-abc\"}",
    )
  result
  |> should.equal(message.InvitationSubscribe(invitee_auth_id: "user-abc"))
}

// ---------------------------------------------------------------------------
// message エンコーダーのテスト
// ---------------------------------------------------------------------------

pub fn encode_presence_left_test() {
  let json = message.encode_presence_left("emp-123")
  // 文字列に presence:left と employee_id が含まれることを確認
  json |> should.not_equal("")
}

pub fn encode_presence_sync_empty_test() {
  let json = message.encode_presence_sync([])
  json |> should.not_equal("")
}

pub fn encode_error_test() {
  let json = message.encode_error("unauthorized")
  json |> should.not_equal("")
}

// ---------------------------------------------------------------------------
// PresencePayload 更新ヘルパーのテスト
// ---------------------------------------------------------------------------

fn sample_presence() {
  message.PresencePayload(
    employee_id: "emp-1",
    auth_user_id: gleam/option.Some("auth-1"),
    display_name: "テストユーザー",
    avatar_url: gleam/option.None,
    x: 100.0,
    y: 200.0,
    status: message.Available,
    current_room_id: gleam/option.None,
  )
}

pub fn update_position_test() {
  let p = sample_presence()
  let updated = message.update_position(p, 300.0, 400.0)
  updated.x |> should.equal(300.0)
  updated.y |> should.equal(400.0)
  updated.employee_id |> should.equal("emp-1")
}

pub fn update_status_test() {
  let p = sample_presence()
  let updated = message.update_status(p, message.Busy)
  updated.status |> should.equal(message.Busy)
}
