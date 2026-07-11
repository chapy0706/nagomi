/// サーバーサイド専用。クライアントコンポーネントからインポートしない。
///
/// DATA_PROVIDER=a1  → Postgres (Drizzle) + MinIO
/// DATA_PROVIDER=supabase (デフォルト) → 既存 Supabase 実装
///
/// AUTH_PROVIDER=keycloak → Keycloak (Auth.js / OIDC)
/// AUTH_PROVIDER=supabase (デフォルト) → 既存 Supabase Auth
///
/// 切り替えはこのファイルだけ。Domain / Application 層は触らない。

import type { AttendanceRepository } from "@/src/domain/ports/AttendanceRepository";
import type { AuthGateway } from "@/src/domain/ports/AuthGateway";
import type { BlockRepository } from "@/src/domain/ports/BlockRepository";
import type { CallInvitationRepository } from "@/src/domain/ports/CallInvitationRepository";
import type { CallParticipationRepository } from "@/src/domain/ports/CallParticipationRepository";
import type { EmployeeRepository } from "@/src/domain/ports/EmployeeRepository";
import type { PresenceSessionRepository } from "@/src/domain/ports/PresenceSessionRepository";
import type { ReportGateway } from "@/src/domain/ports/ReportGateway";
import type { SatisfactionResponseGateway } from "@/src/domain/ports/SatisfactionResponseGateway";
import type { StorageGateway } from "@/src/domain/ports/StorageGateway";
import { KeycloakAuthGateway } from "./keycloak/KeycloakAuthGateway";
import { MinioStorageGateway } from "./minio/MinioStorageGateway";
import { getDb } from "./postgres/client";
import { PostgresAttendanceRepository } from "./postgres/PostgresAttendanceRepository";
import { PostgresBlockRepository } from "./postgres/PostgresBlockRepository";
import { PostgresCallInvitationRepository } from "./postgres/PostgresCallInvitationRepository";
import { PostgresCallParticipationRepository } from "./postgres/PostgresCallParticipationRepository";
import { PostgresEmployeeRepository } from "./postgres/PostgresEmployeeRepository";
import { PostgresPresenceSessionRepository } from "./postgres/PostgresPresenceSessionRepository";
import { PostgresReportGateway } from "./postgres/PostgresReportGateway";
import { PostgresSatisfactionResponseGateway } from "./postgres/PostgresSatisfactionResponseGateway";
import { createSupabaseAdminClient } from "./supabase/adminClient";
import { SupabaseAttendanceRepository } from "./supabase/SupabaseAttendanceRepository";
import { SupabaseAuthGateway } from "./supabase/SupabaseAuthGateway";
import { SupabaseBlockRepository } from "./supabase/SupabaseBlockRepository";
import { SupabaseCallInvitationRepository } from "./supabase/SupabaseCallInvitationRepository";
import { SupabaseCallParticipationRepository } from "./supabase/SupabaseCallParticipationRepository";
import { SupabaseEmployeeRepository } from "./supabase/SupabaseEmployeeRepository";
import { SupabaseReportGateway } from "./supabase/SupabaseReportGateway";
import { SupabaseSatisfactionResponseGateway } from "./supabase/SupabaseSatisfactionResponseGateway";
import { SupabaseStorageGateway } from "./supabase/SupabaseStorageGateway";
import { createSupabaseServerClient } from "./supabase/serverClient";

function isA1(): boolean {
  return process.env.DATA_PROVIDER === "a1";
}

function isKeycloak(): boolean {
  return process.env.AUTH_PROVIDER === "keycloak";
}

/// AUTH_PROVIDER=keycloak かどうか。Node 文脈（RSC / server action）でのみ正しく読める
/// （Edge ランタイムの middleware では参照不可）。UI 分岐（PIN ステップのスキップ等）に使う。
export function isKeycloakAuthProvider(): boolean {
  return isKeycloak();
}

/// 認証ゲートウェイ。AUTH_PROVIDER で Keycloak / Supabase を切り替える。
/// Supabase 実装はリクエストスコープのサーバクライアントを必要とするため async。
export async function createAuthGateway(): Promise<AuthGateway> {
  if (isKeycloak()) return new KeycloakAuthGateway();
  const client = await createSupabaseServerClient();
  return new SupabaseAuthGateway(client);
}

export function createEmployeeRepository(): EmployeeRepository {
  if (isA1()) return new PostgresEmployeeRepository(getDb());
  return new SupabaseEmployeeRepository(createSupabaseAdminClient());
}

export function createAttendanceRepository(): AttendanceRepository {
  if (isA1()) return new PostgresAttendanceRepository(getDb());
  return new SupabaseAttendanceRepository(createSupabaseAdminClient());
}

export function createCallParticipationRepository(): CallParticipationRepository {
  if (isA1()) return new PostgresCallParticipationRepository(getDb());
  return new SupabaseCallParticipationRepository(createSupabaseAdminClient());
}

export function createCallInvitationRepository(): CallInvitationRepository {
  if (isA1()) return new PostgresCallInvitationRepository(getDb());
  return new SupabaseCallInvitationRepository(createSupabaseAdminClient());
}

export function createBlockRepository(): BlockRepository {
  if (isA1()) return new PostgresBlockRepository(getDb());
  return new SupabaseBlockRepository(createSupabaseAdminClient());
}

/// presence_sessions は a1(Postgres) 専用（Keアカウント/nagomi-ws 経路でのみ使う）。
/// Supabase 実装は持たない。
export function createPresenceSessionRepository(): PresenceSessionRepository {
  return new PostgresPresenceSessionRepository(getDb());
}

export function createReportGateway(): ReportGateway {
  if (isA1()) return new PostgresReportGateway(getDb());
  return new SupabaseReportGateway(createSupabaseAdminClient());
}

export function createSatisfactionResponseGateway(): SatisfactionResponseGateway {
  if (isA1()) return new PostgresSatisfactionResponseGateway(getDb());
  return new SupabaseSatisfactionResponseGateway(createSupabaseAdminClient());
}

export async function createStorageGateway(): Promise<StorageGateway> {
  if (isA1()) return new MinioStorageGateway();
  const client = await createSupabaseServerClient();
  return new SupabaseStorageGateway(client);
}
