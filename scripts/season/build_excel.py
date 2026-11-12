"""Builds plans/season-2026-27/season-plan.xlsx from season-summary.json (run generate.py first)."""
import datetime as dt
import json
import os

from openpyxl import Workbook
from openpyxl.chart import BarChart, LineChart, Reference
from openpyxl.comments import Comment
from openpyxl.formatting.rule import FormulaRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.table import Table, TableStyleInfo

import generate as G

HERE = os.path.dirname(__file__)
OUT = os.path.normpath(os.path.join(HERE, "..", "..", "plans", "season-2026-27"))
data = json.load(open(os.path.join(OUT, "season-summary.json")))
W = data["weeks"]

F = "Arial"
H1 = Font(name=F, size=16, bold=True)
H2 = Font(name=F, size=12, bold=True)
B = Font(name=F, size=10, bold=True)
N = Font(name=F, size=10)
INPUT = Font(name=F, size=10, color="0000FF")          # generated / editable inputs
LINK = Font(name=F, size=10, color="008000")           # links to another sheet
WHITE = Font(name=F, size=10, bold=True, color="FFFFFF")
HEAD_FILL = PatternFill("solid", fgColor="111316")
YELLOW = PatternFill("solid", fgColor="FFF4B8")
KEY = PatternFill("solid", fgColor="FFFF00")
REC_FILL = PatternFill("solid", fgColor="DCF3E5")
RACE_FILL = PatternFill("solid", fgColor="FFD60A")
thin = Side(style="thin", color="D9DCD4")
GRID = Border(bottom=thin)
WRAP = Alignment(wrap_text=True, vertical="top")

wb = Workbook()


def header(ws, row, labels, widths=None):
    for i, lab in enumerate(labels, 1):
        c = ws.cell(row=row, column=i, value=lab)
        c.font, c.fill = WHITE, HEAD_FILL
        c.alignment = Alignment(wrap_text=True, vertical="center")
    ws.row_dimensions[row].height = 30
    if widths:
        for i, w in enumerate(widths, 1):
            ws.column_dimensions[get_column_letter(i)].width = w


# ------------------------------------------------------------------ Weekly plan
ws = wb.active
ws.title = "Weekly plan"
cols = ["Week", "Block", "Phase", "Week type", "Monday", "Swim km", "Swim h", "Bike h", "Run km", "Run h", "Gym sessions",
        "Gym h", "Race / test h", "Total h", "Endurance h", "Intensity h", "Intensity %", "Load ratio (vs 4-wk avg)", "10 km pace target", "Test / race",
        "Snowboard h (optional)", "Winter"]
header(ws, 1, cols, [7, 15, 10, 11, 12, 9, 8, 8, 9, 8, 9, 8, 9, 9, 10, 10, 10, 12, 11, 44, 12, 8])
for i, w in enumerate(W, start=2):
    r = i
    vals = [i - 1, f"{w['block']:02d} · {w['block_name']}", w["phase"], w["type"], dt.date.fromisoformat(w["monday"]),
            w["swim_km"], w["swim_h"], w["bike_h"], w["run_km"], w["run_h"], w["gym_n"], w["gym_h"], w["other_h"]]
    for c, v in enumerate(vals, 1):
        cell = ws.cell(row=r, column=c, value=v)
        cell.font = INPUT if c >= 6 else N
    ws.cell(row=r, column=5).number_format = "dd mmm yy"
    ws.cell(row=r, column=14, value=f"=G{r}+H{r}+J{r}+L{r}+M{r}")
    ws.cell(row=r, column=15, value=f"=G{r}+H{r}+J{r}+M{r}")
    ws.cell(row=r, column=16, value=w["hard_h"]).font = INPUT
    ws.cell(row=r, column=17, value=f"=IF(O{r}=0,0,P{r}/O{r})")
    ws.cell(row=r, column=18, value=f"=IF(ROW()<6,1,N{r}/AVERAGE(N{max(2, r - 4)}:N{r - 1}))" if r > 2 else 1)
    ws.cell(row=r, column=19, value=w["pace_10k"]).font = INPUT
    ws.cell(row=r, column=20, value=w["event"] or None).font = N
    ws.cell(row=r, column=21, value=w["xtrain_h"]).font = INPUT
    ws.cell(row=r, column=21).number_format = "0.0"
    ws.cell(row=r, column=22, value="Yes" if w["winter"] else "").font = N
    for c in range(14, 19):
        ws.cell(row=r, column=c).font = N
    for c in (6, 7, 8, 9, 10, 12, 13, 14, 15, 16):
        ws.cell(row=r, column=c).number_format = "0.0"
    ws.cell(row=r, column=17).number_format = "0%"
    ws.cell(row=r, column=18).number_format = "0.00"
