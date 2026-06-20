/// Auth.js の OIDC エンドポイント（/api/auth/*）。
/// Keycloak へのリダイレクト・コールバック（/api/auth/callback/keycloak）を捌く。

import { handlers } from "@/src/infrastructure/keycloak/auth";

export const { GET, POST } = handlers;
