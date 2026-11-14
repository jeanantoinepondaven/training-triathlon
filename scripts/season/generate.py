"""
Season generator: 16 Nov 2026 -> 5 Sep 2027. A 2-week intro, then 10 blocks of 4 weeks (3 load + 1 easy).

Writes one cycle YAML per block (importable in the app) and a JSON summary used by the Excel builder.
Edit the SETTINGS section and re-run:  python3 scripts/season/generate.py
"""
import datetime as dt
import json
import math
import os
import yaml

# ============================ SETTINGS (edit these) ============================
START = dt.date(2026, 11, 16)          # Monday of week 1
OUT = os.path.join(os.path.dirname(__file__), "..", "..", "plans", "season-2026-27")
ATHLETE = "Jean-Antoine"

# Run: current 10 km and target 10 km (assumed 10 km; see README)
RUN_NOW_10K = 36 * 60 + 45             # 36:45
RUN_GOAL_10K = 35 * 60                 # 35:00, reached by Peak 1 (early July)

# Official start: Friday 20 Nov 2026 (week 1 is Fri–Sun only). Coming back from runner's knee:
# the first 7 weeks are a return-to-run ramp (see RTR below).
OFFICIAL_START = dt.date(2026, 11, 20)
TRAVEL = (dt.date(2026, 12, 17), dt.date(2026, 12, 30))   # Guatemala: lighter, flexible training
BACK_TO_NORMAL = dt.date(2027, 1, 4)

# Blocks: (number, name, phase, volume factor, goal, week types). Week types:
# Start (Fri–Sun only) · Load / Load+ / Load++ · Easy · Tests (easy week with tests) · Trip-1/2/3 (Guatemala) ·
# Sharpen · Race (A race week) · BRace-sprint / BRace-olympic (B race on Sunday, easy week around it).
BLOCKS = [
    (1, "Return", "base", 0.75, "Ease in from the 20th, return to running after the knee, swim technique, bike and swim tests",
     ["Start", "Load", "Load+", "Tests"]),
    (2, "Holidays", "base", 0.70, "Keep the routine until the 16th, then light, flexible training in Guatemala; back on the 4th",
     ["Trip-1", "Trip-2", "Trip-3"]),
    (3, "Base 1", "base", 0.85, "Aerobic base, run volume back up, max strength, first run test", ["Load", "Load+", "Load++", "Tests"]),
    (4, "Base 2", "base", 0.93, "Aerobic volume, hills and fartlek, power and plyo", ["Load", "Load+", "Load++", "Easy"]),
    (5, "Base 3", "base", 1.00, "Biggest base load, tempo, end-of-base tests", ["Load", "Load+", "Load++", "Tests"]),
    (6, "Build 1", "build", 1.00, "Back on the road, threshold in all three sports, track every other Tuesday", ["Load", "Load+", "Load++", "Easy"]),
    (7, "Build 2", "build", 1.05, "Peak build volume, longer bricks, race pace begins, B sprint race", ["Load", "Load+", "Load++", "BRace-sprint"]),
    (8, "Specific", "specific", 1.00, "Race pace, draft-legal surges, B Olympic race", ["Load", "Load+", "BRace-olympic"]),
    (9, "Peak 1", "peak", 1.00, "Sharpen and taper: A race 1", ["Load", "Load+", "Sharpen", "Race"]),
    (10, "Race block", "specific", 0.98, "Recover, hold fitness between races, sprint speed", ["Easy", "Load", "Load+", "BRace-sprint"]),
    (11, "Peak 2", "peak", 1.00, "Sharpen and taper: A race 2 (selection)", ["Load", "Load+", "Sharpen", "Race"]),
]
RACE_TITLES = {
    7: "B race: sprint (placeholder date)",
    8: "B race: Olympic (placeholder date)",
    9: "A race 1: Olympic / national ranking (placeholder date)",
    10: "Race: sprint, draft-legal (optional, placeholder)",
    11: "A race 2: national selection (placeholder date)",
}
GOAL_BLOCK = 9           # 10 km goal pace reached by Peak 1
LOAD_STEPS = {"Load": 1.00, "Load+": 1.06, "Load++": 1.11}

# Winter: bike indoors, football at noon on Wednesdays, snowboard on Saturdays (optional).
WINTER = ((12, 1), (3, 14))   # (month, day) from 1 Dec to 14 Mar

# The week (your layout): Mon noon jog + evening swim · Tue noon run + evening gym A · Wed noon football + evening gym B ·
# Thu noon bootcamp (work) + evening swim · Fri evening gym C (winter) or bike (from spring) · Sat brick (bike + run, ~2 h) ·
# Sun long run (+ optional swim).

# Return to run (runner's knee, 5 km pain-free in early Nov): minutes per run for the first weeks,
# by week index from 16 Nov: (Mon noon jog, Tue noon run, run off the bike, Sunday run). 0 = no run.
RTR = {0: (0, 0, 8, 25), 1: (0, 25, 8, 30), 2: (20, 25, 10, 35), 3: (0, 25, 0, 30)}
KNEE = ("Knee rule: pain at most 2/10 while running and no worse the next morning → keep progressing. "
        "More than that → repeat last week's runs. Flat, soft ground, no long downhills, short quick steps.")
# ==============================================================================

DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]


class NoAliasDumper(yaml.SafeDumper):
    """Write repeated gym sessions out in full (no &id001 anchors) so the files stay easy to read and edit."""

    def ignore_aliases(self, data):
        return True


def pace_10k(block):
    t = min(block - 1, GOAL_BLOCK - 1) / (GOAL_BLOCK - 1)
    return (RUN_NOW_10K + (RUN_GOAL_10K - RUN_NOW_10K) * t) / 10  # s/km


def mmss(s):
    s = int(round(s))
    return f"{s // 60}:{s % 60:02d}"


def run_zones(block):
    p = pace_10k(block)
    return {
        "easy": f"{mmss(p + 55)}–{mmss(p + 85)}/km",
        "tempo": f"{mmss(p + 18)}–{mmss(p + 24)}/km",
        "thr": f"{mmss(p + 5)}–{mmss(p + 8)}/km",
        "r10k": f"{mmss(p)}/km",
        "vo2": f"{mmss(p - 9)}–{mmss(p - 6)}/km",
        "p": p,
    }


