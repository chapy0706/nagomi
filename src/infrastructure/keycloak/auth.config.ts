/// Edge ランタイムでも安全な Auth.js 設定（DB・postgres を import しない）。
///
/// middleware は Edge ランタイムで動くため、ここには DB アクセスを含めない。
/// DB を触るコールバック（signIn の whitelist 照合・jwt の access_token 保持）は
/// auth.ts 側（Node ランタイムの route handler / server action から使う）に置く。
///
/// この分割は Auth.js v5 の推奨パターン（split config）に従う。

import type { NextAuthConfig } from "next-auth";
import Keycloak from "next-auth/providers/keycloak";

/// リバースプロキシ（Cloudflare/Traefik）が手前で TLS 終端し、コンテナ内部は
/// HTTP で動く構成では、Auth.js が自分を HTTP と誤認する。すると Cookie の
/// set 時（コールバックは X-Forwarded-Proto=https で __Secure- 名）と
/// read 時（middleware は内部 HTTP を見て非 secure 名）で Cookie 名がズレ、
/// セッションを読めず /login にループする。
///
/// AUTH_URL を公開 HTTPS URL に固定し、それを基準に useSecureCookies を明示して
/// set/read の Cookie 名（__Secure- prefix）を必ず一致させる。
/// middleware と route handler はこの authConfig を共有するため両者が揃う。
/// ローカル開発（AUTH_URL 未設定 or http）では非 secure Cookie になり破綻しない。
const useSecureCookies = process.env.AUTH_URL?.startsWith("https://") ?? false;

export const authConfig = {
  // Vercel 以外（Coolify / Traefik 配下）でホスト名を信頼するために必要。
  // 環境変数 AUTH_TRUST_HOST=true と等価。X-Forwarded-Host/Proto を信頼する。
  trustHost: true,
  // 内部 HTTP 誤認に依存せず、AUTH_URL(https) を基準に Secure Cookie を強制する。
  useSecureCookies,
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
