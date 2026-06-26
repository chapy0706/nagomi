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
      // user.id を Keycloak の sub（ユーザー UUID）に固定する。
      // これを明示しないと Auth.js が user.id をランダム生成し、token.sub が
      // ログインごとに変わってしまう。その結果 signIn コールバックが見る
      // profile.sub（安定・employees.auth_user_id と一致）と、session に載る
      // token.sub（ランダム）が食い違い、getSessionContext で employee が
      // 引けず /login ループになる。profile.sub に固定して両者を一致させる。
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.preferred_username ?? profile.name,
          email: profile.email,
        };
      },
    }),
  ],
  callbacks: {
    // セッションに sub（Keycloak ユーザー UUID）を載せる。
    // ここは JWT を decode するだけで DB に触れないため Edge でも安全。
    // token.sub は上の profile() により profile.sub（安定した Keycloak UUID）に
    // 一致する。employees.auth_user_id との照合に使う（ADR-010）。
    //
    // 注: access_token はあえて session に載せない。Keycloak の access_token は
    // 大きく、cookie が 4KB を超えてチャンク分割（.0/.1）され、過去 cookie との
    // 重複や復号失敗の温床になる。access_token が要るステップ8（nagomi-ws の
    // RS256 検証）では、cookie に詰めず別経路で取得する方針に切り替える。
    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
