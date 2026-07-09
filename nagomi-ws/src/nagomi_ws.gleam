/// nagomi-ws エントリーポイント
///
/// 起動順:
///   1. OTP アクター（接続管理・Presence・招待・ルーム活動）を起動
///   2. mist HTTP サーバーを PORT（デフォルト 3001）で起動
///   3. process.sleep_forever() でメインプロセスを生かし続ける

import envoy
import gleam/dynamic.{type Dynamic}
import gleam/erlang/atom
import gleam/erlang/process
import gleam/int
import gleam/io
import gleam/result
import mist
import nagomi_ws/connection_registry
import nagomi_ws/invitation_router
import nagomi_ws/key_cache
import nagomi_ws/presence_registry
import nagomi_ws/room_activity_router
import nagomi_ws/router
import nagomi_ws/server_state.{ServerState}

// httpc(https) で JWKS を取得するため、ssl / inets を起動する。
// application:ensure_all_started は {ok, Started} | {error, Reason} を返し、
// Gleam の Result（{ok,_}/{error,_}）へ直接対応する。依存も含めて起動される。
@external(erlang, "application", "ensure_all_started")
fn ensure_all_started(app: atom.Atom) -> Result(List(atom.Atom), Dynamic)

pub fn main() {
  let port = get_port()

  // JWKS 取得（https）に必要な Erlang アプリを起動しておく。
  let _ = ensure_all_started(atom.create("inets"))
  let _ = ensure_all_started(atom.create("ssl"))

  // OTP アクターを順番に起動
  // let assert Ok(...) は起動失敗時にクラッシュさせる（スーパーバイザーが再起動する）
  let assert Ok(conn_reg) = connection_registry.start()
  let assert Ok(pres_reg) = presence_registry.start()
  let assert Ok(inv_router) = invitation_router.start()
  let assert Ok(room_router) = room_activity_router.start()
  let assert Ok(keys) = key_cache.start(get_jwks_url())

  // 起動時に JWKS を事前取得する。失敗しても crash させず、初回接続時に遅延取得する
  // （フェイルセーフ: 鍵が無ければ検証は deny になる）。
  case key_cache.refresh(keys) {
    Ok(_) -> io.println("[key_cache] JWKS prefetched")
    Error(reason) ->
      io.println("[key_cache] JWKS prefetch failed (retry lazily): " <> reason)
  }

  let state =
    ServerState(
      connection_registry: conn_reg,
      presence_registry: pres_reg,
      invitation_router: inv_router,
      room_activity_router: room_router,
      key_cache: keys,
    )

  let assert Ok(_) =
    mist.new(router.handle_request(state, _))
    |> mist.bind("0.0.0.0")
    |> mist.port(port)
    |> mist.start

  io.println("nagomi-ws started on :" <> int.to_string(port))
  process.sleep_forever()
}

fn get_port() -> Int {
  case envoy.get("PORT") {
    Ok(p) -> int.parse(p) |> result.unwrap(3001)
    Error(_) -> 3001
  }
}

/// JWKS エンドポイントの URL を env から決める。
/// KEYCLOAK_JWKS_URL があればそれを、無ければ KEYCLOAK_ISSUER から導出する。
/// どちらも無ければ空文字（取得は失敗し deny になる＝フェイルセーフ）。
fn get_jwks_url() -> String {
  case envoy.get("KEYCLOAK_JWKS_URL") {
    Ok(url) -> url
    Error(_) ->
      case envoy.get("KEYCLOAK_ISSUER") {
        Ok(issuer) -> issuer <> "/protocol/openid-connect/certs"
        Error(_) -> ""
      }
  }
}
