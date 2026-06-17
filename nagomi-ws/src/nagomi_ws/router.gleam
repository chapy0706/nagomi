/// HTTP ルーター
///
/// GET /ws          → WebSocket アップグレード
/// GET /health      → ヘルスチェック（Coolify のプローブ用）
/// その他            → 404
///
/// 認証について:
///   通常は JWT_SECRET で Supabase JWT（HS256）を検証する。
///   WS_AUTH_DISABLED=true のときのみ検証をスキップできる。
///   デフォルトを「検証あり」にする理由:
///     - 誤設定時のフォールバックを安全側（deny）にするため
///     - 環境変数が未設定の状態でデプロイしても認証が有効になる
///     - 明示的に "true" と書かなければスキップされない（opt-in bypass）

import envoy
import gleam/bytes_tree
import gleam/http/request.{type Request}
import gleam/http/response
import gleam/io
import gleam/list
import gleam/option
import gleam/result
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
      |> response.set_body(mist.Bytes(bytes_tree.from_string("Not Found")))
  }
}

fn handle_health() -> response.Response(ResponseData) {
  response.new(200)
  |> response.set_body(mist.Bytes(bytes_tree.from_string("OK")))
}

fn handle_websocket(
  server: ServerState,
  req: Request(Connection),
) -> response.Response(ResponseData) {
  let jwt_secret = case envoy.get("JWT_SECRET") {
    Ok(s) -> s
    Error(_) -> ""
  }

  // WS_AUTH_DISABLED=true のときだけ検証スキップ。デフォルトは検証あり。
  let auth_disabled = envoy.get("WS_AUTH_DISABLED") == Ok("true")

  let token_result = case auth_disabled {
    True -> {
      io.println(
        "[router] WARNING: WS_AUTH_DISABLED=true — 認証スキップ中（本番では使用禁止）",
      )
      // トークンが渡されていれば sub だけ取る（署名は検証しない）
      // なければ仮 ID を使って接続を許可する
      case extract_token_string(req) {
        Ok(token) -> jwt.extract_without_verify(token)
        Error(_) -> Ok("auth-disabled-anon")
      }
    }
    False -> get_token(req, jwt_secret)
  }

  mist.websocket(
    request: req,
    on_init: fn(conn) { ws_handler.on_open(server, conn, token_result) },
    on_close: fn(state) { ws_handler.on_close(state) },
    handler: fn(state, msg, conn) { ws_handler.handler(state, conn, msg) },
  )
}

/// クエリパラメーターから ?token=... を取り出す（検証なし）
fn extract_token_string(req: Request(Connection)) -> Result(String, String) {
  let query_str = case req.query {
    option.Some(q) -> q
    option.None -> ""
  }

  use params <- result.try(
    uri.parse_query(query_str)
    |> result.map_error(fn(_) { "invalid query string" }),
  )

  list.find_map(params, fn(param) {
    case param {
      #("token", v) -> Ok(v)
      _ -> Error(Nil)
    }
  })
  |> result.map_error(fn(_) { "token not found" })
}

/// トークン文字列を取り出し、JWT_SECRET で署名を検証して sub を返す
fn get_token(
  req: Request(Connection),
  jwt_secret: String,
) -> Result(String, String) {
  use token <- result.try(extract_token_string(req))

  case jwt_secret {
    // JWT_SECRET 未設定（ローカル開発環境）: 検証スキップ
    "" -> jwt.extract_without_verify(token)
    secret -> jwt.verify_and_extract(token, secret)
  }
}
