/// サーバーサイド（Node ランタイム）専用。Auth.js（next-auth v5）の本体設定。
///
/// Edge-safe な authConfig（auth.config.ts）を継承し、DB を触るコールバックを足す。
/// この auth.ts は route handler（/api/auth/*）・server action・RSC から使う。
/// middleware（Edge）からは import しない（postgres を巻き込むため）。
///
/// 必要な環境変数:
///   AUTH_SECRET            … セッション JWT の署名鍵（`openssl rand -base64 32`）
///   KEYCLOAK_ISSUER        … https://auth.chapy0706.com/realms/nagomi
///   KEYCLOAK_CLIENT_ID     … nagomi-web
///   KEYCLOAK_CLIENT_SECRET … nagomi-web の Client secret

import NextAuth from "next-auth";
import { createEmployeeRepository } from "@/src/infrastructure/repositoryFactory";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,

    // ホワイトリスト照合（ADR-010）。Keycloak の sub と employees.auth_user_id を
    // 突き合わせ、在籍かつ is_active な社員のみサインインを許可する。
    // ここは route handler（/api/auth/callback/keycloak）の Node 文脈で動くため
    // DB アクセス可。false を返すと session を張らず /login?error=... へ遷移する
    // （RSC で signOut する必要がない＝Cookie 変更エラーを避けられる）。
    async signIn({ profile }) {
      const sub = typeof profile?.sub === "string" ? profile.sub : undefined;
      if (!sub) return false;
      try {
        const employee = await createEmployeeRepository().findByAuthUserId(sub);
        return Boolean(employee?.isActive);
      } catch {
        // DB 照合に失敗した場合は安全側（deny）に倒す。
        return false;
      }
    },

    // 初回サインイン時、account から access_token を取り出してセッション JWT に保持する。
    async jwt({ token, account }) {
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }
      return token;
    },
  },
});