last = len(W) + 1
tot = last + 1
ws.cell(row=tot, column=1, value="Total").font = B
for c, fmt in ((6, "0"), (7, "0"), (8, "0"), (9, "0"), (10, "0"), (11, "0"), (12, "0"), (13, "0"), (14, "0"), (15, "0"), (16, "0"), (21, "0")):
    col = get_column_letter(c)
    cell = ws.cell(row=tot, column=c, value=f"=SUM({col}2:{col}{last})")
    cell.font, cell.number_format = B, fmt
ws.cell(row=tot, column=17, value=f"=P{tot}/O{tot}").number_format = "0%"
ws.cell(row=tot, column=17).font = B
ws.cell(row=tot + 1, column=1, value="Avg / wk").font = B
for c in (6, 8, 9, 14, 21):
    col = get_column_letter(c)
    cell = ws.cell(row=tot + 1, column=c, value=f"=AVERAGE({col}2:{col}{last})")
    cell.font, cell.number_format = B, "0.0"
ws.freeze_panes = "F2"
ws.auto_filter.ref = f"A1:V{last}"
ws.conditional_formatting.add(f"A2:V{last}", FormulaRule(formula=['$D2="Easy"'], fill=REC_FILL))
ws.conditional_formatting.add(f"A2:V{last}", FormulaRule(formula=['$D2="Race"'], fill=RACE_FILL))
ws.conditional_formatting.add(f"R2:R{last}", FormulaRule(formula=[f"R2>1.3"], font=Font(name=F, color="C8281B", bold=True)))
note_r = tot + 3
for k, t in enumerate([
    "Blue numbers come from the generator (scripts/season/generate.py); black cells are formulas.",
    "Green rows = easy weeks (every 4th week). Yellow rows = race weeks (taper). Winter = Dec to mid-March: indoor riding, 3 gym sessions, football, snowboard.",
    "Snowboard hours are optional cross-training and are NOT in Total h (Saturday is snowboard OR an indoor ride). Football is counted as a run.",
    "Intensity h = time at threshold or above (incl. race-pace and VO2 work). Target ≈ 15–22% of endurance time in build/specific.",
    "Load ratio = this week's hours / average of the previous 4 weeks. Above 1.3 (red) is a spike to watch.",
    "Hours are estimates from planned durations and target paces; your logged sessions in the app are the truth.",
]):
    ws.cell(row=note_r + k, column=1, value=t).font = Font(name=F, size=9, italic=True, color="585D63")

# ------------------------------------------------------------------ Blocks
bs = wb.create_sheet("Blocks")
header(bs, 1, ["Block", "Phase", "Start", "End", "Total h", "Avg h / wk (load weeks)", "Swim km", "Bike h", "Run km", "Intensity h", "Goal of the block"],
       [16, 10, 12, 12, 9, 12, 9, 9, 9, 10, 60])
for i, b in enumerate(data["blocks"], start=2):
    name = f"{b['n']:02d} · {b['name']}"
    start = dt.date.fromisoformat(next(w["monday"] for w in W if w["block"] == b["n"]))
    bs.cell(row=i, column=1, value=name).font = B
    bs.cell(row=i, column=2, value=b["phase"].capitalize()).font = N
    bs.cell(row=i, column=3, value=start).number_format = "dd mmm yy"
    bs.cell(row=i, column=4, value=f"=C{i}+{7 * b['weeks'] - 1}").number_format = "dd mmm yy"
    rng = lambda col: f"'Weekly plan'!${col}$2:${col}${last}"
    crit = f"'Weekly plan'!$B$2:$B${last},A{i}"
    bs.cell(row=i, column=5, value=f"=SUMIFS({rng('N')},{crit})")
    bs.cell(row=i, column=6, value=f"=AVERAGEIFS({rng('N')},{crit},'Weekly plan'!$D$2:$D${last},\"<>Easy\",'Weekly plan'!$D$2:$D${last},\"<>Race\")")
    bs.cell(row=i, column=7, value=f"=SUMIFS({rng('F')},{crit})")
    bs.cell(row=i, column=8, value=f"=SUMIFS({rng('H')},{crit})")
    bs.cell(row=i, column=9, value=f"=SUMIFS({rng('I')},{crit})")
    bs.cell(row=i, column=10, value=f"=SUMIFS({rng('P')},{crit})")
    bs.cell(row=i, column=11, value=b["goal"]).font = N
    for c in range(3, 11):
        bs.cell(row=i, column=c).font = LINK if c >= 5 else N
        if c >= 5:
            bs.cell(row=i, column=c).number_format = "0.0"
