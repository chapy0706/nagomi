/// nagomi-ws エントリーポイント
///
/// 起動順:
///   1. OTP アクター（接続管理・Presence・招待・ルーム活動）を起動
///   2. mist HTTP サーバーを PORT（デフォルト 3001）で起動
///   3. process.sleep_forever() でメインプロセスを生かし続ける

import envoy
import gleam/erlang/process
import gleam/int
import gleam/io
import gleam/result
import mist
import nagomi_ws/connection_registry
import nagomi_ws/invitation_router
import nagomi_ws/presence_registry
import nagomi_ws/room_activity_router
import nagomi_ws/router
import nagomi_ws/server_state.{ServerState}

pub fn main() {
  let port = get_port()

  // OTP アクターを順番に起動
  // let assert Ok(...) は起動失敗時にクラッシュさせる（スーパーバイザーが再起動する）
  let assert Ok(conn_reg) = connection_registry.start()
  let assert Ok(pres_reg) = presence_registry.start()
  let assert Ok(inv_router) = invitation_router.start()
  let assert Ok(room_router) = room_activity_router.start()

  let state =
    ServerState(
      connection_registry: conn_reg,
      presence_registry: pres_reg,
      invitation_router: inv_router,
      room_activity_router: room_router,
    )

  let assert Ok(_) =
    mist.new(router.handle_request(state, _))
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
