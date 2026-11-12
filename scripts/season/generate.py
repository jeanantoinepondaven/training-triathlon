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

# Race / test calendar: (block, week, weekday 0=Mon, kind, title). Move to real dates and re-run.
EVENTS = [
    (1, 2, 5, "test", "Baseline tests"),
    (4, 4, 5, "test", "Tests: end of base"),
    (6, 4, 5, "test", "Tests: end of build"),
    (7, 4, 6, "race_b_sprint", "B race: sprint (placeholder date)"),
    (8, 4, 6, "race_b_olympic", "B race: Olympic (placeholder date)"),
    (9, 4, 6, "race_a", "A race 1: Olympic / national ranking (placeholder date)"),
    (10, 4, 6, "race_b_sprint", "Race: sprint, draft-legal (optional, placeholder)"),
    (11, 4, 6, "race_a", "A race 2: national selection (placeholder date)"),
]

# (number, name, phase, volume factor, goal, weeks). Blocks are 3 load weeks + 1 easy week,
# except the 2-week intro (load + easy/tests) and the peaks (load, load+, sharpen, race).
BLOCKS = [
    (1, "Intro", "base", 0.82, "Ease in, swim technique, baseline tests", 2),
    (2, "Base 1", "base", 0.88, "Aerobic volume, max strength, winter routine", 4),
    (3, "Base 2", "base", 0.95, "Aerobic volume, hills and tempo", 4),
    (4, "Base 3", "base", 1.00, "Biggest base load, end-of-base tests", 4),
    (5, "Build 1", "build", 0.98, "Threshold in all three sports, strength to power", 4),
    (6, "Build 2", "build", 1.04, "Back on the road, longer threshold, first bricks, tests", 4),
    (7, "Build 3", "build", 1.06, "Peak build volume, race pace begins, B sprint race", 4),
    (8, "Specific 1", "specific", 1.00, "Race pace, draft-legal surges, B Olympic race", 4),
    (9, "Peak 1", "peak", 1.00, "Sharpen and taper: A race 1", 4),
    (10, "Race block", "specific", 0.98, "Hold fitness between races, sprint speed", 4),
    (11, "Peak 2", "peak", 1.00, "Sharpen and taper: A race 2 (selection)", 4),
]
GOAL_BLOCK = 9           # 10 km goal pace reached by Peak 1
LOAD_STEPS = {1: 1.00, 2: 1.06, 3: 1.11}  # load weeks 1-3 of a block
EASY = 1.25              # easy week ~ 55-65 % of load week 3

# Winter: less riding (2 indoor sessions), a 3rd gym session, football on Wednesdays, snowboard on Saturdays.
WINTER = ((12, 1), (3, 14))   # (month, day) from 1 Dec to 14 Mar
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


GYM[("winter", "C")] = (
    "Gym C: circuit (strength-endurance)",
    "Your circuit style: 4 rounds of 4, 2 min rest between rounds, steady and high quality. Then 3 exercises × 3 sets.",
    [ex("Kettlebell swing", 4, "15", "24 kg", "2min", "circuit A"),
     ex("Walking lunge", 4, "10/leg", "+16 kg", None, "circuit A"),
     ex("Box jump + step down", 4, "6", "60 cm", None, "circuit A · two-leg, soft landing"),
     ex("Row erg", 4, "250m", "hard", None, "circuit A"),
     ex("Hanging knee raise", 3, "10", None, "60s", "block B"),
     ex("Single-leg glute bridge", 3, "12/leg", None, None, "block B"),
     ex("Farmer carry", 3, "40m", "heavy", None, "block B")])


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
    w.add(day, {"title": "Football (counts as run)", "duration": "1h00", "distance": "6.5km",
                "target": "intermittent: sprints, changes of direction" + (" · play at 80%, no all-out sprints" if easy else ""),
                "description": "Replaces the easy run this week. Ankles: warm up properly. Log distance and HR if your watch tracks it."},
          "run", 60, 6.5, 8 if easy else 18)


def snowboard(w, day, f):
    w.add(day, {"title": "Snowboard day (optional)", "sport": "other",
                "description": "Cross-training: legs, balance, core. Not aerobic triathlon work, and the eccentric load tires the legs: "
                               f"keep Sunday's long run easy. No snow this week? Ride indoor {dur(r5(90 * f))} Z2 with 3 × 10 min tempo instead."},
          "xtrain", 180, 0, 0)


# ----------------------------------------------------------------------------- weeks
def winter_load_week(phase, f, idx, z):
    """Winter layout: Mon swim + Gym C · Tue run quality + Gym A · Wed swim + football ·
    Thu indoor bike quality + Gym B · Fri swim + easy run · Sat snowboard (or indoor ride) · Sun long run."""
    w = Week()
    swim_technique(w, "mon", f) if phase == "base" else swim_endurance(w, "mon", f)
    gym(w, "mon", "winter", "C")
    run_quality(w, "tue", phase, f, idx, z)
    gym(w, "tue", phase, "A")
    swim_css(w, "wed", f, phase)
    football(w, "wed")
    bike_quality(w, "thu", phase, f, idx)
    title, steps = w.sessions[-1][1]["title"], w.sessions[-1][1]["steps"]
    w.sessions[-1][1]["title"] = title.replace("Bike:", "Indoor bike:")
    gym(w, "thu", phase, "B")
    swim_endurance(w, "fri", f) if phase == "base" else swim_technique(w, "fri", f)
    bike_endurance(w, "fri", r5(65 * f), "Indoor trainer. Z2 with 5 × 1 min high cadence (110+ rpm). Keeps the bike legs through winter.")
    w.sessions[-1][1]["title"] = "Indoor bike endurance"
    snowboard(w, "sat", f)
    long_run(w, "sun", min(rkm(15 * f), 20), z, finish=(phase != "base" and idx % 2 == 1))
    return w


