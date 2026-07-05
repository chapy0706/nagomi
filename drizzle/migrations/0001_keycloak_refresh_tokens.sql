CREATE TABLE "keycloak_refresh_tokens" (
	"auth_user_id" uuid PRIMARY KEY NOT NULL,
	"refresh_token" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
