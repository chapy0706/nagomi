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
import nagomi_ws/key_cache
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
  // WS_AUTH_DISABLED=true のときだけ検証スキップ。デフォルトは検証あり（deny 側）。
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
    False -> verify_token_rs256(server, req)
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

/// トークンを取り出し、Keアカウント発行 JWT を RS256/JWKS で検証して sub を返す。
///
/// 流れ: token 取得 → header の kid で公開鍵をキャッシュから引く → RS256 署名検証。
/// いずれかの失敗はすべて Error（= 呼び出し側で deny）。
/// 各判断点に gated debug ログ（WS_DEBUG=true のときのみ出力）を仕込む。
fn verify_token_rs256(
  server: ServerState,
  req: Request(Connection),
) -> Result(String, String) {
  use token <- result.try(extract_token_string(req))
  use header <- result.try(jwt.peek_header(token))
  debug_log("kid=" <> header.kid <> " alg=" <> header.alg)

  case key_cache.get_key(server.key_cache, header.kid) {
    Error(reason) -> {
      debug_log("key lookup failed: " <> reason)
      Error(reason)
    }
    Ok(jwk) ->
      case jwt.verify_rs256(token, jwk, claim_expectations()) {
        Ok(sub) -> {
          debug_log("verified (signature + claims) ok")
          Ok(sub)
        }
        Error(reason) -> {
          debug_log("verify failed: " <> reason)
          Error(reason)
        }
      }
  }
}

/// クレーム検証の期待値を env から組み立てる。
/// - KEYCLOAK_ISSUER: 発行者（未設定なら "" となり iss 不一致で deny）
/// - KEYCLOAK_EXPECTED_AZP: 主関門。既定 nagomi-web
/// - KEYCLOAK_EXPECTED_AUD: aud に含むべき値。既定 account（Keアカウント既定）。
///   将来 audience mapper で専用 aud を入れたら env でここを締められる。
fn claim_expectations() -> jwt.ClaimExpectations {
  jwt.ClaimExpectations(
    issuer: env_or("KEYCLOAK_ISSUER", ""),
    expected_azp: env_or("KEYCLOAK_EXPECTED_AZP", "nagomi-web"),
    expected_aud: env_or("KEYCLOAK_EXPECTED_AUD", "account"),
  )
}

fn env_or(key: String, default: String) -> String {
  case envoy.get(key) {
    Ok(value) -> value
    Error(_) -> default
  }
}

/// gated debug ログ。WS_DEBUG=true のときだけ出力する（本番の常時ログ汚染を避ける）。
fn debug_log(msg: String) -> Nil {
  case envoy.get("WS_DEBUG") == Ok("true") {
    True -> io.println("[jwt] " <> msg)
    False -> Nil
  }
}
