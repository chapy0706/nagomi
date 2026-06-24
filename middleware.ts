import { createServerClient } from "@supabase/ssr";
import {
  type NextFetchEvent,
  type NextMiddleware,
  type NextRequest,
  NextResponse,
} from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/src/infrastructure/keycloak/auth.config";

// /login と OIDC エンドポイント（/api/auth/*）は未認証でも通す。
// /api/auth/callback/keycloak を弾くとログインが成立しないため必須。
const PUBLIC_PATHS = ["/login", "/api/auth"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Edge-safe な Auth.js インスタンス（DB を含まない authConfig のみ）。
// auth.ts（postgres を巻き込む）は middleware から import しない。
const { auth: keycloakAuth } = NextAuth(authConfig);

// Keycloak モード: Auth.js セッション（JWT cookie）の有無で通過/リダイレクトを決める。
// req.auth に decode 済みセッション（未ログインなら null）が入る。
// is_active / is_admin の DB 照合は Edge 不可のため getSessionContext・各ページ側に委ねる。
// keycloakAuth(handler) の戻り型は route handler 文脈（AppRouteHandlerFnContext）を
// 想定した型になっており、middleware の (request, NextFetchEvent) と合わない。
// 実行時は middleware として正しく動くため、NextMiddleware へ明示キャストする。
const keycloakHandler = keycloakAuth((req) => {
  const { pathname } = req.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();
  if (req.auth) return NextResponse.next();
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  return NextResponse.redirect(loginUrl);
}) as unknown as NextMiddleware;

export function middleware(request: NextRequest, event: NextFetchEvent) {
  if (process.env.AUTH_PROVIDER === "keycloak") {
    return keycloakHandler(request, event);
  }
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
