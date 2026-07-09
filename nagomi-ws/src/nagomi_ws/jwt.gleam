/// JWT 検証モジュール
///
/// Keアカウント（Keycloak）が発行する JWT（RS256 = RSA-SHA256）を検証し、
/// sub クレームから auth_user_id を取り出す。
///
/// 実装方針:
///   1. JWT を header.payload.signature の 3 部分に分割
///   2. header の kid で公開鍵（JWKS）を引く（呼び出し側で解決）
///   3. crypto:verify(rsa, sha256, "header.payload", sig, [e, n]) で署名検証
///   4. ペイロードから sub を取り出す
///
/// 署名検証は Erlang の :crypto モジュールを FFI 経由で呼ぶ。
/// extract_without_verify は WS_AUTH_DISABLED 経路専用（署名を検証しない）。

import gleam/bit_array
import gleam/dynamic/decode
import gleam/erlang/atom
import gleam/json
import gleam/list
import gleam/result
import gleam/string
import nagomi_ws/jwks.{type Jwk}

// ---------------------------------------------------------------------------
// Base64URL デコード
// ---------------------------------------------------------------------------

fn base64url_decode(input: String) -> Result(BitArray, Nil) {
  // base64url: - → +、_ → /、パディング補完
  let standard =
    input
    |> string.replace(each: "-", with: "+")
    |> string.replace(each: "_", with: "/")

  let padding_needed = case string.length(standard) % 4 {
    0 -> ""
    2 -> "=="
    3 -> "="
    _ -> ""
  }

  bit_array.base64_decode(standard <> padding_needed)
}

// ---------------------------------------------------------------------------
// JWT ペイロード解析
// ---------------------------------------------------------------------------

fn extract_sub(payload_b64: String) -> Result(String, String) {
  use payload_bits <- result.try(
    base64url_decode(payload_b64)
    |> result.map_error(fn(_) { "base64url decode failed" }),
  )
  use payload_str <- result.try(
    bit_array.to_string(payload_bits)
    |> result.map_error(fn(_) { "payload is not valid UTF-8" }),
  )
  json.parse(from: payload_str, using: {
    use s <- decode.field("sub", decode.string)
    decode.success(s)
  })
  |> result.map_error(fn(_) { "sub claim not found" })
}

// ---------------------------------------------------------------------------
// 公開 API
// ---------------------------------------------------------------------------

/// WS_AUTH_DISABLED 経路専用: 署名検証をスキップして sub だけ取り出す。
/// 本番では使わないこと（router が WS_AUTH_DISABLED=true のときだけ呼ぶ）。
pub fn extract_without_verify(token: String) -> Result(String, String) {
  case string.split(token, ".") {
    [_, payload_b64, _] -> extract_sub(payload_b64)
    _ -> Error("invalid JWT format")
  }
}

// ---------------------------------------------------------------------------
// RS256（RSA-SHA256）署名検証 — Keアカウント発行 JWT 用
// ---------------------------------------------------------------------------

/// JWT header の一部（署名検証前に kid で公開鍵を引くために使う）。
pub type Header {
  Header(alg: String, kid: String)
}

/// header を base64url デコードして alg / kid を取り出す。
fn parse_header(header_b64: String) -> Result(Header, String) {
  use bits <- result.try(
    base64url_decode(header_b64)
    |> result.map_error(fn(_) { "header decode failed" }),
  )
  use str <- result.try(
    bit_array.to_string(bits)
    |> result.map_error(fn(_) { "header not utf-8" }),
  )
  json.parse(from: str, using: {
    use alg <- decode.field("alg", decode.string)
    use kid <- decode.field("kid", decode.string)
    decode.success(Header(alg: alg, kid: kid))
  })
  |> result.map_error(fn(_) { "header alg/kid missing" })
}

/// JWT の header から alg / kid を取り出す（router が kid で鍵を引くため）。
pub fn peek_header(token: String) -> Result(Header, String) {
  case string.split(token, ".") {
    [header_b64, _, _] -> parse_header(header_b64)
    _ -> Error("invalid JWT format")
  }
}

// FFI: RSA 署名検証。crypto:verify(rsa, sha256, Msg, Sig, [E, N]) は
// PKCS#1 v1.5（= RS256）で検証し boolean を返す。
// key = [E, N]（公開指数・法、いずれも big-endian 符号なしバイナリ）。
@external(erlang, "crypto", "verify")
fn erlang_crypto_verify(
  algorithm: atom.Atom,
  digest_type: atom.Atom,
  message: BitArray,
  signature: BitArray,
  key: List(BitArray),
) -> Bool

// ---------------------------------------------------------------------------
// クレーム検証（iss / azp / aud / exp）
// ---------------------------------------------------------------------------

