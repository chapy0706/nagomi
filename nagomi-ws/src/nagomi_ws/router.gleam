/// HTTP ルーター
///
/// GET /ws          → WebSocket アップグレード
/// GET /health      → ヘルスチェック（Coolify のプローブ用）
/// その他            → 404

import gleam/bytes_builder
import gleam/erlang/os
import gleam/http/request.{type Request}
import gleam/http/response
import gleam/list
import gleam/option
import gleam/result
import gleam/string
import gleam/uri
import mist.{type Connection, type ResponseData}
import nagomi_ws/jwt
import nagomi_ws/server_state.{type ServerState}
import nagomi_ws/ws_handler

pub fn handle_request(
  server: ServerState,
  req: Request(Connection),
) -> response.Response(ResponseData) {
  case request.path_segments(req) {
    ["ws"] -> handle_websocket(server, req)
    ["health"] -> handle_health()
    _ ->
      response.new(404)
      |> response.set_body(mist.Bytes(bytes_builder.from_string("Not Found")))
  }
}

fn handle_health() -> response.Response(ResponseData) {
  response.new(200)
  |> response.set_body(mist.Bytes(bytes_builder.from_string("OK")))
}

fn handle_websocket(
  server: ServerState,
  req: Request(Connection),
) -> response.Response(ResponseData) {
  let jwt_secret = case os.get_env("JWT_SECRET") {
    Ok(s) -> s
    Error(_) -> ""
  }

  // クエリ文字列から ?token=... を取り出す
  let token_result = get_token(req, jwt_secret)

  mist.websocket(
    request: req,
    on_open: fn(conn) { ws_handler.on_open(server, conn, token_result) },
    on_close: fn(state) { ws_handler.on_close(state) },
    handler: fn(state, conn, msg) { ws_handler.handler(state, conn, msg) },
  )
}

fn get_token(
  req: Request(Connection),
  jwt_secret: String,
) -> Result(String, String) {
  let query_str = case req.query {
    option.Some(q) -> q
    option.None -> ""
  }

  use params <- result.try(
    uri.parse_query(query_str)
    |> result.map_error(fn(_) { "invalid query string" }),
  )

  use token <- result.try(
    list.find_map(params, fn(param) {
      case param {
        #("token", v) -> Ok(v)
        _ -> Error(Nil)
      }
    })
    |> result.map_error(fn(_) { "token not found" }),
  )

  case jwt_secret {
    // JWT_SECRET 未設定（開発環境）: 検証スキップ
    "" -> jwt.extract_without_verify(token)
    secret -> jwt.verify_and_extract(token, secret)
  }
}
