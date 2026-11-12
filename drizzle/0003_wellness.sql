CREATE TABLE "wellness" (
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"resting_hr" real,
	"hrv" real,
	"hrv_sdnn" real,
	"sleep_secs" real,
	"sleep_score" real,
	"avg_sleeping_hr" real,
	"spo2" real,
	"respiration" real,
	"weight" real,
	"body_fat" real,
	"vo2max" real,
	"steps" real,
	"readiness" real,
	"ctl" real,
	"atl" real,
	"ramp_rate" real,
	"soreness" integer,
	"fatigue" integer,
	"stress" integer,
	"mood" integer,
	"motivation" integer,
	"injury" integer,
	"comments" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wellness_user_id_date_pk" PRIMARY KEY("user_id","date")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "share_health" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "wellness" ADD CONSTRAINT "wellness_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;