def r5(x):  # round minutes to 5
    return int(5 * round(x / 5))


def rkm(x):  # round to 0.5 km
    return round(x * 2) / 2


def r100(x):
    return int(100 * round(x / 100))


def dur(m):
    m = int(m)
    return f"{m // 60}h{m % 60:02d}" if m >= 60 else f"{m}min"


class Week:
    def __init__(self):
        self.sessions = []  # (day, session dict, meta)

    def add(self, day, s, sport, minutes, km=0.0, hard=0):
        s = {"day": day, "sport": sport, **s}
        self.sessions.append((day, s, {"sport": sport, "min": minutes, "km": km, "hard": hard}))


# ----------------------------------------------------------------------------- swim
def swim_technique(w, day, f):
    main = max(5, round(8 * f))
    dist = 400 + 8 * 50 + main * 200 + 200
    w.add(day, {"title": "Swim technique", "description": "Long, relaxed strokes. Drills: catch-up, fists, 6-kick switch.",
                "steps": [{"label": "Warm-up", "distance": "400m", "target": "easy, mixed strokes"},
                          {"label": "Drills", "repeat": 8, "distance": "50m", "target": "catch-up / fists, 15s rest"},
                          {"label": "Main", "repeat": main, "distance": "200m", "target": "CSS +6s/100m, 20s rest"},
                          {"label": "Cool-down", "distance": "200m"}]},
          "swim", dist / 100 * 2.0, dist / 1000, 0)


def swim_css(w, day, f, phase):
    reps = max(10, round(14 * f))
    if phase in ("specific", "peak"):
        steps = [{"label": "Warm-up", "distance": "400m"},
                 {"label": "Race starts", "repeat": 6, "distance": "50m", "target": "first 25 m all-out, dive or deep-water start"},
                 {"label": "CSS", "repeat": reps, "distance": "100m", "target": "CSS -1s/100m, 10s rest"},
                 {"label": "Pull", "repeat": 3, "distance": "200m", "target": "with buoy + paddles, steady"},
                 {"label": "Cool-down", "distance": "200m"}]
        dist = 400 + 300 + reps * 100 + 600 + 200
        title, desc = "Swim: race starts + CSS", "Draft-legal: the first 200 m decide the pack. Practise fast starts and sighting."
    else:
        steps = [{"label": "Warm-up", "distance": "400m"},
                 {"label": "Build", "repeat": 4, "distance": "50m", "target": "build to fast"},
                 {"label": "CSS", "repeat": reps, "distance": "100m", "target": "CSS pace, 10–15s rest"},
                 {"label": "Pull", "repeat": 2, "distance": "300m", "target": "buoy, steady"},
                 {"label": "Cool-down", "distance": "200m"}]
        dist = 400 + 200 + reps * 100 + 600 + 200
        title, desc = "Swim: CSS threshold", "CSS = critical swim speed from your 400/200 test."
    w.add(day, {"title": title, "description": desc, "steps": steps}, "swim", dist / 100 * 1.9, dist / 1000, reps * 1.6)


def swim_endurance(w, day, f):
    dist = r100(2900 * f)
    w.add(day, {"title": "Swim endurance", "distance": f"{dist}m",
                "target": "steady CSS +4–6s/100m, bilateral breathing, sight every 6 strokes",
                "description": "Main set e.g. 3 × (4 × 200m) with 20s rest; open water when possible from May."},
          "swim", dist / 100 * 2.0, dist / 1000, 0)


def swim_easy(w, day, dist=1800):
    w.add(day, {"title": "Swim easy", "distance": f"{dist}m", "target": "relaxed, technique focus"}, "swim", dist / 100 * 2.1, dist / 1000, 0)


# ----------------------------------------------------------------------------- bike
def bike_endurance(w, day, mins, extra=None):
    s = {"title": "Bike endurance", "duration": dur(mins), "target": "Z2 · 65–75% FTP · cadence 85–95"}
    if extra:
        s["description"] = extra
    w.add(day, s, "bike", mins, 0, 0)


def bike_quality(w, day, phase, f, idx):
    if phase == "base":
        reps, work = (3, 10) if idx % 2 == 0 else (4, 8)
        steps = [{"label": "Warm-up", "duration": "15min", "target": "Z2, 3 × 1 min high cadence"},
                 {"label": "Tempo", "repeat": reps, "duration": f"{work}min", "target": "80–88% FTP, 4 min easy"},
                 {"label": "Endurance", "duration": dur(r5(25 * f)), "target": "Z2"},
                 {"label": "Cool-down", "duration": "10min"}]
        hard, title = reps * work, "Bike: tempo"
        minutes = 15 + reps * work + 4 * (reps - 1) + r5(25 * f) + 10
    elif phase == "build":
        opts = [(3, 12, "95–100% FTP, 5 min easy", "Bike: threshold"),
                (5, 6, "105–108% FTP, 4 min easy", "Bike: VO2 max"),
                (2, 20, "92–97% FTP, 6 min easy", "Bike: long threshold")]
        reps, work, tgt, title = opts[idx % 3]
        steps = [{"label": "Warm-up", "duration": "15min", "target": "Z2 + 3 × 1 min fast"},
                 {"label": "Main", "repeat": reps, "duration": f"{work}min", "target": tgt},
                 {"label": "Cool-down", "duration": "10min"}]
        hard = reps * work
        minutes = 15 + reps * work + {12: 5, 6: 4, 20: 6}[work] * (reps - 1) + 10
    else:  # specific / peak: draft-legal race demands
        steps = [{"label": "Warm-up", "duration": "15min", "target": "Z2 + 3 × 30s sprint"},
                 {"label": "Surges", "repeat": 8, "duration": "1min", "target": "120–130% FTP, 1 min easy (break-away / bridge)"},
                 {"label": "Race pace", "duration": dur(r5(20 * f)), "target": "88–92% FTP, aero / tight position"},
                 {"label": "Cool-down", "duration": "10min"}]
        hard, title = 8 + r5(20 * f), "Bike: surges + race pace"
        minutes = 15 + 16 + 5 + r5(20 * f) + 10
    w.add(day, {"title": title, "steps": steps}, "bike", minutes, 0, hard)


