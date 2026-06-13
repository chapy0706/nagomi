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

import gleam/dict.{type Dict}
import gleam/erlang/process.{type Subject}
import gleam/list
import gleam/otp/actor

pub opaque type Message {
  Register(id: String, subject: Subject(String))
  Unregister(id: String)
  Broadcast(message: String)
  BroadcastExcept(exclude_id: String, message: String)
  SendTo(id: String, message: String)
  GetCount(reply_with: Subject(Int))
}

type State =
  Dict(String, Subject(String))

pub fn start() -> Result(Subject(Message), actor.StartError) {
  actor.start(dict.new(), handle_message)
}

fn handle_message(msg: Message, state: State) -> actor.Next(Message, State) {
  case msg {
    Register(id, subject) -> actor.continue(dict.insert(state, id, subject))

    Unregister(id) -> actor.continue(dict.delete(state, id))

    Broadcast(message) -> {
      dict.each(state, fn(_, subject) { process.send(subject, message) })
      actor.continue(state)
    }

    BroadcastExcept(exclude_id, message) -> {
      dict.each(state, fn(id, subject) {
        case id == exclude_id {
          True -> Nil
          False -> process.send(subject, message)
        }
      })
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

pub fn register(registry: Subject(Message), id: String, subject: Subject(String)) -> Nil {
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
  process.send(registry, BroadcastExcept(exclude_id: exclude_id, message: message))
}

pub fn send_to(registry: Subject(Message), id: String, message: String) -> Nil {
  process.send(registry, SendTo(id: id, message: message))
}

pub fn get_count(registry: Subject(Message)) -> Int {
  actor.call(registry, GetCount, 1000)
}
