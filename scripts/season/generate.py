"""
Season generator: Nov 2026 -> Sep 2027, 14 blocks of 3 weeks (2 load + 1 recovery).

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
RUN_GOAL_10K = 35 * 60                 # 35:00, reached by block 11 (late June)
GOAL_BLOCK = 11

# Race / test calendar: (block, week, weekday 0=Mon, kind, title). Move to real dates and re-run.
EVENTS = [
    (1, 3, 5, "test", "Baseline tests"),
    (4, 3, 5, "test", "Tests: end of base"),
    (7, 3, 5, "test", "Tests: mid build"),
    (8, 3, 6, "race_b_sprint", "B race: sprint (placeholder date)"),
    (10, 3, 6, "race_b_olympic", "B race: Olympic (placeholder date)"),
    (11, 3, 6, "race_a", "A race 1: Olympic / national ranking (placeholder date)"),
    (12, 3, 6, "race_b_sprint", "Race: sprint, draft-legal (optional, placeholder)"),
    (14, 3, 6, "race_a", "A race 2: national selection (placeholder date)"),
]

# (number, name, phase, volume factor, goal)
BLOCKS = [
    (1, "Base 1", "base", 0.85, "Rebuild the routine, swim technique, baseline tests"),
    (2, "Base 2", "base", 0.92, "Aerobic volume, max strength foundation"),
    (3, "Base 3", "base", 1.00, "Aerobic volume, hills and tempo"),
    (4, "Base 4", "base", 1.06, "Biggest base load, end-of-base tests"),
    (5, "Build 1", "build", 0.98, "Threshold in all three sports, strength to power"),
    (6, "Build 2", "build", 1.03, "Longer threshold, first bricks"),
    (7, "Build 3", "build", 1.08, "Peak build volume, mid-season tests"),
    (8, "Build 4", "build", 1.06, "Race-pace introduction, B sprint race"),
    (9, "Specific 1", "specific", 1.00, "Race pace + draft-legal surges, power maintenance"),
    (10, "Specific 2", "specific", 1.05, "Race simulations, B Olympic race"),
    (11, "Peak 1", "peak", 1.00, "Sharpen and taper: A race 1"),
    (12, "Race block", "specific", 0.95, "Hold fitness between races, sprint speed"),
    (13, "Rebuild", "specific", 1.02, "Last big specific block"),
    (14, "Peak 2", "peak", 0.98, "Sharpen and taper: A race 2 (selection)"),
]
LOAD2 = 1.08     # week 2 = week 1 x 1.08
RECOVERY = 0.62  # recovery week ~ 60-65 % of week 2
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


def run_quality(w, day, phase, f, idx, z):
    wu = [{"label": "Warm-up", "duration": "15min", "target": f"easy · {z['easy']} + drills"}]
    cd = [{"label": "Cool-down", "duration": "10min", "target": "easy"}]
    if phase == "base":
        opts = [
            ([{"label": "Hill reps", "repeat": 8, "duration": "1min", "target": "uphill 6–8%, strong, jog down"}], 8, 16, "Run: hills"),
            ([{"label": "Tempo", "repeat": 3, "duration": "10min", "target": f"{z['tempo']}, 2 min jog"}], 30, 34, "Run: tempo"),
            ([{"label": "Fartlek", "repeat": 10, "duration": "1min", "target": f"{z['thr']}, 1 min easy"}], 10, 20, "Run: fartlek"),
        ]
    elif phase == "build":
        opts = [
            ([{"label": "Threshold", "repeat": 5, "distance": "1km", "target": f"{z['thr']}, 90s jog"}], 5 * z["p"] / 60, 5 * z["p"] / 60 + 6, "Run: threshold km"),
            ([{"label": "Threshold", "repeat": 3, "distance": "2km", "target": f"{z['thr']}, 2 min jog"}], 6 * z["p"] / 60, 6 * z["p"] / 60 + 4, "Run: 3 × 2 km"),
            ([{"label": "VO2", "repeat": 6, "distance": "800m", "target": f"{z['vo2']}, 2 min jog"}], 4.8 * z["p"] / 60, 4.8 * z["p"] / 60 + 10, "Run: VO2 800s"),
        ]
    else:
        opts = [
            ([{"label": "Race pace", "repeat": 6, "distance": "1km", "target": f"10 km race pace {z['r10k']}, 75s jog"}], 6 * z["p"] / 60, 6 * z["p"] / 60 + 6, "Run: race-pace km"),
            ([{"label": "Race pace", "repeat": 3, "distance": "3km", "target": f"{z['r10k']}, 2 min jog"}], 9 * z["p"] / 60, 9 * z["p"] / 60 + 4, "Run: 3 × 3 km"),
            ([{"label": "Speed", "repeat": 8, "distance": "400m", "target": f"{z['vo2']} or faster, 90s jog"}], 3.2 * z["p"] / 60 * 0.97, 3.2 * z["p"] / 60 + 11, "Run: 400s speed"),
        ]
    main, hard, mins, title = opts[idx % len(opts)]
    w.add(day, {"title": title, "steps": wu + main + cd}, "run", 25 + mins, round((25 + mins) * 60 / (z["p"] + 40), 1), round(hard))


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


def gym(w, day, phase, kind):
    title, desc, exercises = GYM[(phase, kind)]
    mins = 40 if kind == "B" and phase == "build" else 45 if phase in ("specific", "recovery") else 60
    w.add(day, {"title": title, "description": desc, "exercises": exercises}, "gym", mins, 0, 0)


# ----------------------------------------------------------------------------- weeks
def load_week(phase, f, idx, z, sharpen=False):
    """Hard/easy layout: Mon easy · Tue run quality + heavy gym · Wed swim + bike quality ·
    Thu easy run + power gym · Fri swim · Sat long ride (+ brick) · Sun long run."""
    w = Week()
    p = "specific" if phase == "peak" else phase
    if sharpen:
        f *= 0.85
    swim_technique(w, "mon", f) if p == "base" else swim_endurance(w, "mon", f)
    run_quality(w, "tue", p, f, idx, z)
    gym(w, "tue", p if p != "specific" else "specific", "A")
    swim_css(w, "wed", f, p)
    bike_quality(w, "wed", p, f, idx)
    run_easy(w, "thu", rkm({"base": 8, "build": 9, "specific": 9}[p] * f), z)
    if p in ("base", "build") and not sharpen:
        gym(w, "thu", p, "B")
    else:
        dist = r100(2000 * min(f, 1.1))
        w.add("thu", {"title": "Swim: speed + race skills", "distance": f"{dist}m",
                      "target": "12 × 50m fast (25 m sprint / 25 m easy), sighting, drafting on feet, deck-up starts",
                      "description": "Open water or with a training partner when possible: practise swimming on someone's feet and around buoys."},
              "swim", dist / 100 * 2.0, dist / 1000, 8)
    (swim_technique if p != "base" else swim_endurance)(w, "fri", f)
    ride = r5({"base": 150, "build": 170, "specific": 155}[p] * f)
    brick = {"base": 0, "build": rkm(3 * f), "specific": rkm(5 * min(f, 1.1))}[p]
    long_ride(w, "sat", ride, p, brick, z)
    lr = rkm({"base": 15, "build": 17, "specific": 16}[p] * f)
    long_run(w, "sun", min(lr, 22), z, finish=(p != "base" and idx % 2 == 1))
    bike_endurance(w, "mon", r5({"base": 50, "build": 60, "specific": 60}[p] * f), "Easy spin after the swim: Z1–Z2, high cadence, legs loose for Tuesday.")
    return w


def recovery_week(phase, z, event=None, f=1.0):
    """Calmer week: ~60-65% of the load weeks. Same rhythm, shorter, almost no intensity."""
    w = Week()
    swim_easy(w, "mon", r100(2200 * f))
    run_easy(w, "tue", rkm(7 * f), z)
    bike_endurance(w, "wed", r5(70 * f), "Easy, high cadence. Legs should feel fresh by the weekend.")
    gym(w, "thu", "recovery", "A")
    swim_technique(w, "fri", 0.7 * f)
    if event and event[3] == "test":
        run_easy(w, "thu", rkm(6 * f), z, strides=False)
        w.add("sat", {"title": "Test: 5 km run time trial", "distance": "5km", "target": "all-out, even pacing, track or flat loop",
                      "description": "Warm up 15 min + 3 strides. Record time and avg HR: it updates your run paces."},
              "run", 45, 8.0, 20)
        w.add("sun", {"title": "Test: swim CSS 400 + 200", "steps": [
            {"label": "Warm-up", "distance": "400m"}, {"label": "400 m time trial", "distance": "400m", "target": "all-out"},
            {"label": "Easy", "distance": "200m"}, {"label": "200 m time trial", "distance": "200m", "target": "all-out"},
            {"label": "Cool-down", "distance": "300m"}], "description": "CSS = (400 time − 200 time) / 2 per 100 m."},
              "swim", 40, 1.5, 8)
        w.add("sun", {"title": "Test: bike FTP 20 min", "steps": [
            {"label": "Warm-up", "duration": "20min", "target": "incl. 3 × 1 min fast"},
            {"label": "20 min test", "duration": "20min", "target": "best sustainable effort"},
            {"label": "Cool-down", "duration": "15min"}], "description": "FTP ≈ 95% of the 20-min average power. Indoor trainer is fine."},
              "bike", 55, 0, 20)
    else:
        bike_endurance(w, "sat", r5(120 * f), "Z2 with 3 × 3 min @ 95% FTP to stay sharp.")
        long_run(w, "sun", rkm(12 * f), z)
    return w


def race_week(z, event):
    w = Week()
    swim_easy(w, "mon", 2000)
    w.add("tue", {"title": "Run: openers", "steps": [
        {"label": "Warm-up", "duration": "15min"}, {"label": "Race pace", "repeat": 4, "distance": "400m", "target": f"{z['r10k']}, 90s jog"},
        {"label": "Cool-down", "duration": "10min"}]}, "run", 38, 7, 6)
    w.add("wed", {"title": "Bike: race-pace openers", "steps": [
        {"label": "Warm-up", "duration": "15min"}, {"label": "Race pace", "repeat": 3, "duration": "3min", "target": "race effort, 3 min easy"},
        {"label": "Sprints", "repeat": 3, "duration": "20s", "target": "out of the saddle"}, {"label": "Cool-down", "duration": "10min"}]}, "bike", 55, 0, 10)
    swim_easy(w, "thu", 1500)
    w.add("fri", {"title": "Rest or 20 min jog", "sport": "other", "description": "Check the bike, pack the bag, sleep."}, "other", 0, 0, 0)
    w.add("sat", {"title": "Pre-race: bike + run openers", "duration": "30min", "target": "easy + 3 × 1 min race effort, then 10 min jog with strides"}, "bike", 40, 0, 4)
    kind = event[3] if event else "race_a"
    dist = "Olympic: 1.5 km swim · 40 km bike · 10 km run" if "olympic" in kind or kind == "race_a" else "Sprint: 750 m swim · 20 km bike · 5 km run"
    w.add("sun", {"title": event[4] if event else "Race", "description": f"{dist}. Goals: top-5 swim pack exit, bike in the front pack (38–40 km/h), run {z['r10k']}."},
          "other", 130 if "Olympic" in dist else 70, 0, 100)
    return w


def b_race_recovery_week(z, event):
    w = recovery_week("x", z, f=0.9)
    w.sessions = [s for s in w.sessions if s[0] not in ("sat", "sun")]
    w.add("sat", {"title": "Pre-race openers", "duration": "30min", "target": "easy bike + 10 min jog with 4 strides"}, "bike", 40, 0, 3)
    sprint = "sprint" in event[3]
    w.add("sun", {"title": event[4], "description": ("Sprint: 750 m · 20 km · 5 km." if sprint else "Olympic: 1.5 km · 40 km · 10 km.") + " Race it hard; it is training for the A races."},
          "other", 70 if sprint else 130, 0, 60 if sprint else 100)
    return w


# ----------------------------------------------------------------------------- build season
def main():
    os.makedirs(OUT, exist_ok=True)
    summary = []
    for (n, name, phase, factor, goal) in BLOCKS:
        start = START + dt.timedelta(weeks=3 * (n - 1))
        z = run_zones(n)
        weeks = []
        ev = {(e[0], e[1]): e for e in EVENTS}
        for wk in (1, 2, 3):
            event = ev.get((n, wk))
            idx = (n - 1) * 2 + (wk - 1)
            if wk == 3:
                if phase == "peak":
                    w = race_week(z, event)
                elif event and event[3].startswith("race"):
                    w = b_race_recovery_week(z, event)
                else:
                    w = recovery_week(phase, z, event, f=factor * 1.15)
                kind = "Race" if phase == "peak" else "Recovery"
            else:
                f = factor * (LOAD2 if wk == 2 else 1.0)
                w = load_week(phase, f, idx, z, sharpen=(phase == "peak" and wk == 2))
                kind = "Sharpen" if (phase == "peak" and wk == 2) else ("Load" if wk == 1 else "Load+")
            weeks.append((wk, kind, w, event))

        doc = {
            "name": f"{n:02d} · {name}",
            "start": start.isoformat(),
            "goal": goal,
            "weeks": [],
        }
        for wk, kind, w, event in weeks:
            order = sorted(w.sessions, key=lambda s: DAYS.index(s[0]))
            doc["weeks"].append({"week": wk, "focus": kind, "sessions": [s for _, s, _ in order]})
            mon = start + dt.timedelta(weeks=wk - 1)
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
                "hard_h": round(sum(x["hard"] for x in m) / 60, 2),
                "pace_10k": mmss(z["p"]),
                "event": event[4] if event else "",
            })
        path = os.path.join(OUT, f"block-{n:02d}-{name.lower().replace(' ', '-')}.yaml")
        with open(path, "w") as fh:
            fh.write(f"# Season 2026-27 · block {n} of {len(BLOCKS)} · {name} ({phase})\n# Generated by scripts/season/generate.py — edit the generator, not this file.\n")
            yaml.dump(doc, fh, Dumper=NoAliasDumper, sort_keys=False, allow_unicode=True, width=120)
    with open(os.path.join(OUT, "season-summary.json"), "w") as fh:
        json.dump({"weeks": summary, "blocks": [dict(n=b[0], name=b[1], phase=b[2], factor=b[3], goal=b[4]) for b in BLOCKS],
                   "zones": {n: run_zones(n) for n, *_ in BLOCKS}, "start": START.isoformat(),
                   "run_now": mmss(RUN_NOW_10K), "run_goal": mmss(RUN_GOAL_10K)}, fh, indent=1, ensure_ascii=False)
    print(f"wrote {len(BLOCKS)} blocks, {len(summary)} weeks to {os.path.normpath(OUT)}")
    for s in summary:
        tot = s["swim_h"] + s["bike_h"] + s["run_h"] + s["gym_h"] + s["other_h"]
        print(f"B{s['block']:02d}W{s['week_in_block']} {s['monday']} {s['type']:<8} tot {tot:5.1f}h swim {s['swim_km']:4.1f}km bike {s['bike_h']:4.1f}h run {s['run_km']:5.1f}km gym {s['gym_n']} hard {s['hard_h']:.1f}h {s['event']}")


if __name__ == "__main__":
    main()
