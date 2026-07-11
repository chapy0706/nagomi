import type { NextConfig } from "next";

/// WebSocket 接続先（NEXT_PUBLIC_WS_URL）の origin を CSP connect-src 用に取り出す。
/// 例: wss://nagomi-ws.example.com/ws -> wss://nagomi-ws.example.com
/// 環境ごとにホストが変わるため、CSP にハードコードせず環境変数から組み立てる。
/// NEXT_PUBLIC_* はビルド時にインライン化されるため、ビルド時の値が使われる。
function wsOrigin(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_WS_URL;
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    return `${url.protocol}//${url.host}`;
  } catch {
    return undefined;
  }
}

function contentSecurityPolicy(): string {
  const connectSrc = [
    "'self'",
    // nagomi-ws（自前 WebSocket）。NEXT_PUBLIC_WS_URL の origin から動的に組み立てる。
    wsOrigin(),
    // Jitsi（ビデオ通話）
    "https://meet.jit.si",
    "wss://*.jit.si",
    "wss://*.jitsi.net",
    // Supabase（切り戻し用に残置。方針: Supabase を完全撤去したら削除する）
    "https://*.supabase.co",
    "wss://*.supabase.co",
  ].filter((source): source is string => Boolean(source));

  const imgSrc = [
    "'self'",
    "data:",
    "blob:",
    // アバター画像（dicebear）
    "https://api.dicebear.com",
    // Supabase Storage（切り戻し用に残置。方針: Supabase を完全撤去したら削除する）
    "https://*.supabase.co",
  ];

  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://meet.jit.si",
    "frame-src https://meet.jit.si",
    `connect-src ${connectSrc.join(" ")}`,
    "media-src 'self' blob:",
    "worker-src blob:",
    `img-src ${imgSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
  ].join("; ");
}

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy(),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
