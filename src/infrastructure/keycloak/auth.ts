/// サーバーサイド専用。Auth.js（next-auth v5）による Keycloak OIDC クライアント。
///
/// 認証プロバイダの切り替えは AUTH_PROVIDER で行うが、この設定自体は
/// AUTH_PROVIDER=keycloak のときだけ意味を持つ（route handler 経由でのみ動く）。
///
/// セッションには Keycloak の sub（ユーザー UUID）と access_token を載せる。
/// - sub: employees.auth_user_id との照合に使う（ADR-010）
/// - access_token: WebSocket 接続時に nagomi-ws へ渡し RS256 検証させる（ステップ8）
///
/// 必要な環境変数:
///   AUTH_SECRET            … セッション JWT の署名鍵（`openssl rand -base64 32`）
///   KEYCLOAK_ISSUER        … https://auth.chapy0706.com/realms/nagomi
///   KEYCLOAK_CLIENT_ID     … nagomi-web
///   KEYCLOAK_CLIENT_SECRET … nagomi-web の Client secret

import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Vercel 以外（Coolify / Traefik 配下）でホスト名を信頼するために必要。
  trustHost: true,
  providers: [
    Keycloak({
      issuer: process.env.KEYCLOAK_ISSUER,
      clientId: process.env.KEYCLOAK_CLIENT_ID,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    // 初回サインイン時、account から access_token を取り出してセッション JWT に保持する。
    async jwt({ token, account }) {
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    // クライアント/サーバから参照するセッションに sub と access_token を載せる。
    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      // token.accessToken は JWT 既定型では unknown のため runtime narrow する。
      session.accessToken = typeof token.accessToken === "string" ? token.accessToken : undefined;
      return session;
    },
  },
});
