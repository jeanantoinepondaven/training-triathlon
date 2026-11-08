import {
  pgTable,
  uuid,
  text,
  integer,
  date,
  timestamp,
  jsonb,
  index,
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("workouts_user_date_idx").on(t.userId, t.date),
    index("workouts_cycle_idx").on(t.cycleId),
  ],
);

export type User = typeof users.$inferSelect;
export type Cycle = typeof cycles.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
