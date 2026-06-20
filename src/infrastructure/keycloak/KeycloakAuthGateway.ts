/// サーバーサイド専用。AuthGateway の Keycloak（OIDC）実装。
///
/// OIDC ではパスワード照合をアプリが持たない。認証は Keycloak のログイン画面への
/// リダイレクトで成立し、結果は Auth.js のセッション（sub）として保持される。
/// そのため AuthGateway の各メソッドの解釈は Supabase 実装と異なる:
///   - getAuthUserId  … Auth.js セッションの sub（Keycloak ユーザー UUID）を返す
///   - signOut        … Auth.js のセッションを破棄する
///   - signIn         … OIDC ではアプリがパスワード照合しない → 適用外（throw）
///   - updatePassword … パスワードは Keycloak が管理する → 適用外（throw）
///
/// signIn / updatePassword は Keycloak モードでは呼ばれない設計（ログインは
/// リダイレクト、PIN 変更は Keycloak のアカウント管理側）。誤って呼ばれた場合は
/// 握りつぶさず例外で気づけるようにする。

import type { AuthGateway, AuthResult } from "@/src/domain/ports/AuthGateway";
import type { EmployeeId } from "@/src/domain/value-objects/EmployeeId";
import type { Pin } from "@/src/domain/value-objects/Pin";
import { auth, signOut } from "./auth";

export class KeycloakAuthGateway implements AuthGateway {
  async signIn(_employeeId: EmployeeId, _pin: string): Promise<AuthResult> {
    throw new Error(
      "KeycloakAuthGateway.signIn は使用しません。OIDC ログインは /api/auth/signin 経由のリダイレクトで行います。"
    );
  }

  async signOut(): Promise<void> {
    // 呼び出し側（logoutAction 等）が自前で redirect するため、ここでは遷移しない。
    await signOut({ redirect: false });
  }

  async getAuthUserId(): Promise<string | undefined> {
    const session = await auth();
    return session?.user?.id;
  }

  async updatePassword(_newPin: Pin): Promise<void> {
    throw new Error(
      "KeycloakAuthGateway.updatePassword は使用しません。パスワードは Keycloak のアカウント管理で変更します。"
    );
  }
}