def long_ride(w, day, mins, phase, brick_km, z):
    s = {"title": "Long ride", "duration": dur(mins)}
    hard = 0
    if phase == "base":
        s["target"] = "Z2 · 65–75% FTP · eat 60 g carbs/h"
    elif phase == "build":
        s["target"] = "Z2 with 3 × 15 min @ 85–90% FTP"
        hard = 45
    else:
        s["target"] = "Z2 with 4 × 10 min @ race effort (90–95% FTP)"
        hard = 40
    w.add(day, s, "bike", mins, 0, hard)
    if brick_km:
        w.add(day, {"title": "Brick run off the bike", "distance": f"{brick_km}km",
                    "target": f"straight off the bike · first km {z['tempo']}, then {z['r10k'] if phase != 'build' else z['thr']}",
                    "description": "Transition under 2 min. Quick cadence, relaxed shoulders."},
              "run", brick_km * z["p"] / 60 * 1.03, brick_km, brick_km * z["p"] / 60)


# ----------------------------------------------------------------------------- run
def jog(w, day, mins, z, title="Noon jog", strides=False, knee=False):
    s = {"title": title + (" + strides" if strides else ""), "duration": dur(mins),
         "target": f"easy · {z['easy']}" + (" · finish 4–6 × 20s strides" if strides else "")}
    if knee:
        s["description"] = KNEE
    w.add(day, s, "run", mins, round(mins * 60 / (z["p"] + 70), 1), 2 if strides else 0)


def run_easy(w, day, km, z, strides=True):
    s = {"title": "Easy run" + (" + strides" if strides else ""), "distance": f"{km}km",
         "target": f"Z2 · {z['easy']}" + (" · finish 6 × 20s strides" if strides else "")}
    w.add(day, s, "run", km * (z["p"] + 70) / 60, km, 2 if strides else 0)


def long_run(w, day, km, z, finish=False):
    s = {"title": "Long run", "distance": f"{km}km", "target": f"Z2 · {z['easy']}"}
    hard = 0
    if finish:
        s["target"] += f" · last 3 km @ {z['tempo']}"
        hard = 3 * (z["p"] + 21) / 60
    w.add(day, s, "run", km * (z["p"] + 68) / 60, km, hard)


FLYING = {"label": "Flying sprints", "repeat": 6, "distance": "60m", "target": "~95%, relaxed and tall · walk back 2–3 min"}


