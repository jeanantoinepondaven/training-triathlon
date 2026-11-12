import {
  pgTable,
  uuid,
  text,
  integer,
  date,
  timestamp,
  jsonb,
  index,
  real,
} from "drizzle-orm/pg-core";
import type { WorkoutLog, WorkoutPlan } from "@/lib/plan-types";

export const SPORTS = ["gym", "run", "bike", "swim", "other"] as const;
export type Sport = (typeof SPORTS)[number];

export const STATUSES = ["planned", "done", "skipped"] as const;
export type Status = (typeof STATUSES)[number];

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  // intervals.icu bridge to Garmin (API key stored encrypted, never returned to the browser)
  intervalsAthleteId: text("intervals_athlete_id"),
  intervalsAthleteName: text("intervals_athlete_name"),
  intervalsKey: text("intervals_key_enc"),
  intervalsConnectedAt: timestamp("intervals_connected_at", { withTimezone: true }),
  intervalsLastSync: timestamp("intervals_last_sync", { withTimezone: true }),
  intervalsLastError: text("intervals_last_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** A training block (usually 3 weeks) imported from a YAML file. */
export const cycles = pgTable(
  "cycles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    goal: text("goal"),
    startDate: date("start_date").notNull(), // Monday of week 1
    weeks: integer("weeks").notNull(),
    weekFocus: jsonb("week_focus").$type<Record<number, string>>().notNull().default({}),
    /** The original YAML, kept so a cycle can be re-imported or diffed later. */
    source: text("source").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("cycles_user_idx").on(t.userId)],
);

/** One training session. `plannedDate` never changes; `date` is where it sits now. */
export const workouts = pgTable(
  "workouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    cycleId: uuid("cycle_id").references(() => cycles.id, { onDelete: "cascade" }),
    week: integer("week"),
    plannedDate: date("planned_date").notNull(),
    date: date("date").notNull(),
    position: integer("position").notNull().default(0),
    sport: text("sport", { enum: SPORTS }).notNull(),
    title: text("title").notNull(),
    description: text("description"),
    plan: jsonb("plan").$type<WorkoutPlan>().notNull(),
    status: text("status", { enum: STATUSES }).notNull().default("planned"),
    log: jsonb("log").$type<WorkoutLog>(),
    rpe: integer("rpe"), // 1-10
    feeling: integer("feeling"), // 1-5
    notes: text("notes"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    /** Planned workout on the intervals.icu calendar (sent to the watch). */
    intervalsEventId: text("intervals_event_id"),
    /** Activity recorded on the watch that filled this session's log. */
    intervalsActivityId: text("intervals_activity_id"),
    activityDevice: text("activity_device"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("workouts_user_date_idx").on(t.userId, t.date),
    index("workouts_cycle_idx").on(t.cycleId),
  ],
);

/** A race or event. `who` is "both" or a user id; `createdBy` owns edits. */
export const races = pgTable(
  "races",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    who: text("who").notNull().default("both"),
    name: text("name").notNull(),
    date: date("date").notNull(),
    kind: text("kind", { enum: ["tri", "run", "bike", "swim"] }).notNull(),
    dist: text("dist").notNull(),
    priority: text("priority", { enum: ["A", "B", "C"] }).notNull().default("B"),
    goalTime: text("goal_time"),
    /** Per-leg goals, free text: { swim: "21:00", bike: "38–40 km/h", run: "35:00" } */
    legGoals: jsonb("leg_goals").$type<Partial<Record<"swim" | "bike" | "run", string>>>().notNull().default({}),
    place: text("place"),
    note: text("note"),
    result: text("result"),
    resultPlace: text("result_place"),
    onCal: integer("on_cal").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("races_date_idx").on(t.date)],
);

export const TARGET_KINDS = ["custom", "e1rm", "volume", "consistency", "best10k", "best5k"] as const;
export type TargetKind = (typeof TARGET_KINDS)[number];

/** A goal to work towards. Auto kinds compute "now" from the logged sessions; custom ones are updated by hand. */
export const targets = pgTable(
  "targets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: TARGET_KINDS }).notNull().default("custom"),
    sport: text("sport", { enum: SPORTS }).notNull().default("other"),
    title: text("title").notNull(),
    /** e1rm: exercise name · volume: sport ("all" for every sport) */
    metricKey: text("metric_key"),
    startValue: real("start_value").notNull(),
    currentValue: real("current_value"),
    goalValue: real("goal_value").notNull(),
    unit: text("unit"),
    /** Lower is better (times). Values are seconds then. */
    lowerIsBetter: integer("lower_is_better").notNull().default(0),
    raceId: uuid("race_id").references(() => races.id, { onDelete: "set null" }),
    due: date("due"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("targets_user_idx").on(t.userId)],
);

export type Race = typeof races.$inferSelect;
export type Target = typeof targets.$inferSelect;
export type User = typeof users.$inferSelect;
export type Cycle = typeof cycles.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
