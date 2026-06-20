import { type AuthProvider, LoginForm } from "./LoginForm";

export const metadata = {
  title: "ログイン | nagomi",
};

export default function LoginPage() {
  const provider: AuthProvider = process.env.AUTH_PROVIDER === "keycloak" ? "keycloak" : "supabase";

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-md">
        <h1 className="mb-6 text-center text-2xl font-semibold text-gray-900">nagomi</h1>
        <LoginForm provider={provider} />
      </div>
    </main>
  );
}
