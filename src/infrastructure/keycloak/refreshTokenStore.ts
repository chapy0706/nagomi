/// サーバーサイド専用。Keycloak の refresh_token を Postgres に保管する。
///
/// 案A-1 の土台: nagomi-ws の WS 接続用 access token は session/cookie に
/// 載せず、必要時に refresh_token から取得する。その refresh_token をここで
/// 状態として保持する（1 ユーザー 1 行・後ログイン勝ち）。
///
/// 絶対に守ること:
///   - refresh_token はブラウザに出さない（この関数群はサーバー側からのみ呼ぶ）
///   - access_token は保持しない（都度 refresh から取得する）

import { eq, sql } from "drizzle-orm";
import { getDb } from "@/src/infrastructure/postgres/client";
import { keycloakRefreshTokens } from "@/src/infrastructure/postgres/schema";

/// refresh_token を保存する（既存があれば置換）。副作用: DB 書き込み。
export async function saveRefreshToken(authUserId: string, refreshToken: string): Promise<void> {
  await getDb()
    .insert(keycloakRefreshTokens)
    .values({ authUserId, refreshToken })
    .onConflictDoUpdate({
      target: keycloakRefreshTokens.authUserId,
      set: { refreshToken, updatedAt: sql`now()` },
    });
}

/// 保管中の refresh_token を取得する。無ければ undefined。
export async function findRefreshToken(authUserId: string): Promise<string | undefined> {
  const rows = await getDb()
    .select({ refreshToken: keycloakRefreshTokens.refreshToken })
    .from(keycloakRefreshTokens)
    .where(eq(keycloakRefreshTokens.authUserId, authUserId))
    .limit(1);
  return rows[0]?.refreshToken;
}

/// refresh_token を破棄する（ログアウト・refresh 失敗時）。副作用: DB 削除。
export async function deleteRefreshToken(authUserId: string): Promise<void> {
  await getDb()
    .delete(keycloakRefreshTokens)
    .where(eq(keycloakRefreshTokens.authUserId, authUserId));
}
