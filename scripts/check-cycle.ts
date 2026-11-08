// Usage: npx tsx scripts/check-cycle.ts path/to/cycle.yaml  (validates a cycle file offline)
import { readFileSync } from "node:fs";
import { parseCycle, EXAMPLE_CYCLE } from "../src/lib/cycle-format";

const file = process.argv[2];
const res = parseCycle(file ? readFileSync(file, "utf8") : EXAMPLE_CYCLE);
if (!res.ok) {
  console.error("✗ Invalid cycle:\n  " + res.errors.join("\n  "));
  process.exit(1);
}
console.log(`✓ ${res.cycle.name}: ${res.cycle.weeks} weeks, ${res.cycle.workouts.length} sessions from ${res.cycle.startDate}`);
for (const w of res.cycle.workouts) console.log(`  W${w.week} ${w.date} ${w.sport.padEnd(5)} ${w.title}`, JSON.stringify(w.plan));
