import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const employees = pgTable("employees", {
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
});

export const attendanceLogs = pgTable("attendance_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  employeeAuthId: uuid("employee_auth_id").notNull(),
  loggedInAt: timestamp("logged_in_at", { withTimezone: true }).notNull().defaultNow(),
  loggedOutAt: timestamp("logged_out_at", { withTimezone: true }),
  source: text("source").notNull(), // 'explicit' | 'inferred'
});

export const callParticipationLogs = pgTable("call_participation_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  employeeAuthId: uuid("employee_auth_id").notNull(),
  roomId: text("room_id").notNull(),
  topic: text("topic"), // 'counseling' | 'casual' | 'meeting'
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  leftAt: timestamp("left_at", { withTimezone: true }),
});

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  reportedEmployeeId: uuid("reported_employee_id").notNull(),
  category: text("category").notNull().default("other"),
  content: text("content").notNull(),
  context: jsonb("context"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const satisfactionResponses = pgTable("satisfaction_responses", {
  id: uuid("id").primaryKey().defaultRandom(),
  surveyType: text("survey_type").notNull().default("session"), // 'session' | 'nps'
  rating: integer("rating"),
  npsScore: integer("nps_score"),
  comment: text("comment"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
});

export const callInvitations = pgTable("call_invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  inviterAuthId: uuid("inviter_auth_id").notNull(),
  inviterDisplayName: text("inviter_display_name").notNull(),
  inviterAvatarUrl: text("inviter_avatar_url"),
  inviteeAuthId: uuid("invitee_auth_id").notNull(),
  topic: text("topic"), // 'counseling' | 'casual' | 'meeting'
  status: text("status").notNull().default("pending"), // 'pending' | 'accepted' | 'declined' | 'expired'
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const blockRelations = pgTable("block_relations", {
  id: uuid("id").primaryKey().defaultRandom(),
  blockerAuthId: uuid("blocker_auth_id").notNull(),
  blockedAuthId: uuid("blocked_auth_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const deletionAuditLogs = pgTable("deletion_audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  executedAt: timestamp("executed_at", { withTimezone: true }).notNull().defaultNow(),
  tableName: text("table_name").notNull(),
  deletedCount: integer("deleted_count").notNull(),
  retentionMonths: integer("retention_months").notNull(),
});
