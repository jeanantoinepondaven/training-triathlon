// Shapes stored in the `plan` and `log` JSON columns of a workout.
// Distances are in metres, durations in seconds, loads in kg.

export type GymExercise = {
  name: string;
  sets: number;
  reps: string; // "6", "8-10", "AMRAP", "30s"
  load?: string; // as written in the cycle: "80kg", "RPE 8", "75%"
  loadKg?: number; // parsed when the load is an absolute weight
  rest?: string;
  notes?: string;
};

export type EnduranceStep = {
  label?: string;
  repeat?: number;
  distanceM?: number;
  durationS?: number;
  target?: string; // pace, power, zone, HR…
};

export type GymPlan = { kind: "gym"; exercises: GymExercise[] };
export type EndurancePlan = {
  kind: "endurance";
  distanceM?: number;
  durationS?: number;
  target?: string;
  steps?: EnduranceStep[];
};
export type FreePlan = { kind: "free" };
export type WorkoutPlan = GymPlan | EndurancePlan | FreePlan;

export type LoggedSet = { reps: number | null; weightKg: number | null; done?: boolean };
export type GymLog = {
  kind: "gym";
  exercises: { name: string; sets: LoggedSet[] }[];
};
export type EnduranceLog = {
  kind: "endurance";
  distanceM?: number;
  durationS?: number;
  avgHr?: number;
  avgPower?: number;
  elevationM?: number;
};
export type WorkoutLog = GymLog | EnduranceLog;