def winter_easy_week(z, f, event=None):
    w = Week()
    swim_easy(w, "mon", r100(2200 * f))
    run_easy(w, "tue", rkm(7 * f), z)
    if not event:
        football(w, "wed", easy=True)
    bike_endurance(w, "thu", r5(60 * f), "Indoor, easy, high cadence.")
    gym(w, "thu", "recovery", "A")
    swim_technique(w, "fri", 0.7 * f)
    if event:
        add_tests(w, z)
    else:
        snowboard(w, "sat", f)
        long_run(w, "sun", rkm(11 * f), z)
    return w


def load_week(phase, f, idx, z, sharpen=False, ride_scale=1.0):
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
    ride = r5({"base": 150, "build": 170, "specific": 155}[p] * f * ride_scale)
    brick = {"base": 0, "build": rkm(3 * f), "specific": rkm(5 * min(f, 1.1))}[p]
    long_ride(w, "sat", ride, p, brick, z)
    lr = rkm({"base": 15, "build": 17, "specific": 16}[p] * f)
    long_run(w, "sun", min(lr, 22), z, finish=(p != "base" and idx % 2 == 1))
    bike_endurance(w, "mon", r5({"base": 50, "build": 60, "specific": 60}[p] * f * ride_scale), "Easy spin after the swim: Z1–Z2, high cadence, legs loose for Tuesday.")
    return w


def add_tests(w, z):
    """5 km run TT on Saturday; swim CSS and bike FTP tests on Sunday."""
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
        add_tests(w, z)
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
    week_no = 0
    start = START
    for (n, name, phase, factor, goal, nweeks) in BLOCKS:
        z = run_zones(n)
        weeks = []
        ev = {(e[0], e[1]): e for e in EVENTS}
        for wk in range(1, nweeks + 1):
            event = ev.get((n, wk))
            mon = start + dt.timedelta(weeks=wk - 1)
            winter = is_winter(mon)
            idx = week_no
            week_no += 1
            last = wk == nweeks
            if last and phase == "peak":
                w, kind = race_week(z, event), "Race"
            elif last:
                if event and event[3].startswith("race"):
                    w = b_race_recovery_week(z, event)
                elif winter:
                    w = winter_easy_week(z, factor * EASY, event)
                else:
                    w = recovery_week(phase, z, event, f=factor * EASY)
                kind = "Easy"
            elif phase == "peak" and wk == 3:
                w, kind = load_week(phase, factor, idx, z, sharpen=True), "Sharpen"
            else:
                f = factor * LOAD_STEPS[wk]
                w = winter_load_week(phase, f, idx, z) if winter else load_week(phase, f, idx, z, ride_scale=spring_ramp(mon))
                kind = ["Load", "Load+", "Load++"][wk - 1]
            weeks.append((wk, kind, w, event, mon, winter))

        doc = {
            "name": f"{n:02d} · {name}",
            "start": start.isoformat(),
            "goal": goal,
            "weeks": [],
        }
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
                "event": event[4] if event else "",
            })
        path = os.path.join(OUT, f"block-{n:02d}-{name.lower().replace(' ', '-')}.yaml")
        with open(path, "w") as fh:
            fh.write(f"# Season 2026-27 · block {n} of {len(BLOCKS)} · {name} ({phase}, {nweeks} weeks)\n# Generated by scripts/season/generate.py — edit the generator, not this file.\n")
            yaml.dump(doc, fh, Dumper=NoAliasDumper, sort_keys=False, allow_unicode=True, width=120)
        start = start + dt.timedelta(weeks=nweeks)
    with open(os.path.join(OUT, "season-summary.json"), "w") as fh:
        json.dump({"weeks": summary, "blocks": [dict(n=b[0], name=b[1], phase=b[2], factor=b[3], goal=b[4], weeks=b[5]) for b in BLOCKS],
                   "zones": {n: run_zones(n) for n, *_ in BLOCKS}, "start": START.isoformat(),
                   "run_now": mmss(RUN_NOW_10K), "run_goal": mmss(RUN_GOAL_10K)}, fh, indent=1, ensure_ascii=False)
    print(f"wrote {len(BLOCKS)} blocks, {len(summary)} weeks to {os.path.normpath(OUT)}")
    for s in summary:
        tot = s["swim_h"] + s["bike_h"] + s["run_h"] + s["gym_h"] + s["other_h"]
        print(f"B{s['block']:02d}W{s['week_in_block']} {s['monday']} {s['type']:<8}{'*' if s['winter'] else ' '} tot {tot:5.1f}h xt {s['xtrain_h']:.0f}h swim {s['swim_km']:4.1f}km bike {s['bike_h']:4.1f}h run {s['run_km']:5.1f}km gym {s['gym_n']} hard {s['hard_h']:.1f}h {s['event']}")


if __name__ == "__main__":
    main()
