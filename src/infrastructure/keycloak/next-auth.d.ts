/// Auth.js のセッション/JWT 型を nagomi の用途に合わせて拡張する。
/// - session.user.id   … Keycloak の sub（ユーザー UUID）
/// - session.accessToken … Keycloak access token（nagomi-ws の RS256 検証用）

import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
    accessToken?: string;
  }
}
