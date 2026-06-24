/// Edge ランタイムでも安全な Auth.js 設定（DB・postgres を import しない）。
///
/// middleware は Edge ランタイムで動くため、ここには DB アクセスを含めない。
/// DB を触るコールバック（signIn の whitelist 照合・jwt の access_token 保持）は
/// auth.ts 側（Node ランタイムの route handler / server action から使う）に置く。
///
/// この分割は Auth.js v5 の推奨パターン（split config）に従う。

import type { NextAuthConfig } from "next-auth";
import Keycloak from "next-auth/providers/keycloak";

export const authConfig = {
  // Vercel 以外（Coolify / Traefik 配下）でホスト名を信頼するために必要。
  trustHost: true,
  // 認証画面・エラー時の遷移先を nagomi 側に寄せる。
  pages: { signIn: "/login", error: "/login" },
  providers: [
    Keycloak({
      issuer: process.env.KEYCLOAK_ISSUER,
      clientId: process.env.KEYCLOAK_CLIENT_ID,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    // セッションに sub（Keycloak ユーザー UUID）と access_token を載せる。
    // ここは JWT を decode するだけで DB に触れないため Edge でも安全。
    // - sub: employees.auth_user_id との照合に使う（ADR-010）
    // - access_token: WebSocket 接続時に nagomi-ws へ渡し RS256 検証させる（ステップ8）
    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      // token.accessToken は JWT 既定型では unknown のため runtime narrow する。
      session.accessToken = typeof token.accessToken === "string" ? token.accessToken : undefined;
      return session;
    },
  },
} satisfies NextAuthConfig;
