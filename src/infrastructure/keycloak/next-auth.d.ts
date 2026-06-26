/// Auth.js のセッション型を nagomi の用途に合わせて拡張する。
/// - session.user.id … Keycloak の sub（ユーザー UUID）
///
/// access_token は cookie 肥大化（チャンク分割・重複）回避のため session に載せない。
/// ステップ8（nagomi-ws の RS256 検証）で必要になったら別経路で取得する。

import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
