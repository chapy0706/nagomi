/// WS 接続用トークン発行エンドポイント（案A-1）。
///
/// 認証済みユーザーに対し、Postgres 保管の refresh_token を使って Keアカウントから
/// 有効な access token を取得して返す。返すのは access token のみで、refresh_token は
/// 決してブラウザに出さない（サーバー側に留める）。
///
/// フェイルセーフ: 未認証・refresh_token 無し・refresh 失敗はすべて 401/502 で拒否。

import { NextResponse } from "next/server";
import {
  deleteRefreshToken,
  findRefreshToken,
  saveRefreshToken,
} from "@/src/infrastructure/keycloak/refreshTokenStore";
import { getAuthenticatedUserId } from "@/src/infrastructure/session";

/// 外部（Keアカウント）応答は unknown。指定キーが string ならその値を返す。
function readString(obj: unknown, key: string): string | undefined {
  if (typeof obj === "object" && obj !== null && key in obj) {
    const value = (obj as Record<string, unknown>)[key];
    return typeof value === "string" ? value : undefined;
  }
  return undefined;
}

export async function GET(): Promise<NextResponse> {
  const authUserId = await getAuthenticatedUserId();
  if (!authUserId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const refreshToken = await findRefreshToken(authUserId);
  if (!refreshToken) {
    // 保管が無い＝再ログインが必要。
    return NextResponse.json({ error: "no_refresh_token" }, { status: 401 });
  }

  const issuer = process.env.KEYCLOAK_ISSUER;
  const clientId = process.env.KEYCLOAK_CLIENT_ID;
  const clientSecret = process.env.KEYCLOAK_CLIENT_SECRET;
  if (!issuer || !clientId || !clientSecret) {
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  const form = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  let response: Response;
  try {
    response = await fetch(`${issuer}/protocol/openid-connect/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
      cache: "no-store",
    });
  } catch (error) {
    // ネットワーク等での失敗は握りつぶさず文脈を付けてログし、502 で拒否。
    console.error("[ws-token] token endpoint request failed", { authUserId }, error);
    return NextResponse.json({ error: "token_request_failed" }, { status: 502 });
  }

  if (!response.ok) {
    // refresh_token が失効・無効 → 保管を破棄して 401（再ログインを促す）。
    await deleteRefreshToken(authUserId);
    return NextResponse.json({ error: "refresh_failed" }, { status: 401 });
  }

  const data: unknown = await response.json();
  const accessToken = readString(data, "access_token");
  if (!accessToken) {
    return NextResponse.json({ error: "no_access_token" }, { status: 502 });
  }

  // refresh token rotation 対応: 新しい refresh_token が返れば保管を更新する。
  const rotatedRefreshToken = readString(data, "refresh_token");
  if (rotatedRefreshToken) {
    await saveRefreshToken(authUserId, rotatedRefreshToken);
  }

  // 返すのは access token のみ。refresh_token はブラウザに出さない。
  return NextResponse.json({ access_token: accessToken });
}
