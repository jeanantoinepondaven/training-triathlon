# Cycle file format

A cycle is a YAML file. Import it from **Cycles → Import** (paste or upload). The app validates it, shows a preview, then creates one session per entry.

Validate a file offline with `npm run check-cycle -- path/to/cycle.yaml`.

```yaml
name: Block 3 – Threshold       # required
start: 2026-11-16               # required; week 1 starts on the Monday of this date's week
goal: Sub-45 10k                # optional, shown on the week view

weeks:
  - week: 1                     # 1, 2, 3…  (weeks can be skipped or listed in any order)
    focus: Volume               # optional, shown as "Focus: …" on that week
    sessions:
      - day: mon                # mon tue wed thu fri sat sun (or full names)
        sport: gym              # gym | run | bike | swim | other
        title: Lower body A     # optional (defaults to Strength / Run / Ride / Swim / Session)
        description: Tempo 3-1-1 on squats   # optional free text
        exercises:              # required for gym
          - { name: Back squat, sets: 4, reps: 6, load: 80kg, rest: 2min }
          - { name: RDL, sets: 3, reps: 8-10, load: RPE 8 }
          - { name: Plank, sets: 3, reps: 45s, notes: slow breathing }

      - day: tue
        sport: run
        title: Easy run
        distance: 8km           # km, m, mi/miles, yd
        target: 5:45/km · Z2    # free text: pace, zone, power, HR…

      - day: thu
        sport: run
        title: Intervals
        steps:                  # optional structured workout
          - { label: Warm-up, duration: 15min }
          - { label: 1 km reps, repeat: 6, distance: 1km, target: "4:10/km" }
          - { label: Cool-down, duration: 10min }

      - day: sat
        sport: bike
        duration: 2h30          # 45min, 1h30, 90s, 1:30:00, 25:00
        target: Z2 · 180–200 W
```

## Rules

| Field | Notes |
|---|---|
| `load` | `80kg` / `175lb` are parsed as weights (used for progress charts). Anything else (`RPE 8`, `75%`, `bodyweight`) is kept as text. |
| `reps` | Number or text: `6`, `8-10`, `AMRAP`, `30s`. The log form pre-fills the first number. |
| Several sessions on one day | Just list them; they keep the order of the file. |
| Totals | If an endurance session only has `steps`, distance and duration are summed from the steps (when every step has one). |
| Quote values containing `:` | e.g. `target: "4:10/km"`. In YAML, `4:10` alone can be misread. |

Moving a session in the app changes its `date` but keeps its original `plannedDate`, so you can always see what moved and reset it.