bs.freeze_panes = "B2"

# ------------------------------------------------------------------ Charts
cs = wb.create_sheet("Charts")
cs["A1"] = "Season volume curves"
cs["A1"].font = H1
cs["A2"] = "All charts read the Weekly plan sheet: change the plan, the curves follow."
cs["A2"].font = N
cats = Reference(ws, min_col=5, min_row=2, max_row=last)


def place(ch, anchor, title, ytitle):
    ch.title, ch.y_axis.title, ch.height, ch.width = title, ytitle, 9, 26
    ch.x_axis.number_format = "dd mmm"
    ch.x_axis.title = "Week (Monday)"
    ch.legend.position = "b"
    cs.add_chart(ch, anchor)


c1 = BarChart(); c1.type = "col"; c1.grouping = "stacked"; c1.overlap = 100; c1.gapWidth = 30
for col in (7, 8, 10, 12):
    c1.add_data(Reference(ws, min_col=col, min_row=1, max_row=last), titles_from_data=True)
c1.set_categories(cats)
colors = ["0D9488", "2B83D9", "E0560B", "7655E3"]
for s, colr in zip(c1.series, colors):
    s.graphicalProperties.solidFill = colr
    s.graphicalProperties.line.solidFill = colr
place(c1, "A4", "Weekly hours by sport (stacked) — 3 load weeks + 1 easy week", "Hours")

c2 = LineChart()
for col, colr in ((9, "E0560B"), (6, "0D9488")):
    c2.add_data(Reference(ws, min_col=col, min_row=1, max_row=last), titles_from_data=True)
c2.set_categories(cats)
for s, colr in zip(c2.series, ("E0560B", "0D9488")):
    s.graphicalProperties.line.solidFill = colr
    s.graphicalProperties.line.width = 28000
    s.smooth = False
place(c2, "A23", "Run km and swim km per week", "km")

c3 = LineChart()
c3.add_data(Reference(ws, min_col=14, min_row=1, max_row=last), titles_from_data=True)
c3.add_data(Reference(ws, min_col=16, min_row=1, max_row=last), titles_from_data=True)
c3.set_categories(cats)
c3.series[0].graphicalProperties.line.solidFill = "111316"
c3.series[1].graphicalProperties.line.solidFill = "C8281B"
for s in c3.series:
    s.graphicalProperties.line.width = 28000
    s.smooth = False
place(c3, "A42", "Total hours vs intensity hours (threshold and above)", "Hours")

c4 = LineChart()
c4.add_data(Reference(ws, min_col=18, min_row=1, max_row=last), titles_from_data=True)
c4.set_categories(cats)
c4.series[0].graphicalProperties.line.solidFill = "2B83D9"
c4.series[0].graphicalProperties.line.width = 28000
c4.series[0].smooth = False
place(c4, "A61", "Load ratio (week vs previous 4-week average) — keep most weeks between 0.8 and 1.3", "Ratio")

# ------------------------------------------------------------------ Zones
zs = wb.create_sheet("Zones")
zs["A1"] = "Training zones"; zs["A1"].font = H1
zs["A2"] = "Yellow cells are yours to fill after each test week (intro, end of base, end of build). Everything else recalculates."; zs["A2"].font = N
zs["A4"] = "Bike FTP (W)"; zs["A4"].font = B
zs["B4"] = 280; zs["B4"].font = INPUT; zs["B4"].fill = KEY
zs["B4"].comment = Comment("Placeholder. Replace with 95% of your 20-min test power (first test: block 1, week 3).", "Plan")
zs["A5"] = "Swim CSS (sec per 100 m)"; zs["A5"].font = B
zs["B5"] = 85; zs["B5"].font = INPUT; zs["B5"].fill = KEY
zs["B5"].comment = Comment("Placeholder (1:25/100 m). CSS = (400 m time − 200 m time) / 2, in seconds.", "Plan")
zs["A6"] = "Body mass (kg)"; zs["A6"].font = B
zs["B6"] = 72; zs["B6"].font = INPUT; zs["B6"].fill = KEY
zs["B6"].comment = Comment("Placeholder, used for W/kg.", "Plan")
zs["A7"] = "FTP (W/kg)"; zs["A7"].font = B
zs["B7"] = "=B4/B6"; zs["B7"].number_format = "0.00"

