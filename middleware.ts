import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

// /login と OIDC エンドポイント（/api/auth/*）は未認証でも通す。
// /api/auth/callback/keycloak を弾くとログインが成立しないため必須。
const PUBLIC_PATHS = ["/login", "/api/auth"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Auth.js（Keycloak）のセッション Cookie の有無を見る。
// 重要: AUTH_PROVIDER などランタイム専用 env は Edge ランタイムの middleware に
// インライン化されず参照できない（NEXT_PUBLIC_* のみ Edge で読める）。
// そのため middleware では env での mode 分岐や JWE 復号・AUTH_SECRET に依存しない。
// セッション Cookie の存在のみを軽量に判定し、本当の検証（署名・is_active・
// employees 突き合わせ）は getSessionContext（Node・env 参照可・mode 対応）に委ねる。
// Auth.js はサイズ超過時に .0/.1 へ chunk するため prefix 一致で見る。
function hasAuthjsSession(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some(
      (c) =>
        c.name.startsWith("authjs.session-token") ||
        c.name.startsWith("__Secure-authjs.session-token")
    );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- TEMP: 認証ループ調査用の判断点ログ（原因特定後に削除する）。------------------
  // AUTH_DEBUG は Edge ランタイムで参照できない可能性があるため、ここでは env で
  // ゲートせず常時出力する。あわせて Edge から env / cookie がどう見えるかも観測する。
  // 秘匿情報を出さないため cookie は「名前のみ」を出す（値＝トークンは絶対に出さない）。
  const isPublic = isPublicPath(pathname);
  const hasSession = hasAuthjsSession(request);
  const authjsCookies = request.cookies
    .getAll()
    .map((c) => c.name)
    .filter((name) => name.includes("authjs"));
  console.log(
    "[middleware]",
    JSON.stringify({
      path: pathname,
      isPublic,
      hasAuthjsSession: hasSession,
      authjsCookieNames: authjsCookies,
      // Edge から見えるか（見えなければ null。層3の env 非インライン問題の確認用）
      envAuthProvider: process.env.AUTH_PROVIDER ?? null,
      envAuthDebug: process.env.AUTH_DEBUG ?? null,
    })
  );
  // --- /TEMP ---------------------------------------------------------------------

  if (isPublic) return NextResponse.next();

  // Keycloak モード: Auth.js セッション Cookie があれば通す（実検証は getSessionContext）。
  // env に依存せず Cookie だけで判定するため Edge ランタイムでも確実に動く。
  if (hasSession) {
    console.log("[middleware] decision=pass(keycloak-session)", pathname);
    return NextResponse.next();
  }

  // それ以外（Supabase モード・既定／切り戻し用、または未認証）は従来の Supabase 検証。
  // NEXT_PUBLIC_* はビルド時インライン化され Edge でも参照できる。
  console.log("[middleware] decision=fallthrough(supabase-check)", pathname);
  return supabaseMiddleware(request);
}

// Supabase モード（既定・切り戻し用）: 従来どおり Supabase Auth で検証する。
async function supabaseMiddleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  // getUser() はサーバーで JWT を検証する（getSession() はキャッシュを参照するため使わない）
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user) {
    if (isPublicPath(pathname)) return supabaseResponse;
    // TEMP: 認証ループ調査用（原因特定後に削除する）
    console.log("[middleware] decision=redirect(/login) reason=supabase-no-user", pathname);
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // is_active / is_admin チェック：RLS により自分のレコードのみ返る
  const { data: employee } = await supabase
    .from("employees")
    .select("is_active, is_admin")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (employee !== null && !employee.is_active) {
    await supabase.auth.signOut();
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/admin") && !employee?.is_admin) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    return NextResponse.redirect(homeUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
