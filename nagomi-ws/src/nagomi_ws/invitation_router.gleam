/// 招待ルーティングアクター
///
/// auth_user_id ↔ conn_id のマッピングを管理する。
/// 特定ユーザーに招待・承諾を届けるために使う。
/// 1ユーザーが複数タブを開いている場合、最後に登録した接続にのみ届く。

import gleam/dict.{type Dict}
import gleam/erlang/process.{type Subject}
import gleam/otp/actor

pub opaque type Message {
  Subscribe(auth_user_id: String, conn_id: String)
  Unsubscribe(auth_user_id: String, conn_id: String)
  GetConnId(auth_user_id: String, reply_with: Subject(Result(String, Nil)))
}

type State =
  Dict(String, String)

pub fn start() -> Result(Subject(Message), actor.StartError) {
  actor.start(dict.new(), handle_message)
}

fn handle_message(msg: Message, state: State) -> actor.Next(Message, State) {
  case msg {
    Subscribe(auth_user_id, conn_id) ->
      actor.continue(dict.insert(state, auth_user_id, conn_id))

    Unsubscribe(auth_user_id, conn_id) -> {
      // 別タブの登録を消してしまわないよう、自分の conn_id のときだけ削除する
      let new_state = case dict.get(state, auth_user_id) {
        Ok(stored_id) if stored_id == conn_id -> dict.delete(state, auth_user_id)
        _ -> state
      }
      actor.continue(new_state)
    }

    GetConnId(auth_user_id, reply_with) -> {
      process.send(reply_with, dict.get(state, auth_user_id))
      actor.continue(state)
    }
  }
}

// ---------------------------------------------------------------------------
// 公開 API
// ---------------------------------------------------------------------------

pub fn subscribe(
  router: Subject(Message),
  auth_user_id: String,
  conn_id: String,
) -> Nil {
  process.send(
    router,
    Subscribe(auth_user_id: auth_user_id, conn_id: conn_id),
  )
}

pub fn unsubscribe(
  router: Subject(Message),
  auth_user_id: String,
  conn_id: String,
) -> Nil {
  process.send(
    router,
    Unsubscribe(auth_user_id: auth_user_id, conn_id: conn_id),
  )
}

pub fn get_conn_id(
  router: Subject(Message),
  auth_user_id: String,
) -> Result(String, Nil) {
  actor.call(
    router,
    fn(reply) { GetConnId(auth_user_id: auth_user_id, reply_with: reply) },
    1000,
  )
}