zs["A9"] = "Bike zones"; zs["A9"].font = H2
header(zs, 10, ["Zone", "% FTP low", "% FTP high", "Watts low", "Watts high", "Use"])
bike = [("Z1 recovery", 0, 0.55, "Recovery spins"), ("Z2 endurance", 0.56, 0.75, "Long rides, easy spins"), ("Z3 tempo", 0.76, 0.87, "Base tempo"),
        ("Sweet spot", 0.88, 0.93, "Race pace (Olympic, non-drafting)"), ("Z4 threshold", 0.94, 1.05, "Threshold intervals"),
        ("Z5 VO2", 1.06, 1.20, "VO2 intervals"), ("Surges", 1.20, 1.50, "Draft-legal attacks, bridging")]
for i, (z, lo, hi, use) in enumerate(bike, start=11):
    zs.cell(row=i, column=1, value=z).font = N
    zs.cell(row=i, column=2, value=lo).font = INPUT
    zs.cell(row=i, column=3, value=hi).font = INPUT
    zs.cell(row=i, column=4, value=f"=ROUND($B$4*B{i},0)")
    zs.cell(row=i, column=5, value=f"=ROUND($B$4*C{i},0)")
    zs.cell(row=i, column=6, value=use).font = N
    zs.cell(row=i, column=2).number_format = zs.cell(row=i, column=3).number_format = "0%"

zs["A19"] = "Swim paces (per 100 m)"; zs["A19"].font = H2
header(zs, 20, ["Pace", "Offset vs CSS (s)", "Pace /100 m", "", "", "Use"])
swim = [("Easy / technique", 8, "Warm-ups, drills, recovery"), ("Endurance", 5, "Long aerobic sets"), ("CSS", 0, "Threshold 100s"),
        ("Race pace (Olympic)", -1, "Race-specific sets"), ("Sprint start", -8, "First 25–50 m of a race")]
for i, (z, off, use) in enumerate(swim, start=21):
    zs.cell(row=i, column=1, value=z).font = N
    zs.cell(row=i, column=2, value=off).font = INPUT
    c = zs.cell(row=i, column=3, value=f"=($B$5+B{i})/86400")
    c.number_format = "m:ss"
    zs.cell(row=i, column=6, value=use).font = N

zs["A27"] = "Run paces by block (from the plan; goal 10 km " + data["run_goal"] + ", now " + data["run_now"] + ")"; zs["A27"].font = H2
header(zs, 28, ["Block", "10 km pace", "Easy / long", "Tempo", "Threshold", "VO2 / 5 km pace"])
for i, (n, z) in enumerate(data["zones"].items(), start=29):
    name = next(f"{b['n']:02d} · {b['name']}" for b in data["blocks"] if str(b["n"]) == str(n))
    for c, v in enumerate([name, z["r10k"], z["easy"], z["tempo"], z["thr"], z["vo2"]], 1):
        zs.cell(row=i, column=c, value=v).font = N if c == 1 else INPUT
for c, w in zip("ABCDEF", (24, 14, 16, 16, 16, 34)):
    zs.column_dimensions[c].width = w

