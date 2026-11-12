// Checks the Tandem → intervals.icu workout text conversion on real sessions from the season plan.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseCycle } from "../src/lib/cycle-format";
import { activitySport, canSendToWatch, eventType, recovery, target, workoutText } from "../src/lib/intervals-format";

assert.equal(target("3:40–3:43/km, 2 min jog", "run"), "3:40/km-3:43/km Pace");
assert.equal(target("10 km pace 3:38/km, straight into the 200", "run"), "3:38/km Pace");
assert.equal(target("88–93% FTP", "bike"), "88-93%");
assert.equal(target("Z2 · 65–75% FTP · cadence 85–95", "bike"), "65-75%");
assert.equal(target("Z2 · 4:33–5:03/km", "run"), "4:33/km-5:03/km Pace");
assert.equal(target("CSS pace, 10–15s rest", "swim"), "");
assert.equal(target("1:50/100m", "swim"), "1:50/100m Pace");
assert.equal(recovery("3:40–3:43/km, 2 min jog"), 120);
assert.equal(recovery("5 km pace 3:31–3:34/km, 2:30 jog"), 150);
assert.equal(recovery("~95%, relaxed and tall · walk back 2–3 min"), 180);
assert.equal(recovery("CSS pace, 10–15s rest"), 15);
assert.equal(recovery("CSS -1s/100m, 10s rest"), 10);
assert.deepEqual(activitySport("VirtualRide"), { sport: "bike" });
assert.deepEqual(activitySport("Soccer"), { sport: "run", football: true });
assert.equal(activitySport("Walk"), null);
assert.equal(eventType({ sport: "bike", title: "Indoor bike: threshold" }), "VirtualRide");

assert.ok(workoutText({ sport: "bike", title: "Long ride", description: null, plan: { kind: "endurance", durationS: 9300, target: "Z2 with 4 × 10 min @ race effort (90–95% FTP)" } }).includes("- 2h35m Z2"));
const files = ["block-05-build-1.yaml", "block-08-specific-1.yaml", "block-02-base-1.yaml"];
const seen = new Set<string>();
for (const f of files) {
  const r = parseCycle(readFileSync(`plans/season-2026-27/${f}`, "utf8"));
  if (!r.ok) throw new Error(r.errors.join("\n"));
  for (const w of r.cycle.workouts) {
    const ok = canSendToWatch({ ...w, plan: w.plan });
    const text = workoutText({ ...w, description: w.description ?? null });
    if (ok) {
      assert.ok(/^- /m.test(text), `${w.title} has no steps:\n${text}`);
      for (const l of text.split("\n").filter((x) => x.startsWith("- "))) assert.ok(/\d+(h|m|s|km|mtr)\b/.test(l), `step without length in ${w.title}: ${l}`);
    }
    if (ok && !seen.has(w.title) && /Track|Run: sprints|Swim: CSS|Bike: threshold|Indoor bike: VO2|Long ride/.test(w.title)) {
      seen.add(w.title);
      console.log(`\n=== ${w.title} (${eventType(w)}) ===\n${text}`);
    }
  }
}
console.log("\n✓ intervals.icu conversion tests passed");
