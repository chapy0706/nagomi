/// JWKS 公開鍵キャッシュアクター（kid → Jwk）
///
/// OTP アクターで公開鍵を保持する。理由:
///   - 複数の WS 接続が同時に鍵を引く（並行アクセス）。アクターはメッセージを
///     直列化するため、キャッシュ更新の競合を防げる（ETS 共有メモリ不要）。
///
/// 取得戦略:
///   - kid がキャッシュにあればそれを返す（毎接続で JWKS を取りに行かない）
///   - 未知 kid のときだけ JWKS を取り直す。ただし最小間隔（min_refetch_interval_ms）
///     を設け、未知 kid の連打で JWKS を叩き続けない（storm / DoS 防止）
///   - 鍵はごく稀にしかローテートしないため、この戦略で十分
///
/// フェイルセーフ: 取得失敗・未知 kid のまま・再取得後も見つからない、は
/// すべて Error を返す。呼び出し側（署名検証）は Error を deny に倒す。
///
/// トレードオフ: JWKS の HTTP 取得はアクター内で同期的に行うため、取得中は
/// 他の get_key がキューで待つ。鍵取得は稀かつ律速されるため許容する。

import gleam/dict.{type Dict}
import gleam/erlang/atom
import gleam/erlang/process.{type Subject}
import gleam/list
import gleam/otp/actor
import gleam/result
import nagomi_ws/jwks.{type Jwk}

/// 未知 kid での JWKS 再取得の最小間隔（ミリ秒）。この間隔内の未知 kid は
/// 再取得せずに deny する（攻撃者のランダム kid 連打で JWKS を叩き続けないため）。
const min_refetch_interval_ms = 60_000

// ---------------------------------------------------------------------------
// Erlang FFI: 現在時刻（ミリ秒）
// ---------------------------------------------------------------------------

@external(erlang, "erlang", "system_time")
fn erlang_system_time(unit: atom.Atom) -> Int

fn now_ms() -> Int {
  erlang_system_time(atom.create("millisecond"))
}

// ---------------------------------------------------------------------------
// アクター状態とメッセージ
// ---------------------------------------------------------------------------

type State {
  State(jwks_url: String, keys: Dict(String, Jwk), last_fetch_ms: Int)
}

pub opaque type Message {
  /// kid に対応する鍵を要求する。未知なら（律速の上で）JWKS を取り直す。
  GetKey(kid: String, reply_with: Subject(Result(Jwk, String)))
  /// JWKS を強制的に取り直す（起動時の事前取得などに使う）。
  Refresh(reply_with: Subject(Result(Nil, String)))
}

pub fn start(jwks_url: String) -> Result(Subject(Message), actor.StartError) {
  actor.new(State(jwks_url: jwks_url, keys: dict.new(), last_fetch_ms: 0))
  |> actor.on_message(handle_message)
  |> actor.start
  |> result.map(fn(started) { started.data })
}

fn handle_message(state: State, msg: Message) {
  case msg {
    GetKey(kid, reply_with) -> handle_get_key(state, kid, reply_with)

    Refresh(reply_with) -> {
      let now = now_ms()
      case jwks.fetch_jwks(state.jwks_url) {
        Ok(jwk_list) -> {
          process.send(reply_with, Ok(Nil))
          actor.continue(
            State(..state, keys: index_by_kid(jwk_list), last_fetch_ms: now),
          )
        }
        Error(reason) -> {
          // 取得失敗でも last_fetch_ms は更新し、連続再取得を抑える。
          process.send(reply_with, Error(reason))
          actor.continue(State(..state, last_fetch_ms: now))
        }
      }
    }
  }
}

fn handle_get_key(
  state: State,
  kid: String,
  reply_with: Subject(Result(Jwk, String)),
) {
  case dict.get(state.keys, kid) {
    // キャッシュヒット
    Ok(jwk) -> {
      process.send(reply_with, Ok(jwk))
      actor.continue(state)
    }

    // 未知 kid
    Error(_) -> {
      let now = now_ms()
      case now - state.last_fetch_ms >= min_refetch_interval_ms {
        // 直近に取得済み → これ以上叩かず deny（storm 防止・フェイルセーフ）
        False -> {
          process.send(
            reply_with,
            Error("unknown kid (refetch rate-limited)"),
          )
          actor.continue(state)
        }

        // 最小間隔を超えた → JWKS を取り直して再探索
        True ->
          case jwks.fetch_jwks(state.jwks_url) {
            Ok(jwk_list) -> {
              let new_keys = index_by_kid(jwk_list)
              case dict.get(new_keys, kid) {
                Ok(jwk) -> process.send(reply_with, Ok(jwk))
                Error(_) ->
                  process.send(reply_with, Error("unknown kid after refresh"))
              }
              actor.continue(
                State(..state, keys: new_keys, last_fetch_ms: now),
              )
            }
            Error(reason) -> {
              // 取得失敗 = deny。last_fetch_ms を更新して storm を防ぐ。
              process.send(
                reply_with,
                Error("JWKS refresh failed: " <> reason),
              )
              actor.continue(State(..state, last_fetch_ms: now))
            }
          }
      }
    }
  }
}

fn index_by_kid(keys: List(Jwk)) -> Dict(String, Jwk) {
  list.fold(keys, dict.new(), fn(acc, jwk) { dict.insert(acc, jwk.kid, jwk) })
}

// ---------------------------------------------------------------------------
// 公開 API
// ---------------------------------------------------------------------------

/// kid に対応する公開鍵を取得する。未知なら（律速の上で）JWKS を取り直す。
/// 取得できない・失敗は Error（呼び出し側は deny）。同期呼び出し（アクターで直列化）。
/// タイムアウト時は呼び出しプロセスがクラッシュ＝接続拒否（フェイルセーフ）。
pub fn get_key(cache: Subject(Message), kid: String) -> Result(Jwk, String) {
  actor.call(cache, waiting: 15_000, sending: fn(reply) { GetKey(kid, reply) })
}

/// JWKS を強制取得する（起動時の事前取得など）。失敗は Error。
pub fn refresh(cache: Subject(Message)) -> Result(Nil, String) {
  actor.call(cache, waiting: 15_000, sending: Refresh)
}
