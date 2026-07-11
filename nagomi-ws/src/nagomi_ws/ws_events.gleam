/// nagomi-ws → 本体 の在室証跡イベント送信（非同期・fire-and-forget）。
///
/// 設計:
///   - 証跡の記録は主機能（接続確立）に従属する副作用。記録の失敗・遅延が接続を
///     ブロックしないよう、別プロセスを spawn して POST する（接続プロセスとは非リンク＝
///     記録側がクラッシュしても接続に波及しない）。
///   - ただし「静かな証跡欠落」を検知できるよう、失敗は必ずログに出す（gated ではない）。
///
/// 認証: 本体と共有する WS_EVENTS_SECRET を Authorization: Bearer で送る。
/// 設定（WS_EVENTS_URL / WS_EVENTS_SECRET）が無い場合も、握りつぶさずログに残す。

import envoy
import gleam/erlang/process.{type Pid}
import gleam/http
import gleam/http/request
import gleam/httpc
import gleam/int
import gleam/io
import gleam/json

// erlang:spawn/1 は非リンクのプロセスを起こす（Fun/0 を実行、Pid を返す）。
@external(erlang, "erlang", "spawn")
fn spawn(f: fn() -> Nil) -> Pid

/// 接続確立イベントを非同期で送る。
pub fn record_connected(employee_auth_id: String, connection_id: String) -> Nil {
  let body =
    json.to_string(
      json.object([
        #("type", json.string("connected")),
        #("employeeAuthId", json.string(employee_auth_id)),
        #("connectionId", json.string(connection_id)),
      ]),
    )
  post_async(body)
}

/// 接続終了イベントを非同期で送る。
pub fn record_disconnected(connection_id: String) -> Nil {
  let body =
    json.to_string(
      json.object([
        #("type", json.string("disconnected")),
        #("connectionId", json.string(connection_id)),
      ]),
    )
  post_async(body)
}

fn post_async(body: String) -> Nil {
  // 別プロセスで POST する。接続プロセスをブロックしない。
  let _ = spawn(fn() { post(body) })
  Nil
}

fn post(body: String) -> Nil {
  case envoy.get("WS_EVENTS_URL"), envoy.get("WS_EVENTS_SECRET") {
    Ok(url), Ok(secret) ->
      case request.to(url) {
        Ok(base) -> {
          let req =
            base
            |> request.set_method(http.Post)
            |> request.set_header("content-type", "application/json")
            |> request.set_header("authorization", "Bearer " <> secret)
            |> request.set_body(body)
          case httpc.send(req) {
            Ok(resp) ->
              case resp.status {
                200 -> Nil
                status ->
                  log_failure(
                    "本体が非2xx応答 status=" <> int.to_string(status),
                    body,
                  )
              }
            Error(_) -> log_failure("POST 送信失敗", body)
          }
        }
        Error(_) -> log_failure("WS_EVENTS_URL が不正: " <> url, body)
      }
    _, _ -> log_failure("WS_EVENTS_URL / WS_EVENTS_SECRET 未設定", body)
  }
}

// 失敗は必ず可視化する（gated ではない）。証跡の穴を静かに見逃さないため。
// body には employeeAuthId / connectionId のみが含まれ、secret は含めない。
fn log_failure(reason: String, body: String) -> Nil {
  io.println("[ws_events] ERROR: 証跡記録に失敗: " <> reason <> " body=" <> body)
}