# ------------------------------------------------------------------ Gym
gs = wb.create_sheet("Gym")
gs["A1"] = "Gym plan by phase (your circuit format)"; gs["A1"].font = H1
gs["A2"] = "Circuit A = 4 rounds of 4 exercises back to back, 2–5 min rest between rounds by intensity. Block B = 3 exercises, 3–4 sets."; gs["A2"].font = N
header(gs, 4, ["Phase", "Session", "Part", "Exercise", "Sets", "Reps", "Load", "Rest", "Notes"], [10, 30, 10, 26, 6, 10, 18, 8, 40])
r = 5
order = [("base", "A"), ("base", "B"), ("winter", "C"), ("build", "A"), ("build", "B"), ("specific", "A"), ("recovery", "A")]
for key in order:
    title, desc, exs = G.GYM[key]
    for e in exs:
        notes = e.get("notes", "")
        part = "Circuit A" if notes.startswith("circuit A") else "Block B"
        row = [key[0].capitalize(), title, part, e["name"], e["sets"], e["reps"], e.get("load", ""), e.get("rest", ""), notes.replace("circuit A", "").replace("block B", "").strip(" ·")]
        for c, v in enumerate(row, 1):
            gs.cell(row=r, column=c, value=v).font = N
        r += 1
    r += 1
gs.cell(row=r + 1, column=1, value="Frequency: winter (Dec–mid Mar) 3 per load week (C circuit Mon, A heavy Tue, B power Thu); spring build 2; specific & peak 1; easy weeks 1 light; none in race week.").font = B

# ------------------------------------------------------------------ Method (first tab)
ms = wb.create_sheet("Method", 0)
ms.column_dimensions["A"].width = 28
ms.column_dimensions["B"].width = 100
ms["A1"] = "Season 2026–27 · " + G.ATHLETE; ms["A1"].font = H1
ms["A2"] = f"16 Nov 2026 → 5 Sep 2027 · 2-week intro + 10 blocks of 4 weeks (3 load + 1 easy) · generated {dt.date.today().isoformat()}"; ms["A2"].font = N
LOADW = [w for w in W if w["type"] in ("Load", "Load+")]
tot_h = lambda w: w["swim_h"] + w["bike_h"] + w["run_h"] + w["gym_h"] + w["other_h"]
hb = [tot_h(w) for w in LOADW if w["phase"] == "Base"]
hbu = [tot_h(w) for w in LOADW if w["phase"] == "Build"]
hs = [tot_h(w) for w in LOADW if w["phase"] in ("Specific", "Peak")]
VOLUME_TEXT = (f"Load weeks: base {min(hb):.0f}–{max(hb):.0f} h, build {min(hbu):.0f}–{max(hbu):.0f} h, specific/peak {min(hs):.0f}–{max(hs):.0f} h "
               f"(easy weeks ~55–65% of that). Swim {min(w['swim_km'] for w in LOADW):.0f}–{max(w['swim_km'] for w in LOADW):.0f} km/week, "
               f"run {min(w['run_km'] for w in LOADW):.0f}–{max(w['run_km'] for w in LOADW):.0f} km/week, bike {min(w['bike_h'] for w in LOADW):.1f}–{max(w['bike_h'] for w in LOADW):.1f} h/week. "
               f"Season total ≈ {sum(tot_h(w) for w in W):.0f} h.")
