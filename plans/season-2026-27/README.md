# Season 2026–27

A 2-week intro, then 10 blocks of 4 weeks (3 load + 1 easy), Mon 16 Nov 2026 → Sun 5 Sep 2027.
Two peaks: A race 1 around 11 July, A race 2 on 5 September.
Winter (Dec → mid-March): 2 indoor rides, 3 gym sessions, football on Wednesdays (counts as a run), optional snowboard on Saturdays.

| File | What |
| --- | --- |
| `block-01-intro.yaml` … `block-11-peak-2.yaml` | One cycle per block. Import in the app: **Cycles → Import → Upload file**, about a week before it starts. |
| `season-plan.xlsx` | Method, weekly volumes, volume curves, block totals, zones (fill FTP / CSS after tests), gym plan. |
| `season-summary.json` | Data behind the workbook. |

## Change the plan

1. Edit the `SETTINGS` section of `scripts/season/generate.py`: race dates (`EVENTS`), current and goal 10 km time, block volumes.
2. Regenerate:

```bash
python3 scripts/season/generate.py && python3 scripts/season/build_excel.py
```

Don't edit the YAML files by hand: the next regeneration overwrites them.

## Assumptions to confirm

- Run times are 10 km (36:45 now → 35:00 by late June).
- Race dates are placeholders until the Guatemalan calendar is known.
- Bike targets are % of FTP and swim targets are relative to CSS until the first tests (intro, week 2).
