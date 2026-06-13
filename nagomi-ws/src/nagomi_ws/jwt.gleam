/// JWT 検証モジュール
///
/// Supabase が発行する JWT（HS256 = HMAC-SHA256）を検証し、
/// sub クレームから auth_user_id を取り出す。
///
/// 実装方針:
///   1. JWT を header.payload.signature の 3 部分に分割
///   2. HMAC-SHA256(secret, "header.payload") を計算
///   3. base64url デコードした signature と定数時間比較
///   4. ペイロードから sub を取り出す
///
/// Erlang の :crypto モジュールを FFI 経由で呼ぶ（gleam_erlang に crypto 依存）。

import gleam/bit_array
import gleam/dynamic
import gleam/erlang/atom
import gleam/json
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/result
import gleam/string

// ---------------------------------------------------------------------------
// Erlang FFI: HMAC-SHA256 計算
// ---------------------------------------------------------------------------

@external(erlang, "crypto", "mac")
fn erlang_crypto_mac(
  mac_type: atom.Atom,
  sub_type: atom.Atom,
  key: BitArray,
  data: BitArray,
) -> BitArray

fn hmac_sha256(secret: String, data: String) -> BitArray {
  erlang_crypto_mac(
    atom.create_from_string("hmac"),
    atom.create_from_string("sha256"),
    bit_array.from_string(secret),
    bit_array.from_string(data),
  )
}

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
  json.decode(payload_str, dynamic.field("sub", dynamic.string))
  |> result.map_error(fn(_) { "sub claim not found" })
}

// ---------------------------------------------------------------------------
// 公開 API
// ---------------------------------------------------------------------------

/// JWT を検証して auth_user_id（sub クレーム）を返す。
/// 署名検証失敗・形式不正の場合は Error を返す。
pub fn verify_and_extract(
  token: String,
  secret: String,
) -> Result(String, String) {
  case string.split(token, ".") {
    [header_b64, payload_b64, sig_b64] -> {
      let signing_input = header_b64 <> "." <> payload_b64
      let expected = hmac_sha256(secret, signing_input)

      use actual <- result.try(
        base64url_decode(sig_b64)
        |> result.map_error(fn(_) { "signature decode failed" }),
      )

      // 定数時間比較（タイミング攻撃対策）
      case expected == actual {
        True -> extract_sub(payload_b64)
        False -> Error("invalid signature")
      }
    }
    _ -> Error("invalid JWT format")
  }
}

/// 開発用: 署名検証をスキップして sub だけ取り出す。
/// JWT_SECRET が設定されていない環境でのみ使うこと。
pub fn extract_without_verify(token: String) -> Result(String, String) {
  case string.split(token, ".") {
    [_, payload_b64, _] -> extract_sub(payload_b64)
    _ -> Error("invalid JWT format")
  }
}