rows = [
    ("GOALS", None),
    ("National team", "Top 5 at Guatemalan national championships / selection races (sprint and Olympic, draft-legal)."),
    ("Run", f"10 km: {data['run_now']} now (3:40 /km) → {data['run_goal']} (3:30 /km) by Peak 1 in early July. Assumed 10 km — confirm."),
    ("Bike", "Hold 38–40 km/h in Olympic and sprint races: in draft-legal racing this means making the front pack and surviving surges, not solo power."),
    ("Swim", "Exit with the front pack: the swim decides which bike group you race in. Biggest lever for top 5."),
    ("STRUCTURE", None),
    ("3 + 1 blocks", "Every block is 3 load weeks (+6%, +11%) then 1 easy week at ~55–65% of the load. A 2-week intro block (Nov) eases you in and sets the baseline tests. Tests and B races sit in easy weeks, A races in taper weeks."),
    ("Phases", "Intro (2 wk) · Base (Dec–Feb): aerobic volume, technique, max strength · Build (late Feb–mid May): threshold in all three sports, strength → power · Specific (May–Jun, Jul): race pace, draft-legal surges, bricks · Peak 1 (A race ~11 Jul) · Peak 2 (A race 5 Sep)."),
    ("Intensity", "Mostly easy (~80%), hard days really hard (~15–22% at threshold or above in build/specific). Hard/easy rhythm: Tue and Sat hard, Wed moderate, Mon/Thu/Fri easy, Sun long and easy."),
    ("Week layout (spring/summer)", "Mon swim + easy spin · Tue run quality + Gym A · Wed swim CSS + bike quality · Thu easy run + Gym B (or swim speed in specific) · Fri swim · Sat long ride (+ brick) · Sun long run."),
    ("Week layout (winter)", "Mon swim + Gym C circuit · Tue run quality + Gym A · Wed swim + football at noon · Thu indoor bike quality + Gym B · Fri swim + indoor endurance ride · Sat snowboard (or indoor ride) · Sun long run."),
    ("WINTER", None),
    ("Riding", "Dec to mid-March: 2 indoor rides a week (1 quality, 1 endurance, ~2.5 h). The gym takes the freed time (3 sessions). From mid-March rides grow back over 4 weeks (70% → 100%)."),
    ("Football", "Counts as a run (~6.5 km, intermittent). It replaces the easy run, not the quality run or the long run. Good for speed and agility; warm up the ankles. Easy weeks: play at 80%. Not in test weeks."),
    ("Snowboard", "Real cross-training (legs, balance, core) but not aerobic triathlon work, and it tires the legs eccentrically. Saturday = snowboard or indoor ride. Keep Sunday's long run easy after a board day; if you ride both days, shorten the long run to ~10 km or move it to Monday."),
    ("Volume", VOLUME_TEXT),
    ("TRACK (SPEED)", None),
    ("Why", "Your sprint background (22.7 / 49.6) is a weapon for the race finish, but speed is not your limiter: 3:30/km is ~55% of your 400 m speed. Track work keeps the speed cheaply; the gains come from threshold work."),
    ("How", "Base: 6 × 60 m flying sprints before Tuesday's main set (fresh, full recovery). Build: every other Tuesday on the track, 6 × 800 or 5 × 1000 at 5 km pace + 4 × 150 m fast and relaxed. Specific: every other Tuesday a kick session (3 × 1200 m at 10 km pace into 200 m fast) or 10 × 400 at 3 km pace."),
    ("Avoid", "Old 300–400 m lactic sessions (costly, overlap with threshold work). Max-speed work only when fresh: never after heavy gym or a long ride. Hamstrings: warm up with drills, flats until spring."),
    ("STRENGTH", None),
    ("Why it changes", "You are already strong and explosive (80 cm single-leg box jump). The gym now serves running economy, durability and race surges: heavy + power in base/build, then 1 short power session a week to keep it while the endurance load rises."),
    ("Rules", "Heavy legs on the same day as hard running (Tue) so easy days stay easy. Never to failure. No heavy lower body within 48 h of a race. Drop to 1 light session in calmer weeks."),
    ("TESTS AND RACES", None),
    ("Tests", "Intro week 2 (late Nov), end of base (mid Feb), end of build (mid Apr), in easy weeks: 5 km run TT, swim CSS 400/200, bike FTP 20 min. Update the Zones sheet after each test."),
    ("Races (placeholders)", "Sprint B race 16 May, Olympic B race 13 Jun, A race 1 11 Jul, optional sprint 8 Aug, A race 2 (selection) 5 Sep. Replace with the real Guatemalan calendar and re-run the generator."),
    ("ADAPT", None),
    ("When life happens", "Move sessions in the app; never stack two hard days. Missed a key session? Skip it, don't squeeze it in. Sick or very tired: turn the week into a calmer week."),
    ("Altitude / heat", "If you train at altitude (e.g. Guatemala City ~1,500 m) run paces will feel ~2–4% harder: use effort/HR on threshold days and save exact paces for sea-level races."),
    ("HOW TO CHANGE THE PLAN", None),
    ("Edit", "Change SETTINGS in scripts/season/generate.py (dates, races, paces, block volumes), run it, then build_excel.py. Import each block's YAML in the app (Cycles → Import) about a week before it starts."),
]
r = 4
for k, v in rows:
    if v is None:
        r += 1
        ms.cell(row=r, column=1, value=k).font = H2
    else:
        ms.cell(row=r, column=1, value=k).font = B
        c = ms.cell(row=r, column=2, value=v)
        c.font, c.alignment = N, WRAP
        ms.row_dimensions[r].height = max(15, 15 * (len(v) // 95 + 1))
    r += 1

for sheet in wb.worksheets:
    sheet.sheet_view.showGridLines = sheet.title not in ("Method", "Charts")

path = os.path.join(OUT, "season-plan.xlsx")
wb.save(path)
print("saved", path)
