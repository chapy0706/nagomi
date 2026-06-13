/// 通話ルーム活動ルーティングアクター
///
/// room_id ↔ Set(conn_id) のマッピングを管理する。
/// フロア閲覧中のクライアントが room:subscribe で登録し、
/// 通話中クライアントが room:activity を送信するとサブスクライバーに転送する。

import gleam/dict.{type Dict}
import gleam/erlang/process.{type Subject}
import gleam/list
import gleam/otp/actor
import gleam/set.{type Set}

pub opaque type Message {
  Subscribe(room_id: String, conn_id: String)
  Unsubscribe(room_id: String, conn_id: String)
  UnsubscribeAll(conn_id: String)
  GetSubscribers(room_id: String, reply_with: Subject(List(String)))
}

type State =
  Dict(String, Set(String))

pub fn start() -> Result(Subject(Message), actor.StartError) {
  actor.start(dict.new(), handle_message)
}

fn handle_message(msg: Message, state: State) -> actor.Next(Message, State) {
  case msg {
    Subscribe(room_id, conn_id) -> {
      let subscribers =
        dict.get(state, room_id)
        |> result_or(set.new())
        |> set.insert(conn_id)
      actor.continue(dict.insert(state, room_id, subscribers))
    }

    Unsubscribe(room_id, conn_id) -> {
      let new_state = case dict.get(state, room_id) {
        Ok(subs) ->
          dict.insert(state, room_id, set.delete(subs, conn_id))
        Error(_) -> state
      }
      actor.continue(new_state)
    }

    UnsubscribeAll(conn_id) -> {
      let new_state =
        dict.map_values(state, fn(_, subs) { set.delete(subs, conn_id) })
      actor.continue(new_state)
    }

    GetSubscribers(room_id, reply_with) -> {
      let conn_ids =
        dict.get(state, room_id)
        |> result_or(set.new())
        |> set.to_list
      process.send(reply_with, conn_ids)
      actor.continue(state)
    }
  }
}

fn result_or(result: Result(a, e), default: a) -> a {
  case result {
    Ok(v) -> v
    Error(_) -> default
  }
}

// ---------------------------------------------------------------------------
// 公開 API
// ---------------------------------------------------------------------------

pub fn subscribe(
  router: Subject(Message),
  room_id: String,
  conn_id: String,
) -> Nil {
  process.send(router, Subscribe(room_id: room_id, conn_id: conn_id))
}

pub fn unsubscribe(
  router: Subject(Message),
  room_id: String,
  conn_id: String,
) -> Nil {
  process.send(router, Unsubscribe(room_id: room_id, conn_id: conn_id))
}

pub fn unsubscribe_all(router: Subject(Message), conn_id: String) -> Nil {
  process.send(router, UnsubscribeAll(conn_id: conn_id))
}

pub fn get_subscribers(
  router: Subject(Message),
  room_id: String,
) -> List(String) {
  actor.call(
    router,
    fn(reply) { GetSubscribers(room_id: room_id, reply_with: reply) },
    1000,
  )
}
