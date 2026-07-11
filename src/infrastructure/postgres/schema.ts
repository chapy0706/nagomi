import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// -----------------------------------------------
// employees
// ホワイトリスト本体。auth_user_id は Supabase Auth 側の UUID のみ保持し、
// A1 Postgres では auth.users への FK は設けない（Auth は Supabase に残るため）。
// -----------------------------------------------
export const employees = pgTable(
  "employees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    employeeId: text("employee_id").unique().notNull(),
    authUserId: uuid("auth_user_id").unique(),
    displayName: text("display_name").notNull(),
    avatarUrl: text("avatar_url"),
    isActive: boolean("is_active").notNull().default(true),
    isAdmin: boolean("is_admin").notNull().default(false),
    consentAcceptedAt: timestamp("consent_accepted_at", { withTimezone: true }),
    tutorialCompletedAt: timestamp("tutorial_completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("employees_employee_id_format", sql`${t.employeeId} ~ '^[0-9]{9}$'`)]
);

// -----------------------------------------------
// attendance_logs（追記のみ。logged_out_at 確定更新のみ例外）
// -----------------------------------------------
export const attendanceLogs = pgTable(
  "attendance_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    employeeAuthId: uuid("employee_auth_id").notNull(),
    loggedInAt: timestamp("logged_in_at", { withTimezone: true }).notNull().defaultNow(),
    loggedOutAt: timestamp("logged_out_at", { withTimezone: true }),
    source: text("source").notNull(),
  },
  (t) => [check("attendance_logs_source_values", sql`${t.source} IN ('explicit', 'inferred')`)]
);

// -----------------------------------------------
// call_participation_logs（追記のみ。left_at 確定更新のみ例外）
// -----------------------------------------------
export const callParticipationLogs = pgTable(
  "call_participation_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    employeeAuthId: uuid("employee_auth_id").notNull(),
    roomId: text("room_id").notNull(),
    topic: text("topic"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    leftAt: timestamp("left_at", { withTimezone: true }),
  },
  (t) => [
    check(
      "call_participation_logs_topic_values",
      sql`${t.topic} IS NULL OR ${t.topic} IN ('counseling', 'casual', 'meeting')`
    ),
  ]
);

// -----------------------------------------------
// reports（通報者IDを構造的に保存しない。追記のみ）
// reported_employee_id は同一DB内の employees を参照する。
// -----------------------------------------------
export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reportedEmployeeId: uuid("reported_employee_id")
      .notNull()
      .references(() => employees.id),
    category: text("category").notNull().default("other"),
    content: text("content").notNull(),
    context: jsonb("context"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      "reports_category_values",
      sql`${t.category} IN ('harassment', 'inappropriate_speech', 'rule_violation', 'other')`
    ),
  ]
);

// -----------------------------------------------
// satisfaction_responses（employee_id を持たない匿名テーブル。追記のみ）
// rating は session アンケートのみ使用。nps_score は NPS アンケートのみ使用。
// Supabase 版の rating NOT NULL 制約はここでは nullable に緩和
//（NPS アンケートでは rating が null になるため）。
// -----------------------------------------------
export const satisfactionResponses = pgTable(
  "satisfaction_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    surveyType: text("survey_type").notNull().default("session"),
    rating: integer("rating"),
    npsScore: integer("nps_score"),
    comment: text("comment"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("satisfaction_responses_survey_type_values", sql`${t.surveyType} IN ('session', 'nps')`),
    check(
      "satisfaction_responses_rating_range",
      sql`${t.rating} IS NULL OR (${t.rating} BETWEEN 1 AND 5)`
    ),
    check(
      "satisfaction_responses_nps_score_range",
      sql`${t.npsScore} IS NULL OR (${t.npsScore} BETWEEN 0 AND 10)`
    ),
  ]
);

// -----------------------------------------------
// call_invitations
// status 列の終了確定更新（accepted/declined/expired）のみ例外的に UPDATE を許容。
// -----------------------------------------------
export const callInvitations = pgTable(
  "call_invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    inviterAuthId: uuid("inviter_auth_id").notNull(),
    inviterDisplayName: text("inviter_display_name").notNull(),
    inviterAvatarUrl: text("inviter_avatar_url"),
    inviteeAuthId: uuid("invitee_auth_id").notNull(),
    topic: text("topic"),
    status: text("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      "call_invitations_topic_values",
      sql`${t.topic} IS NULL OR ${t.topic} IN ('counseling', 'casual', 'meeting')`
    ),
    check(
      "call_invitations_status_values",
      sql`${t.status} IN ('pending', 'accepted', 'declined', 'expired')`
    ),
  ]
);

// -----------------------------------------------
// block_relations
// ブロック解除に伴う DELETE を許容する（ログ系テーブルではない状態テーブル）。
// -----------------------------------------------
export const blockRelations = pgTable(
  "block_relations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    blockerAuthId: uuid("blocker_auth_id").notNull(),
    blockedAuthId: uuid("blocked_auth_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("block_relations_unique").on(t.blockerAuthId, t.blockedAuthId),
    check("block_relations_no_self", sql`${t.blockerAuthId} <> ${t.blockedAuthId}`),
  ]
);

// -----------------------------------------------
// deletion_audit_logs
// ログ削除バッチの実行記録。個人特定情報を含まない。
// -----------------------------------------------
export const deletionAuditLogs = pgTable("deletion_audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  executedAt: timestamp("executed_at", { withTimezone: true }).notNull().defaultNow(),
  tableName: text("table_name").notNull(),
  deletedCount: integer("deleted_count").notNull(),
  retentionMonths: integer("retention_months").notNull(),
});

// -----------------------------------------------
// keycloak_refresh_tokens（サーバー側限定・状態テーブル）
// 案A-1: nagomi-ws の WS 接続用 access token を必要時に取得するため、
// Keycloak の refresh_token を保管する。cookie / session JWT には載せない
// （4KB 問題と漏洩面の回避）。access_token は保持しない（都度 refresh で取得）。
// ログ系ではない状態テーブルのため UPDATE / DELETE を許容する
// （後ログイン勝ちの upsert・ログアウト時の削除）。
// -----------------------------------------------
export const keycloakRefreshTokens = pgTable("keycloak_refresh_tokens", {
  authUserId: uuid("auth_user_id").primaryKey(),
  refreshToken: text("refresh_token").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// -----------------------------------------------
// presence_sessions（追記のみ。disconnected_at 確定更新のみ例外）
// WebSocket 接続の技術的事実（フロア在室ウィンドウ）を記録する。
// 業務的勤怠 attendance_logs とは関心が異なるため分離する
//（短い切断・再接続を勤怠と混同しないため）。
// connection_id は nagomi-ws の接続 ID。開始/終了イベントの突合に使う。
// -----------------------------------------------
export const presenceSessions = pgTable(
  "presence_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    employeeAuthId: uuid("employee_auth_id").notNull(),
    connectionId: text("connection_id").notNull(),
    connectedAt: timestamp("connected_at", { withTimezone: true }).notNull().defaultNow(),
    disconnectedAt: timestamp("disconnected_at", { withTimezone: true }),
  },
  (t) => [index("presence_sessions_connection_id_idx").on(t.connectionId)]
);