/// クレーム検証の期待値。router が env から組み立てて渡す（jwt を env 非依存に保つ）。
pub type ClaimExpectations {
  ClaimExpectations(issuer: String, expected_azp: String, expected_aud: String)
}

/// 検証対象のクレーム。aud は文字列 or 配列のどちらでも来るためリストに正規化する。
type Claims {
  Claims(sub: String, iss: String, azp: String, aud: List(String), exp: Int)
}

// FFI: 現在時刻（Unix 秒）。exp 検証に使う（Clock を直接持たず OTP に委ねる）。
@external(erlang, "erlang", "system_time")
fn erlang_system_time(unit: atom.Atom) -> Int

fn now_seconds() -> Int {
  erlang_system_time(atom.create("second"))
}

/// aud は仕様上「文字列」または「文字列配列」。どちらでも List(String) に正規化する。
fn aud_decoder() -> decode.Decoder(List(String)) {
  decode.one_of(decode.list(decode.string), or: [
    decode.map(decode.string, fn(single) { [single] }),
  ])
}

fn claims_decoder() -> decode.Decoder(Claims) {
  use sub <- decode.field("sub", decode.string)
  use iss <- decode.field("iss", decode.string)
  // azp が無いトークンは主関門を満たせない（"" は期待値と一致しない）＝ deny。
  use azp <- decode.optional_field("azp", "", decode.string)
  use aud <- decode.field("aud", aud_decoder())
  use exp <- decode.field("exp", decode.int)
  decode.success(Claims(sub: sub, iss: iss, azp: azp, aud: aud, exp: exp))
}

fn parse_claims(payload_b64: String) -> Result(Claims, String) {
  use bits <- result.try(
    base64url_decode(payload_b64)
    |> result.map_error(fn(_) { "payload decode failed" }),
  )
  use str <- result.try(
    bit_array.to_string(bits)
    |> result.map_error(fn(_) { "payload not utf-8" }),
  )
  json.parse(from: str, using: claims_decoder())
  |> result.map_error(fn(_) { "claims parse failed" })
}

fn ensure(condition: Bool, error: String) -> Result(Nil, String) {
  case condition {
    True -> Ok(Nil)
    False -> Error(error)
  }
}

/// 署名検証の後に呼ぶ。iss / azp / aud / exp を順に検査し、通れば sub を返す。
/// azp を主関門にする（= 本当に nagomi-web が取得したトークンか）。
fn verify_claims(
  payload_b64: String,
  expectations: ClaimExpectations,
) -> Result(String, String) {
  use claims <- result.try(parse_claims(payload_b64))
  use _ <- result.try(ensure(claims.iss == expectations.issuer, "iss mismatch"))
  use _ <- result.try(ensure(
    claims.azp == expectations.expected_azp,
    "azp mismatch",
  ))
  use _ <- result.try(ensure(
    list.contains(claims.aud, expectations.expected_aud),
    "aud missing expected",
  ))
  use _ <- result.try(ensure(claims.exp > now_seconds(), "token expired"))
  Ok(claims.sub)
}

/// 与えられた公開鍵（jwk: n/e）で RS256 署名を検証し、クレーム検証の後 sub を返す。
///
/// - alg == "RS256" を厳格チェック（none / HS256 混同攻撃対策）。
/// - 署名検証 → iss / azp / aud / exp 検証。1 つでも不正なら Error（呼び出し側は deny）。
/// - Error 文字列に「どこで落ちたか」を含める（router が gated debug で出す）。
pub fn verify_rs256(
  token: String,
  jwk: Jwk,
  expectations: ClaimExpectations,
) -> Result(String, String) {
  case string.split(token, ".") {
    [header_b64, payload_b64, sig_b64] -> {
      use header <- result.try(parse_header(header_b64))

      // アルゴリズム混同攻撃対策: RS256 以外は無条件で拒否する。
      use _ <- result.try(case header.alg {
        "RS256" -> Ok(Nil)
        other -> Error("unexpected alg: " <> other)
      })

      use n <- result.try(
        base64url_decode(jwk.n)
        |> result.map_error(fn(_) { "jwk n decode failed" }),
      )
      use e <- result.try(
        base64url_decode(jwk.e)
        |> result.map_error(fn(_) { "jwk e decode failed" }),
      )
      use sig <- result.try(
        base64url_decode(sig_b64)
        |> result.map_error(fn(_) { "signature decode failed" }),
      )

      let signing_input =
        bit_array.from_string(header_b64 <> "." <> payload_b64)

      case
        erlang_crypto_verify(
          atom.create("rsa"),
          atom.create("sha256"),
          signing_input,
          sig,
          [e, n],
        )
      {
        True -> verify_claims(payload_b64, expectations)
        False -> Error("invalid signature")
      }
    }
    _ -> Error("invalid JWT format")
  }
}
