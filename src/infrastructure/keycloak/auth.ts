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
import { deleteRefreshToken, saveRefreshToken } from "./refreshTokenStore";

// TEMP: セッション持続調査用（原因特定後に削除する）。
// プロセス起動ごとに一意。複数コンテナにロードバランスされているか
// （= AUTH_SECRET 不一致で cookie が復号できず破棄される疑い）を可視化する。
const INSTANCE_ID = Math.random().toString(36).slice(2, 8);

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

    // Keycloak の安定 sub をカスタムクレーム keycloakSub として JWT に固定する。
    // Auth.js は token.sub にランダム値を入れてしまい（provider の profile() で id を
    // 指定しても token.sub には反映されない）、ログインごとに値が変わる。その結果
    // signIn が照合する profile.sub（安定・employees.auth_user_id と一致）と session
    // に載る id が食い違い /login ループになる。カスタムクレームは Auth.js が触らない
    // ため、ここに profile.sub を保存して session 側でこれを読む（auth.config.ts）。
    // profile は初回サインイン時のみ存在し、以降は JWT 内の keycloakSub が保持される。
    //
    // 案A-1: 初回サインイン時のみ account が渡る。Keycloak の refresh_token を
    // Postgres に保管し、WS 接続用 access token を後で refresh から取得できるように
    // する。access_token / refresh_token は cookie（JWT）には載せない。
    async jwt({ token, profile, account }) {
      if (profile && typeof profile.sub === "string") {
        token.keycloakSub = profile.sub;
      }
      if (account?.refresh_token && typeof token.keycloakSub === "string") {
        await saveRefreshToken(token.keycloakSub, account.refresh_token);
      }
      // TEMP: セッション持続調査（原因特定後に削除）。値は出さず有無だけ。
      // account/profile 無し かつ keycloakSubPresent=false の「新規トークン」が
      // セッション途中で現れたら = 前の cookie を復号できていない（AUTH_SECRET 不一致）。
      console.log(
        "[auth.jwt]",
        JSON.stringify({
          instance: INSTANCE_ID,
          hasAccount: Boolean(account),
          hasProfile: Boolean(profile),
          keycloakSubPresent: typeof token.keycloakSub === "string",
          tokenKeys: Object.keys(token),
        })
      );
      return token;
    },
  },
  events: {
    // ログアウト時に保管済み refresh_token を破棄する（漏洩面の最小化）。
    // JWT 戦略では signOut イベントに { token } が渡る。
    async signOut(message) {
      const token = "token" in message ? message.token : undefined;
      const sub = token && typeof token.keycloakSub === "string" ? token.keycloakSub : undefined;
      if (sub) await deleteRefreshToken(sub);
    },
  },
});
