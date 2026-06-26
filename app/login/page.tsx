import { type AuthProvider, LoginForm } from "./LoginForm";

export const metadata = {
  title: "ログイン | nagomi",
};

// Auth.js は失敗時 pages.error（= /login）に ?error=CODE を付けて戻す。
// 握りつぶさず原因コードを表示し、Keycloak 連携の切り分けを可能にする。
// - Configuration: provider/issuer/secret の設定不備（env 未設定など）
// - OAuthSignin:   authorization URL 生成・discovery 取得の失敗（issuer 到達不可など）
// - AccessDenied:  signIn コールバックの拒否（employees 未登録 / 無効）
const ERROR_MESSAGES: Record<string, string> = {
  Configuration:
    "認証設定エラー（Configuration）。KEYCLOAK_ISSUER / CLIENT_ID / CLIENT_SECRET / AUTH_SECRET を確認してください。",
  OAuthSignin:
    "Keycloak への接続に失敗しました（OAuthSignin）。KEYCLOAK_ISSUER の到達性・値を確認してください。",
  OAuthCallbackError:
    "Keycloak からの応答処理に失敗しました（OAuthCallbackError）。redirect URI の一致を確認してください。",
  AccessDenied: "このアカウントは nagomi に登録されていません（AccessDenied）。",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const provider: AuthProvider = process.env.AUTH_PROVIDER === "keycloak" ? "keycloak" : "supabase";

  const { error } = await searchParams;
  const errorMessage = error
    ? (ERROR_MESSAGES[error] ?? `ログインに失敗しました（${error}）。`)
    : undefined;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-md">
        <h1 className="mb-6 text-center text-2xl font-semibold text-gray-900">nagomi</h1>
        {errorMessage && (
          <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        )}
        <LoginForm provider={provider} />
      </div>
    </main>
  );
}
