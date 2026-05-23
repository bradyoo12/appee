CREATE TABLE "apps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"short_id" text NOT NULL,
	"package_name" text NOT NULL,
	"slug" text NOT NULL,
	"app_name" text NOT NULL,
	"headline" text NOT NULL,
	"status" text DEFAULT 'preparing' NOT NULL,
	"eas_build_id" text,
	"install_url" text,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "apps_short_id_unique" UNIQUE("short_id")
);
--> statement-breakpoint
CREATE INDEX "apps_user_created_idx" ON "apps" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "apps_eas_build_idx" ON "apps" USING btree ("eas_build_id");