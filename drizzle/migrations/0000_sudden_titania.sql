CREATE TABLE "attendance_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_auth_id" uuid NOT NULL,
	"logged_in_at" timestamp with time zone DEFAULT now() NOT NULL,
	"logged_out_at" timestamp with time zone,
	"source" text NOT NULL,
	CONSTRAINT "attendance_logs_source_values" CHECK ("attendance_logs"."source" IN ('explicit', 'inferred'))
);
--> statement-breakpoint
CREATE TABLE "block_relations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blocker_auth_id" uuid NOT NULL,
	"blocked_auth_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "block_relations_unique" UNIQUE("blocker_auth_id","blocked_auth_id"),
	CONSTRAINT "block_relations_no_self" CHECK ("block_relations"."blocker_auth_id" <> "block_relations"."blocked_auth_id")
);
--> statement-breakpoint
CREATE TABLE "call_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inviter_auth_id" uuid NOT NULL,
	"inviter_display_name" text NOT NULL,
	"inviter_avatar_url" text,
	"invitee_auth_id" uuid NOT NULL,
	"topic" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "call_invitations_topic_values" CHECK ("call_invitations"."topic" IS NULL OR "call_invitations"."topic" IN ('counseling', 'casual', 'meeting')),
	CONSTRAINT "call_invitations_status_values" CHECK ("call_invitations"."status" IN ('pending', 'accepted', 'declined', 'expired'))
);
--> statement-breakpoint
CREATE TABLE "call_participation_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_auth_id" uuid NOT NULL,
	"room_id" text NOT NULL,
	"topic" text,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"left_at" timestamp with time zone,
	CONSTRAINT "call_participation_logs_topic_values" CHECK ("call_participation_logs"."topic" IS NULL OR "call_participation_logs"."topic" IN ('counseling', 'casual', 'meeting'))
);
--> statement-breakpoint
CREATE TABLE "deletion_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"executed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"table_name" text NOT NULL,
	"deleted_count" integer NOT NULL,
	"retention_months" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" text NOT NULL,
	"auth_user_id" uuid,
	"display_name" text NOT NULL,
	"avatar_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"consent_accepted_at" timestamp with time zone,
	"tutorial_completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employees_employee_id_unique" UNIQUE("employee_id"),
	CONSTRAINT "employees_auth_user_id_unique" UNIQUE("auth_user_id"),
	CONSTRAINT "employees_employee_id_format" CHECK ("employees"."employee_id" ~ '^[0-9]{9}$')
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reported_employee_id" uuid NOT NULL,
	"category" text DEFAULT 'other' NOT NULL,
	"content" text NOT NULL,
	"context" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reports_category_values" CHECK ("reports"."category" IN ('harassment', 'inappropriate_speech', 'rule_violation', 'other'))
);
--> statement-breakpoint
CREATE TABLE "satisfaction_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"survey_type" text DEFAULT 'session' NOT NULL,
	"rating" integer,
	"nps_score" integer,
	"comment" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "satisfaction_responses_survey_type_values" CHECK ("satisfaction_responses"."survey_type" IN ('session', 'nps')),
	CONSTRAINT "satisfaction_responses_rating_range" CHECK ("satisfaction_responses"."rating" IS NULL OR ("satisfaction_responses"."rating" BETWEEN 1 AND 5)),
	CONSTRAINT "satisfaction_responses_nps_score_range" CHECK ("satisfaction_responses"."nps_score" IS NULL OR ("satisfaction_responses"."nps_score" BETWEEN 0 AND 10))
);
--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reported_employee_id_employees_id_fk" FOREIGN KEY ("reported_employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;