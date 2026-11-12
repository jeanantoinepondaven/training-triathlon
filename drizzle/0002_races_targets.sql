CREATE TABLE "races" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by" uuid NOT NULL,
	"who" text DEFAULT 'both' NOT NULL,
	"name" text NOT NULL,
	"date" date NOT NULL,
	"kind" text NOT NULL,
	"dist" text NOT NULL,
	"priority" text DEFAULT 'B' NOT NULL,
	"goal_time" text,
	"leg_goals" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"place" text,
	"note" text,
	"result" text,
	"result_place" text,
	"on_cal" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text DEFAULT 'custom' NOT NULL,
	"sport" text DEFAULT 'other' NOT NULL,
	"title" text NOT NULL,
	"metric_key" text,
	"start_value" real NOT NULL,
	"current_value" real,
	"goal_value" real NOT NULL,
	"unit" text,
	"lower_is_better" integer DEFAULT 0 NOT NULL,
	"race_id" uuid,
	"due" date,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "races" ADD CONSTRAINT "races_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "targets" ADD CONSTRAINT "targets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "targets" ADD CONSTRAINT "targets_race_id_races_id_fk" FOREIGN KEY ("race_id") REFERENCES "public"."races"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "races_date_idx" ON "races" USING btree ("date");--> statement-breakpoint
CREATE INDEX "targets_user_idx" ON "targets" USING btree ("user_id");