// Quick sanity checks for the cycle parser and unit helpers: npx tsx scripts/test-parser.ts
import assert from "node:assert/strict";
import { parseCycle, EXAMPLE_CYCLE } from "../src/lib/cycle-format";
import { parseDistance, parseDuration, parseLoadKg, estimate1RM } from "../src/lib/units";

assert.equal(parseDistance("8km"), 8000);
assert.equal(parseDistance("1500m"), 1500);
assert.equal(parseDistance("5 miles"), 8047);
assert.equal(parseDuration("45min"), 2700);
assert.equal(parseDuration("1h30"), 5400);
assert.equal(parseDuration("2h30"), 9000);
assert.equal(parseDuration("46:10"), 2770);
assert.equal(parseDuration("1:05:00"), 3900);
assert.equal(parseDuration("90s"), 90);
assert.throws(() => parseDuration("soon"));
assert.equal(parseLoadKg("82.5kg"), 82.5);
assert.equal(parseLoadKg("RPE 8"), undefined);
assert.equal(estimate1RM(100, 5), 116.7);

const ok = parseCycle(EXAMPLE_CYCLE);
assert.ok(ok.ok);
if (ok.ok) {
  assert.equal(ok.cycle.startDate, "2026-11-16");
  assert.equal(ok.cycle.workouts.length, 8);
  assert.equal(ok.cycle.weekFocus[1], "Volume");
}
// start on a Wednesday -> week 1 begins that Monday; full day names accepted
const mid = parseCycle("name: X\nstart: 2026-11-18\nweeks:\n  - week: 2\n    sessions:\n      - { day: Monday, sport: Run, distance: 5 miles }\n");
assert.ok(mid.ok && mid.cycle.workouts[0].date === "2026-11-23" && mid.cycle.startDate === "2026-11-16");
const bad = parseCycle("name: X\nstart: nope\nweeks:\n  - week: 1\n    sessions:\n      - { day: mon, sport: gym }\n");
assert.ok(!bad.ok);
const bad2 = parseCycle("name: X\nstart: 2026-11-16\nweeks:\n  - week: 1\n    sessions:\n      - { day: mon, sport: gym }\n");
assert.ok(!bad2.ok && bad2.errors[0].includes("exercises"));
assert.ok(!parseCycle("name: [unclosed").ok);
console.log("✓ all parser tests passed");