def run_quality(w, day, phase, f, idx, z):
    """Tuesday quality run. Track work for an ex-sprinter: short, fast and fully recovered (alactic),
    never 300-400 m lactic reps. Base: flying sprints before the main set. Build/specific: every other
    week the session moves to the track (5 km-pace reps + 150s, or a kick session)."""
    wu = [{"label": "Warm-up", "duration": "15min", "target": f"easy · {z['easy']} + drills"}]
    cd = [{"label": "Cool-down", "duration": "10min", "target": "easy"}]
    desc = None
    track = phase in ("build", "specific") and idx % 2 == 0
    if phase == "base":
        opts = [
            ([FLYING, {"label": "Hill reps", "repeat": 8, "duration": "1min", "target": "uphill 6–8%, strong, jog down"}], 10, 30, "Run: sprints + hills"),
            ([FLYING, {"label": "Tempo", "repeat": 3, "duration": "10min", "target": f"{z['tempo']}, 2 min jog"}], 32, 50, "Run: sprints + tempo"),
            ([FLYING, {"label": "Fartlek", "repeat": 10, "duration": "1min", "target": f"{z['thr']}, 1 min easy"}], 12, 34, "Run: sprints + fartlek"),
        ]
        desc = "Sprints first, while you're fresh: full recovery, stop if they slow down. Then the main set."
    elif phase == "build" and track:
        opts = [
            ([{"label": "800 m reps", "repeat": 6, "distance": "800m", "target": f"5 km pace {z['vo2']}, 2 min jog"},
              {"label": "Fast and relaxed", "repeat": 4, "distance": "150m", "target": "fast, relaxed form · walk back"}], 4.8 * z["p"] / 60 + 2, 4.8 * z["p"] / 60 + 18, "Track: 800s + 150s"),
            ([{"label": "1000 m reps", "repeat": 5, "distance": "1km", "target": f"5 km pace {z['vo2']}, 2:30 jog"},
              {"label": "Fast and relaxed", "repeat": 4, "distance": "150m", "target": "fast, relaxed form · walk back"}], 5 * z["p"] / 60 + 2, 5 * z["p"] / 60 + 20, "Track: 1000s + 150s"),
        ]
        desc = "On the track the pacing is exact. Flats or light trainers, no spikes."
    elif phase == "build":
        opts = [
            ([{"label": "Threshold", "repeat": 5, "distance": "1km", "target": f"{z['thr']}, 90s jog"}], 5 * z["p"] / 60, 5 * z["p"] / 60 + 6, "Run: threshold km"),
            ([{"label": "Threshold", "repeat": 3, "distance": "2km", "target": f"{z['thr']}, 2 min jog"}], 6 * z["p"] / 60, 6 * z["p"] / 60 + 4, "Run: 3 × 2 km"),
        ]
    elif track:
        opts = [
            ([{"label": "Kick set: 1200 m", "repeat": 3, "distance": "1200m", "target": f"10 km pace {z['r10k']}, straight into the 200"},
              {"label": "…then 200 m kick", "repeat": 3, "distance": "200m", "target": "~800 m race pace, 3 min jog after each pair"}], 3.6 * z["p"] / 60 + 2, 3.6 * z["p"] / 60 + 15, "Track: kick session"),
            ([{"label": "400 m reps", "repeat": 10, "distance": "400m", "target": f"3 km pace (~{mmss(z['p'] - 15)}/km), 60s jog"}], 4 * z["p"] / 60 * 0.95, 4 * z["p"] / 60 + 10, "Track: 10 × 400"),
        ]
        desc = "Race finish practice: run the 1200 at 10 km pace and go straight into the 200. That's your sprint finish."
    else:
        opts = [
            ([{"label": "Race pace", "repeat": 6, "distance": "1km", "target": f"10 km race pace {z['r10k']}, 75s jog"}], 6 * z["p"] / 60, 6 * z["p"] / 60 + 6, "Run: race-pace km"),
            ([{"label": "Race pace", "repeat": 3, "distance": "3km", "target": f"{z['r10k']}, 2 min jog"}], 9 * z["p"] / 60, 9 * z["p"] / 60 + 4, "Run: 3 × 3 km"),
        ]
    main, hard, mins, title = opts[(idx // 2 if phase != "base" else idx) % len(opts)]
    s = {"title": title, "steps": wu + main + cd}
    if desc:
        s["description"] = desc
    w.add(day, s, "run", 25 + mins, round((25 + mins) * 60 / (z["p"] + 40), 1), round(hard))


# ----------------------------------------------------------------------------- gym (circuit style)
def ex(name, sets, reps, load=None, rest=None, notes=None):
    e = {"name": name, "sets": sets, "reps": reps}
    if load:
        e["load"] = load
    if rest:
        e["rest"] = rest
    if notes:
        e["notes"] = notes
    return e


GYM = {
    ("base", "A"): ("Gym A: max strength",
                    "Circuit A: 4 rounds of 4 exercises back to back, 3–4 min rest between rounds. Then block B: 3 sets.",
                    [ex("Back squat", 4, "5", "80–85% 1RM", "3–4min", "circuit A"),
                     ex("Romanian deadlift", 4, "6", "RPE 8", None, "circuit A"),
                     ex("Weighted pull-up", 4, "5", "RPE 8", None, "circuit A"),
                     ex("Pallof press", 4, "10/side", None, None, "circuit A"),
                     ex("Bulgarian split squat", 3, "6/leg", "RPE 8", "90s", "block B"),
                     ex("Single-leg calf raise", 3, "12/leg", "+20 kg", None, "block B · soleus/Achilles for running"),
                     ex("Copenhagen plank", 3, "20s/side", None, None, "block B")]),
    ("base", "B"): ("Gym B: power + plyo",
                    "Circuit A: 4 rounds, full quality, 2–3 min rest. Stop a set if speed drops. Block B: 3 sets.",
                    [ex("Hang power clean", 4, "3", "70–75% 1RM", "2–3min", "circuit A"),
                     ex("Single-leg box jump", 4, "3/leg", "60–80 cm", None, "circuit A · land on one leg, stick it"),
                     ex("Push press", 4, "4", "RPE 7", None, "circuit A"),
                     ex("Nordic hamstring curl", 4, "4", None, None, "circuit A · slow lowering"),
                     ex("Step-up", 3, "8/leg", "RPE 7", "60s", "block B"),
                     ex("Tibialis raise", 3, "15", None, None, "block B"),
                     ex("Dead bug", 3, "10/side", None, None, "block B")]),
    ("build", "A"): ("Gym A: strength → power (contrast)",
                     "Circuit A: 4 rounds, heavy lift then jump (contrast), 3–5 min rest. Block B: 3 sets.",
                     [ex("Back squat", 4, "3", "85–88% 1RM", "3–5min", "circuit A"),
                      ex("Countermovement jump", 4, "4", "max height", None, "circuit A · right after the squat"),
                      ex("Trap-bar deadlift", 4, "4", "RPE 8", None, "circuit A"),
                      ex("Chin-up", 4, "6", "bodyweight+", None, "circuit A"),
                      ex("Single-leg RDL", 3, "6/leg", "RPE 7", "60s", "block B"),
                      ex("Lateral bound", 3, "5/side", None, None, "block B · stick each landing"),
                      ex("Side plank with reach", 3, "30s/side", None, None, "block B")]),
    ("build", "B"): ("Gym B: speed power (short)",
                     "Circuit A: 4 rounds, 2–3 min rest, 100% intent. 40 min max: Saturday's long ride matters more.",
                     [ex("Power clean", 4, "2", "75–80% 1RM", "2–3min", "circuit A"),
                      ex("Single-leg box jump", 4, "3/leg", "70–80 cm", None, "circuit A"),
                      ex("Med-ball rotational throw", 4, "5/side", "4–6 kg", None, "circuit A"),
                      ex("Single-leg hop and stick", 4, "4/leg", None, None, "circuit A"),
                      ex("Straight-leg calf raise", 3, "8", "heavy", "60s", "block B"),
                      ex("Copenhagen plank", 3, "20s/side", None, None, "block B"),
                      ex("Pallof press", 3, "10/side", None, None, "block B")]),
    ("specific", "A"): ("Gym: power maintenance",
                        "1 session a week now. Circuit A: 4 rounds, 3 min rest, fast and crisp, never to failure. Block B: 3 sets.",
                        [ex("Power clean", 4, "2", "75% 1RM", "3min", "circuit A"),
                         ex("Back squat", 4, "3", "80% 1RM, fast up", None, "circuit A"),
                         ex("Single-leg box jump", 4, "2/leg", "60–70 cm", None, "circuit A"),
                         ex("Pogo jumps", 4, "15s", None, None, "circuit A · stiff ankles"),
                         ex("Single-leg calf raise", 3, "10/leg", "+20 kg", "60s", "block B"),
                         ex("Copenhagen plank", 3, "20s/side", None, None, "block B"),
                         ex("Dead bug", 3, "10/side", None, None, "block B")]),
    ("recovery", "A"): ("Gym: light (recovery week)",
                        "3 rounds only, ~60–65% of usual loads, no jumps to max. Leave the gym feeling better than you came in.",
                        [ex("Back squat", 3, "5", "65% 1RM", "2min", "circuit A"),
                         ex("Romanian deadlift", 3, "6", "RPE 6", None, "circuit A"),
                         ex("Pull-up", 3, "5", "bodyweight", None, "circuit A"),
                         ex("Pallof press", 3, "10/side", None, None, "circuit A"),
                         ex("Single-leg calf raise", 2, "12/leg", "bodyweight", None, "block B"),
                         ex("Copenhagen plank", 2, "20s/side", None, None, "block B")]),
}


GYM[("return", "A")] = (
    "Gym A: strength (knee-friendly)",
    "Circuit A: 4 rounds, controlled tempo (3 s down), 2–3 min rest. Block B is knee rehab: do it every time. "
    "No pain above 2/10 in the knee; box squat depth only to where it's pain-free.",
    [ex("Box squat", 4, "6", "RPE 7, 3 s down", "2–3min", "circuit A"),
     ex("Romanian deadlift", 4, "6", "RPE 8", None, "circuit A"),
     ex("Weighted pull-up", 4, "5", "RPE 8", None, "circuit A"),
     ex("Pallof press", 4, "10/side", None, None, "circuit A"),
     ex("Spanish squat (isometric)", 3, "45s", "band behind knees", "60s", "block B · knee rehab"),
     ex("Slow step-down", 3, "8/leg", "15–20 cm box, 3 s down", None, "block B · knee tracks over 2nd toe"),
     ex("Side-lying hip abduction", 3, "15/leg", "ankle weight", None, "block B · glute med")])
GYM[("upper", "B")] = (
    "Gym B: upper body + core",
    "After football at noon: legs stay out of it. Circuit A: 4 rounds, 2 min rest. Block B: 3 sets. "
    "Swim shoulders: face pulls and rows balance the pressing.",
    [ex("Bench press", 4, "6", "RPE 8", "2min", "circuit A"),
     ex("Chest-supported row", 4, "8", "RPE 8", None, "circuit A"),
     ex("Half-kneeling landmine press", 4, "6/side", "RPE 7", None, "circuit A"),
     ex("Face pull", 4, "15", "light", None, "circuit A"),
     ex("Hanging knee raise", 3, "10", None, "60s", "block B"),
     ex("Copenhagen plank", 3, "20s/side", None, None, "block B"),
     ex("Dead bug", 3, "10/side", None, None, "block B")])
GYM[("return", "C")] = (
    "Gym C: power + plyo (knee build-up)",
    "Low-impact power while the knee settles: two-leg jumps, step down from the box (never jump down). "
    "Box height goes up only if landings are pain-free. Block B: knee and calf work.",
    [ex("Hang power clean", 4, "3", "65–70% 1RM", "2–3min", "circuit A"),
     ex("Two-leg box jump", 4, "5", "40–50 cm, step down", None, "circuit A · soft, quiet landing"),
     ex("Push press", 4, "5", "RPE 7", None, "circuit A"),
     ex("Nordic hamstring curl", 4, "4", None, None, "circuit A · slow lowering"),
     ex("Single-leg calf raise", 3, "12/leg", "+10 kg", "60s", "block B"),
     ex("Tibialis raise", 3, "15", None, None, "block B"),
     ex("Single-leg glute bridge", 3, "12/leg", None, None, "block B")])
GYM[("base", "B")] = (GYM[("base", "B")][0].replace("Gym B", "Gym C"),
                      GYM[("base", "B")][1] + " Single-leg box jumps only from February and only if the knee has been pain-free; until then two-leg at 60 cm.",
                      GYM[("base", "B")][2])
GYM[("travel", "A")] = (
    "Bodyweight strength (travel)",
    "20–30 min anywhere: 4 rounds, 1 min rest. Keep the knee rehab going.",
    [ex("Bulgarian split squat", 4, "10/leg", "bodyweight or backpack", "1min", "circuit A"),
     ex("Push-up", 4, "15", None, None, "circuit A"),
     ex("Single-leg hip thrust", 4, "12/leg", None, None, "circuit A"),
     ex("Plank", 4, "45s", None, None, "circuit A"),
     ex("Spanish squat (isometric)", 3, "45s", "band, or wall sit", None, "block B · knee"),
     ex("Slow step-down", 3, "8/leg", "stairs", None, "block B · knee")])


def gym(w, day, phase, kind):
    title, desc, exercises = GYM[(phase, kind)]
    mins = 30 if phase == "travel" else 40 if kind == "B" and phase == "build" else 45 if phase in ("specific", "recovery", "upper") else 60
    w.add(day, {"title": title, "description": desc, "exercises": exercises}, "gym", mins, 0, 0)


def bootcamp(w, day, easy=False):
    w.add(day, {"title": "Bootcamp (work)", "sport": "other", "duration": "45min",
                "description": "Counts as conditioning. " + ("Easy week: go at 70%, skip the jumps." if easy else
                               "Knee first: swap jumps for step-ups or bike sprints if it complains.")},
          "other", 45, 0, 10 if not easy else 3)


def spring_ramp(day):
    """Back on the road after winter: rides grow over 4 weeks (70% -> 100%)."""
    end = dt.date(day.year, *WINTER[1])
    weeks = (day - end).days // 7
    return 0.7 + 0.1 * weeks if 0 <= weeks < 3 else 1.0


def is_winter(day):
    (m1, d1), (m2, d2) = WINTER
    md = (day.month, day.day)
    return md >= (m1, d1) or md <= (m2, d2)


def football(w, day, easy=False):
    w.add(day, {"title": "Football at noon (counts as run)", "duration": "1h00", "distance": "6.5km",
                "target": "intermittent: sprints, changes of direction" + (" · play at 80%, no all-out sprints" if easy else ""),
                "description": "Your run intensity of the week in winter. Warm up properly (ankles, knees). "
                               "Knee sore afterwards → next day's run becomes a walk or bike."},
          "run", 60, 6.5, 8 if easy else 18)


def brick(w, day, bike_min, run_min, z, phase, winter, f, note=None):
    """Saturday: one ~2 h session, bike then run straight off it."""
    if phase == "base":
        tgt = "Z2 · 65–75% FTP" + (" with 3 × 8 min @ 80–88% FTP" if bike_min >= 80 else "")
        hard = 24 if bike_min >= 80 else 0
    elif phase == "build":
        tgt, hard = "Z2 with 3 × 15 min @ 85–90% FTP", 45
    else:
        tgt, hard = "Z2 with 4 × 10 min @ race effort (90–95% FTP)", 40
    desc = ("Indoor trainer in winter (Zwift or ERG). " if winter else "") + "Eat 60 g carbs/h. Go straight into the run: transition under 2 min."
    if winter:
        desc += " Snowboarding on Saturday? Do this on Sunday instead and drop the Sunday long run."
    w.add(day, {"title": "Brick: " + ("indoor " if winter else "") + "bike", "duration": dur(bike_min), "target": tgt, "description": desc}, "bike", bike_min, 0, hard)
    if run_min:
        quick = phase != "base"
        s = {"title": "Brick: run off the bike", "duration": dur(run_min),
             "target": (f"first 5 min easy, then {z['tempo'] if phase == 'build' else z['r10k']}" if quick else f"easy · {z['easy']}, quick cadence")}
        if note:
            s["description"] = note
        w.add(day, s, "run", run_min, round(run_min * 60 / (z["p"] + (30 if quick else 70)), 1), run_min * 0.6 if quick else 0)


def long_run_min(w, day, mins, z, finish=False, knee=False):
    s = {"title": "Long run", "duration": dur(mins), "target": f"Z2 · {z['easy']}"}
    hard = 0
    if finish:
        s["target"] += f" · last 15 min @ {z['tempo']}"
        hard = 15
    if knee:
        s["description"] = KNEE
    w.add(day, s, "run", mins, round(mins * 60 / (z["p"] + 68), 1), hard)


def tue_run(w, n, phase, f, idx, z):
    """Tuesday noon: the run session. Knee-friendly first (uphill only), track from Build 1."""
    if n <= 4:
        reps = 6 if idx < 9 else 8
        w.add("tue", {"title": "Run: easy + uphill sprints", "steps": [
            {"label": "Easy", "duration": "15min" if idx < 9 else "20min", "target": f"easy · {z['easy']}"},
            {"label": "Uphill sprints", "repeat": reps, "duration": "10s", "target": "steep hill, ~90%, walk down (uphill is kind to the knee)"},
            {"label": "Easy", "duration": "10min"}], "description": KNEE}, "run", 40, 6, reps * 10 / 60)
    else:
        run_quality(w, "tue", phase, f, idx, z)


def week_load(n, phase, f, idx, z, mon, kind):
    w = Week()
    winter = is_winter(mon)
    ramp = spring_ramp(mon)
    p = "specific" if phase == "peak" else phase
    sharpen = kind == "Sharpen"
    if sharpen:
        f *= 0.8
    # Mon: noon jog + evening swim
    jog(w, "mon", r5(min(25 if n == 5 else 35, 18 + 1.2 * idx) * min(f, 1.1)), z, knee=idx < 11)
    swim_technique(w, "mon", f) if p == "base" else swim_endurance(w, "mon", f)
    # Tue: noon run + evening gym A
    tue_run(w, n, p, f, idx, z)
    gym(w, "tue", "base" if n <= 5 and n >= 3 else p if p != "specific" else "specific", "A")
    # Wed: noon football (winter) or easy run; evening gym B
    if winter:
        football(w, "wed")
    else:
        run_easy(w, "wed", rkm(5 * min(f, 1.1)), z)
        w.sessions[-1][1]["title"] = "Noon easy run + strides"
    if not sharpen and p != "specific":
        gym(w, "wed", "upper" if winter or p == "base" else "build", "B")
    # Thu: noon bootcamp + evening swim
    if not sharpen:
        bootcamp(w, "thu")
    swim_css(w, "thu", f, p)
    # Fri: evening gym C in winter base, bike quality from spring
    if winter and p == "base":
        gym(w, "fri", "base", "B")
        bike_endurance(w, "fri", r5(40 * min(f, 1.1)), "Indoor, right after the gym or at home later: Z2, high cadence. Keeps the bike legs through winter.")
        w.sessions[-1][1]["title"] = "Indoor spin"
    else:
        bike_quality(w, "fri", p, f, idx)
        if winter:
            w.sessions[-1][1]["title"] = w.sessions[-1][1]["title"].replace("Bike:", "Indoor bike:")
    # Sat: brick ~2 h (longer from spring)
    bike = r5({"base": 85 if winter else 110, "build": 150, "specific": 140}[p] * f * (ramp if not winter else 1))
    run = r5({"base": 15, "build": 20, "specific": 25}[p] * min(f, 1.1))
    brick(w, "sat", bike, run, z, p, winter, f)
    # Sun: long run (+ optional swim)
    lr = r5(min(85, {"base": 45 + 2 * (idx - 7), "build": 75, "specific": 70}[p] * (f if p != "base" else 1)))
    long_run_min(w, "sun", max(45, lr), z, finish=(p != "base" and idx % 2 == 1))
    if True:
        swim_endurance(w, "sun", 0.8 * f)
        w.sessions[-1][1]["description"] = "Optional if the week has been heavy. Open water when possible from May."
    return w


def add_tests(w, z, run=True):
    """5 km run TT on Saturday (after the brick slot); swim CSS and bike FTP tests on Sunday."""
    if run:
        w.add("sat", {"title": "Test: 5 km run time trial", "distance": "5km", "target": "all-out, even pacing, track or flat loop",
                      "description": "Warm up 15 min + 3 strides. Record time and avg HR: it updates your run paces. "
                                     "Only if the knee has been pain-free for 4 weeks; otherwise run 20 min steady at tempo and note pace and HR."},
              "run", 45, 8.0, 20)
    w.add("sun", {"title": "Test: swim CSS 400 + 200", "steps": [
        {"label": "Warm-up", "distance": "400m"}, {"label": "400 m time trial", "distance": "400m", "target": "all-out"},
        {"label": "Easy", "distance": "200m"}, {"label": "200 m time trial", "distance": "200m", "target": "all-out"},
        {"label": "Cool-down", "distance": "300m"}], "description": "CSS = (400 time − 200 time) / 2 per 100 m."},
          "swim", 40, 1.5, 8)
    w.add("sat" if not run else "sun", {"title": "Test: bike FTP 20 min", "steps": [
        {"label": "Warm-up", "duration": "20min", "target": "incl. 3 × 1 min fast"},
        {"label": "20 min test", "duration": "20min", "target": "best sustainable effort"},
        {"label": "Cool-down", "duration": "15min"}], "description": "FTP ≈ 95% of the 20-min average power. Indoor trainer is fine."},
          "bike", 55, 0, 20)


def week_easy(n, phase, z, mon, tests=False, f=1.0):
    """Calmer week: ~60% of the load. Same rhythm, shorter, almost no intensity."""
    w = Week()
    winter = is_winter(mon)
    swim_easy(w, "mon", r100(2200 * f))
    jog(w, "tue", r5(30 * f), z, title="Noon easy run", strides=True)
    gym(w, "tue", "recovery", "A")
    if winter:
        football(w, "wed", easy=True)
    else:
        jog(w, "wed", r5(30 * f), z, title="Noon easy run")
    bootcamp(w, "thu", easy=True)
    swim_technique(w, "thu", 0.7 * f)
    if tests:
        add_tests(w, z, run=n >= 3)
        if n < 3:
            long_run_min(w, "sun", RTR[3][3], z, knee=True)
    else:
        brick(w, "sat", r5(70 * f), 10, z, "base", winter, f)
        long_run_min(w, "sun", r5(45 * f), z)
    return w


def week_return(i, z, mon, kind, f):
    """Return-to-run weeks (Nov–Dec): the Tuesday and weekend runs follow RTR, everything else is the normal layout."""
    if kind == "Tests":
        w = week_easy(1, "base", z, mon, tests=True, f=0.85)
        w.sessions = [s for s in w.sessions if not (s[0] == "tue" and s[2]["sport"] == "run")]
        jog(w, "tue", RTR[3][1], z, title="Noon easy run", knee=True)
        return w
    m, t, b, su = RTR[i]
    w = Week()
    winter = is_winter(mon)
    if kind != "Start":
        if m:
            jog(w, "mon", m, z, knee=True)
        swim_technique(w, "mon", f)
        jog(w, "tue", t, z, title="Noon easy run", strides=i >= 2, knee=True)
        gym(w, "tue", "return", "A")
        football(w, "wed", easy=True)
        w.sessions[-1][1]["description"] = ("Play at 80% for the first weeks: no all-out sprints, stop if the knee hurts. " + KNEE)
        gym(w, "wed", "upper", "B")
        bootcamp(w, "thu")
        swim_css(w, "thu", f, "base")
    gym(w, "fri", "return", "C")
    brick(w, "sat", r5(60 if kind == "Start" else 75), b, z, "base", winter, f,
          note="Easy jog off the bike, flat. " + KNEE)
    long_run_min(w, "sun", su, z, knee=True)
    if kind == "Start":
        w.sessions[-1][1]["description"] = "Your first run of the plan: the 5 km you ran pain-free last week, slow. " + KNEE
    return w


def week_trip(k, z, mon):
    """Guatemala, 17–30 Dec, and the way back. Light and flexible: do what the day allows."""
    w = Week()
    if k == 1:  # 14–20 Dec: normal Mon–Wed, travel Thu 17
        jog(w, "mon", 20, z, knee=True)
        swim_technique(w, "mon", 0.8)
        jog(w, "tue", 30, z, title="Noon easy run", strides=True, knee=True)
        gym(w, "tue", "return", "A")
        football(w, "wed", easy=True)
        gym(w, "wed", "upper", "B")
        w.add("thu", {"title": "Travel to Guatemala", "sport": "other", "description": "Travel day: walk, stretch, drink a lot. Nothing else."}, "other", 0, 0, 0)
        jog(w, "sat", 35, z, title="Easy run (Guatemala)", knee=True)
        w.sessions[-1][1]["description"] = ("Guatemala City sits at ~1,500 m: run by feel, heart rate will be 5–10 beats higher at the same pace. " + KNEE)
        gym(w, "sun", "travel", "A")
    elif k == 2:  # 21–27 Dec
        for d, mins in (("tue", 35), ("thu", 35), ("sat", 45)):
            jog(w, d, mins, z, title="Easy run (Guatemala)", strides=d == "thu", knee=True)
        gym(w, "mon", "travel", "A")
        gym(w, "fri", "travel", "A")
        w.add("wed", {"title": "Swim or ride if you can (optional)", "sport": "other", "duration": "45min",
                      "description": "Pool, open water, a rental or spin bike: anything aerobic and easy. Skip it without guilt."}, "other", 45, 0, 0)
        w.add("sun", {"title": "Christmas / rest", "sport": "other", "description": "Enjoy it."}, "other", 0, 0, 0)
    else:  # 28 Dec – 3 Jan: back on the 31st, settle in
        jog(w, "mon", 35, z, title="Easy run (Guatemala)", strides=True, knee=True)
        gym(w, "tue", "travel", "A")
        jog(w, "wed", 40, z, title="Easy run (Guatemala)", knee=True)
        w.add("thu", {"title": "Travel home", "sport": "other", "description": "Travel day (31 Dec). Walk and stretch."}, "other", 0, 0, 0)
        brick(w, "sat", 75, 15, z, "base", True, 0.8, note="First session back: easy. " + KNEE)
        long_run_min(w, "sun", 45, z, knee=True)
        swim_technique(w, "sun", 0.7)
    return w


def race_week(z, title, olympic=True):
    w = Week()
    swim_easy(w, "mon", 2000)
    w.add("tue", {"title": "Run: openers", "steps": [
        {"label": "Warm-up", "duration": "15min"}, {"label": "Race pace", "repeat": 4, "distance": "400m", "target": f"{z['r10k']}, 90s jog"},
        {"label": "Cool-down", "duration": "10min"}]}, "run", 38, 7, 6)
    w.add("wed", {"title": "Bike: race-pace openers", "steps": [
        {"label": "Warm-up", "duration": "15min"}, {"label": "Race pace", "repeat": 3, "duration": "3min", "target": "race effort, 3 min easy"},
        {"label": "Sprints", "repeat": 3, "duration": "20s", "target": "out of the saddle"}, {"label": "Cool-down", "duration": "10min"}]}, "bike", 55, 0, 10)
    swim_easy(w, "thu", 1500)
    w.sessions[-1][1]["description"] = "Skip bootcamp this week."
    w.add("fri", {"title": "Rest or 20 min jog", "sport": "other", "description": "Check the bike, pack the bag, sleep."}, "other", 0, 0, 0)
    w.add("sat", {"title": "Pre-race: bike + run openers", "duration": "30min", "target": "easy + 3 × 1 min race effort, then 10 min jog with strides"}, "bike", 40, 0, 4)
    dist = "Olympic: 1.5 km swim · 40 km bike · 10 km run" if olympic else "Sprint: 750 m swim · 20 km bike · 5 km run"
    w.add("sun", {"title": title, "description": f"{dist}. Goals: top-5 swim pack exit, bike in the front pack (38–40 km/h), run {z['r10k']}."},
          "other", 130 if olympic else 70, 0, 100)
    return w


def b_race_week(z, title, sprint):
    w = week_easy(9, "build", z, dt.date(2027, 6, 1), f=0.9)
    w.sessions = [s for s in w.sessions if s[0] not in ("sat", "sun")]
    w.add("sat", {"title": "Pre-race openers", "duration": "30min", "target": "easy bike + 10 min jog with 4 strides"}, "bike", 40, 0, 3)
    w.add("sun", {"title": title, "description": ("Sprint: 750 m · 20 km · 5 km." if sprint else "Olympic: 1.5 km · 40 km · 10 km.") + " Race it hard; it is training for the A races."},
          "other", 70 if sprint else 130, 0, 60 if sprint else 100)
    return w


# ----------------------------------------------------------------------------- build season
def main():
    os.makedirs(OUT, exist_ok=True)
    for old in os.listdir(OUT):
        if old.startswith("block-") and old.endswith(".yaml"):
            os.remove(os.path.join(OUT, old))
    summary = []
    idx = 0
    start = START
    for (n, name, phase, factor, goal, kinds) in BLOCKS:
        z = run_zones(n)
        weeks = []
        for wk, kind in enumerate(kinds, 1):
            mon = start + dt.timedelta(weeks=wk - 1)
            winter = is_winter(mon)
            event = ""
            if n == 1:
                w = week_return(idx, z, mon, kind, factor * LOAD_STEPS.get(kind, 1.0))
                event = "Official start Fri 20 Nov" if kind == "Start" else "Bike + swim tests" if kind == "Tests" else ""
            elif n == 2:
                w = week_trip(wk, z, mon)
                event = {1: "Guatemala from Thu 17 Dec", 2: "Guatemala", 3: "Back on 31 Dec"}[wk]
            elif kind == "Race":
                event = RACE_TITLES[n]
                w = race_week(z, event)
            elif kind.startswith("BRace"):
                event = RACE_TITLES[n]
                w = b_race_week(z, event, sprint=kind.endswith("sprint"))
            elif kind in ("Easy", "Tests"):
                w = week_easy(n, phase, z, mon, tests=kind == "Tests", f=factor * 1.15)
                event = "Tests" if kind == "Tests" else ""
            else:
                w = week_load(n, phase, factor * LOAD_STEPS.get(kind, 1.0), idx, z, mon, kind)
            label = {"BRace-sprint": "Race", "BRace-olympic": "Race", "Tests": "Easy", "Trip-1": "Travel", "Trip-2": "Travel", "Trip-3": "Travel"}.get(kind, kind)
            weeks.append((wk, label, w, event, mon, winter))
            idx += 1

        doc = {"name": f"{n:02d} · {name}", "start": start.isoformat(), "goal": goal, "weeks": []}
        for wk, kind, w, event, mon, winter in weeks:
            order = sorted(w.sessions, key=lambda s: DAYS.index(s[0]))
            doc["weeks"].append({"week": wk, "focus": kind + (" · winter" if winter else ""), "sessions": [s for _, s, _ in order]})
            m = [x for _, _, x in w.sessions]
            summary.append({
                "block": n, "block_name": name, "phase": phase.capitalize(), "week_in_block": wk, "type": kind,
                "monday": mon.isoformat(),
                "swim_km": round(sum(x["km"] for x in m if x["sport"] == "swim"), 1),
                "swim_h": round(sum(x["min"] for x in m if x["sport"] == "swim") / 60, 2),
                "bike_h": round(sum(x["min"] for x in m if x["sport"] == "bike") / 60, 2),
                "run_km": round(sum(x["km"] for x in m if x["sport"] == "run"), 1),
                "run_h": round(sum(x["min"] for x in m if x["sport"] == "run") / 60, 2),
                "gym_n": sum(1 for x in m if x["sport"] == "gym"),
                "gym_h": round(sum(x["min"] for x in m if x["sport"] == "gym") / 60, 2),
                "other_h": round(sum(x["min"] for x in m if x["sport"] == "other") / 60, 2),
                "xtrain_h": round(sum(x["min"] for x in m if x["sport"] == "xtrain") / 60, 2),
                "winter": winter,
                "hard_h": round(sum(x["hard"] for x in m) / 60, 2),
                "pace_10k": mmss(z["p"]),
                "event": event,
            })
        path = os.path.join(OUT, f"block-{n:02d}-{name.lower().replace(' ', '-')}.yaml")
        with open(path, "w") as fh:
            fh.write(f"# Season 2026-27 · block {n} of {len(BLOCKS)} · {name} ({phase}, {len(kinds)} weeks)\n# Generated by scripts/season/generate.py — edit the generator, not this file.\n")
            yaml.dump(doc, fh, Dumper=NoAliasDumper, sort_keys=False, allow_unicode=True, width=120)
        start = start + dt.timedelta(weeks=len(kinds))
    with open(os.path.join(OUT, "season-summary.json"), "w") as fh:
        json.dump({"weeks": summary, "blocks": [dict(n=b[0], name=b[1], phase=b[2], factor=b[3], goal=b[4], weeks=len(b[5])) for b in BLOCKS],
                   "zones": {n: run_zones(n) for n, *_ in BLOCKS}, "start": START.isoformat(),
                   "run_now": mmss(RUN_NOW_10K), "run_goal": mmss(RUN_GOAL_10K)}, fh, indent=1, ensure_ascii=False)
    print(f"wrote {len(BLOCKS)} blocks, {len(summary)} weeks to {os.path.normpath(OUT)}")
    for s in summary:
        tot = s["swim_h"] + s["bike_h"] + s["run_h"] + s["gym_h"] + s["other_h"]
        print(f"B{s['block']:02d}W{s['week_in_block']} {s['monday']} {s['type']:<8}{'*' if s['winter'] else ' '} tot {tot:5.1f}h swim {s['swim_km']:4.1f}km bike {s['bike_h']:4.1f}h run {s['run_km']:5.1f}km/{s['run_h']:.1f}h gym {s['gym_n']} hard {s['hard_h']:.1f}h {s['event']}")


if __name__ == "__main__":
    main()
