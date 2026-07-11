CREATE TABLE "presence_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_auth_id" uuid NOT NULL,
	"connection_id" text NOT NULL,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"disconnected_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "presence_sessions_connection_id_idx" ON "presence_sessions" USING btree ("connection_id");