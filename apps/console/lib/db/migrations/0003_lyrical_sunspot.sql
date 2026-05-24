CREATE TABLE "build_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"app_id" uuid NOT NULL,
	"eas_build_id" text NOT NULL,
	"succeeded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"build_duration_seconds" integer,
	CONSTRAINT "build_usage_eas_build_id_unique" UNIQUE("eas_build_id")
);
--> statement-breakpoint
CREATE INDEX "build_usage_user_succeeded_idx" ON "build_usage" USING btree ("user_id","succeeded_at" DESC NULLS LAST);