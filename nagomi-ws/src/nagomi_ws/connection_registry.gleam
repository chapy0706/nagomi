/// 接続管理アクター
///
/// OTP アクターとは何か:
///   - 独立したプロセスとして動く「状態を持つループ」
///   - 状態は不変で、メッセージを受け取るたびに新しい状態を返す
///   - クラッシュしてもスーパーバイザーが再起動できる（耐障害性）
///
/// なぜ接続管理に向いているか:
///   - 接続の増減が並行して起きる（複数クライアントが同時に接続・切断）
///   - アクターはメッセージを直列化するため、状態の競合を防げる
///   - ETS（共有メモリ）を使わず、プロセス境界でデータを守る

import gleam/dict
import gleam/erlang/process.{type Subject}
import gleam/list
import gleam/otp/actor
import gleam/result

pub opaque type Message {
  Register(id: String, subject: Subject(String))
  Unregister(id: String)
  Broadcast(message: String)
  BroadcastExcept(exclude_id: String, message: String)
  SendTo(id: String, message: String)
  GetCount(reply_with: Subject(Int))
}

pub fn start() -> Result(Subject(Message), actor.StartError) {
  actor.new(dict.new())
  |> actor.on_message(handle_message)
  |> actor.start
  |> result.map(fn(s) { s.data })
}

fn handle_message(state, msg: Message) {
  case msg {
    Register(id, subject) -> actor.continue(dict.insert(state, id, subject))

    Unregister(id) -> actor.continue(dict.delete(state, id))

    Broadcast(message) -> {
      list.each(dict.values(state), fn(subject) {
        process.send(subject, message)
      })
      actor.continue(state)
    }

    // exclude_id を除いた残りの全接続へ送信
    BroadcastExcept(exclude_id, message) -> {
      state
      |> dict.delete(exclude_id)
      |> dict.values
      |> list.each(fn(subject) { process.send(subject, message) })
      actor.continue(state)
    }

    SendTo(id, message) -> {
      case dict.get(state, id) {
        Ok(subject) -> process.send(subject, message)
        Error(_) -> Nil
      }
      actor.continue(state)
    }

    GetCount(reply_with) -> {
      process.send(reply_with, dict.size(state))
      actor.continue(state)
    }
  }
}

// ---------------------------------------------------------------------------
// 公開 API（ws_handler から呼ぶ）
// ---------------------------------------------------------------------------

pub fn register(
  registry: Subject(Message),
  id: String,
  subject: Subject(String),
) -> Nil {
  process.send(registry, Register(id: id, subject: subject))
}

pub fn unregister(registry: Subject(Message), id: String) -> Nil {
  process.send(registry, Unregister(id: id))
}

pub fn broadcast(registry: Subject(Message), message: String) -> Nil {
  process.send(registry, Broadcast(message: message))
}

pub fn broadcast_except(
  registry: Subject(Message),
  exclude_id: String,
  message: String,
) -> Nil {
  process.send(
    registry,
    BroadcastExcept(exclude_id: exclude_id, message: message),
  )
}

pub fn send_to(registry: Subject(Message), id: String, message: String) -> Nil {
  process.send(registry, SendTo(id: id, message: message))
}

pub fn get_count(registry: Subject(Message)) -> Int {
  actor.call(registry, waiting: 1000, sending: GetCount)
}
