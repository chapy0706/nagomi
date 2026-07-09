/// JWKS（JSON Web Key Set）の取得とパース
///
/// Keアカウント（Keycloak）の certs エンドポイントから公開鍵の集合を取得し、
/// RS256 署名検証に必要な kid / n / e を持つ Jwk のリストへ変換する。
///
/// フェイルセーフ: 取得失敗・ステータス異常・パース失敗はすべて Error を返す。
/// 呼び出し側（鍵キャッシュ）は Error を deny に倒す。
///
/// このモジュールは「取得＋パース」だけを担い、キャッシュは持たない（2b のアクターが担う）。
///
/// 注意（実行時）: httpc(https) を使うため、アプリ起動時に Erlang の
/// `ssl` と `inets` アプリケーションが起動している必要がある（2b の配線で担保する）。

import gleam/dynamic/decode
import gleam/http/request
import gleam/httpc
import gleam/int
import gleam/json
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/result

/// 署名検証に使う 1 つの RSA 公開鍵。kid で識別し、n / e（base64url）を保持する。
pub type Jwk {
  Jwk(kid: String, n: String, e: String)
}

/// JWKS の 1 要素を寛容にデコードする。
/// - RSA 以外（n/e を持たない）や暗号化用途（use = "enc"）の鍵は None にして後段で除外する。
/// - こうしないと realm に別種の鍵が 1 つでもあると list 全体のデコードが失敗してしまう。
fn key_decoder() -> decode.Decoder(Option(Jwk)) {
  use kid <- decode.field("kid", decode.string)
  use usage <- decode.optional_field("use", "sig", decode.string)
  use n <- decode.optional_field("n", "", decode.string)
  use e <- decode.optional_field("e", "", decode.string)
  case usage != "enc" && n != "" && e != "" {
    True -> decode.success(Some(Jwk(kid:, n:, e:)))
    False -> decode.success(None)
  }
}

fn jwks_decoder() -> decode.Decoder(List(Jwk)) {
  use keys <- decode.field("keys", decode.list(key_decoder()))
  decode.success(
    list.filter_map(keys, fn(k) {
      case k {
        Some(jwk) -> Ok(jwk)
        None -> Error(Nil)
      }
    }),
  )
}

/// JWKS 本文（JSON 文字列）を Jwk のリストへパースする。純粋関数（テストしやすい）。
pub fn parse_jwks(body: String) -> Result(List(Jwk), String) {
  json.parse(from: body, using: jwks_decoder())
  |> result.map_error(fn(_) { "JWKS parse failed" })
}

/// JWKS エンドポイントから鍵集合を取得する。副作用: HTTP GET。
/// 取得失敗・200 以外・パース失敗はすべて Error（= deny）。
pub fn fetch_jwks(jwks_url: String) -> Result(List(Jwk), String) {
  use req <- result.try(
    request.to(jwks_url)
    |> result.map_error(fn(_) { "invalid JWKS url" }),
  )

  use resp <- result.try(
    httpc.send(req)
    |> result.map_error(fn(_) { "JWKS fetch failed" }),
  )

  case resp.status {
    200 -> parse_jwks(resp.body)
    status -> Error("JWKS unexpected status: " <> int.to_string(status))
  }
}
