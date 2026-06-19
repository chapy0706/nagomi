import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://meet.jit.si",
              "frame-src https://meet.jit.si",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://meet.jit.si wss://*.jit.si wss://*.jitsi.net",
              "media-src 'self' blob:",
              "worker-src blob:",
              "img-src 'self' data: blob: https://*.supabase.co",
              "style-src 'self' 'unsafe-inline'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
