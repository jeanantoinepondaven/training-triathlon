ALTER TABLE "users" ADD COLUMN "intervals_athlete_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "intervals_athlete_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "intervals_key_enc" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "intervals_connected_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "intervals_last_sync" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "intervals_last_error" text;--> statement-breakpoint
ALTER TABLE "workouts" ADD COLUMN "intervals_event_id" text;--> statement-breakpoint
ALTER TABLE "workouts" ADD COLUMN "intervals_activity_id" text;--> statement-breakpoint
ALTER TABLE "workouts" ADD COLUMN "activity_device" text;