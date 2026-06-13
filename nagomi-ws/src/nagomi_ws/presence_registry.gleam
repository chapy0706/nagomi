/// Presence 状態管理アクター
///
/// 誰が今フロアにいるか（位置・ステータス）を管理する。
/// 接続 ID ↔ PresencePayload のマッピングを保持し、
/// 誰かが接続・更新・切断するたびに ws_handler が get_all() してブロードキャストする。

import gleam/dict.{type Dict}
import gleam/erlang/process.{type Subject}
import gleam/list
import gleam/otp/actor
import nagomi_ws/message.{type PresencePayload}

pub opaque type Message {
  Track(conn_id: String, employee_id: String, payload: PresencePayload)
  Update(conn_id: String, payload: PresencePayload)
  Untrack(conn_id: String)
  GetAll(reply_with: Subject(List(PresencePayload)))
  GetByConn(conn_id: String, reply_with: Subject(Result(PresencePayload, Nil)))
}

type State =
  Dict(String, PresencePayload)

pub fn start() -> Result(Subject(Message), actor.StartError) {
  actor.start(dict.new(), handle_message)
}

fn handle_message(msg: Message, state: State) -> actor.Next(Message, State) {
  case msg {
    Track(conn_id, _employee_id, payload) ->
      actor.continue(dict.insert(state, conn_id, payload))

    Update(conn_id, payload) ->
      actor.continue(dict.insert(state, conn_id, payload))

    Untrack(conn_id) -> actor.continue(dict.delete(state, conn_id))

    GetAll(reply_with) -> {
      let presences = dict.values(state)
      process.send(reply_with, presences)
      actor.continue(state)
    }

    GetByConn(conn_id, reply_with) -> {
      process.send(reply_with, dict.get(state, conn_id))
      actor.continue(state)
    }
  }
}

// ---------------------------------------------------------------------------
// 公開 API
// ---------------------------------------------------------------------------

pub fn track(
  registry: Subject(Message),
  conn_id: String,
  payload: PresencePayload,
) -> Nil {
  process.send(
    registry,
    Track(conn_id: conn_id, employee_id: payload.employee_id, payload: payload),
  )
}

pub fn update(
  registry: Subject(Message),
  conn_id: String,
  payload: PresencePayload,
) -> Nil {
  process.send(registry, Update(conn_id: conn_id, payload: payload))
}

pub fn untrack(registry: Subject(Message), conn_id: String) -> Nil {
  process.send(registry, Untrack(conn_id: conn_id))
}

pub fn get_all(registry: Subject(Message)) -> List(PresencePayload) {
  actor.call(registry, GetAll, 1000)
}

pub fn get_by_conn(
  registry: Subject(Message),
  conn_id: String,
) -> Result(PresencePayload, Nil) {
  actor.call(registry, fn(reply) { GetByConn(conn_id: conn_id, reply_with: reply) }, 1000)
}
