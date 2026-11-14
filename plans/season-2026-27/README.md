# Season 2026–27

Official start Fri 20 Nov 2026 → Sun 5 Sep 2027. Two peaks: A race 1 around 11 July, A race 2 on 5 September.

- **Return** (20 Nov–13 Dec): ease in, return to running after runner's knee (25–30 min runs, +10% a week max), bike FTP + swim CSS tests on 12–13 Dec.
- **Holidays** (14 Dec–3 Jan): normal until Wed 16, Guatemala 17–30 Dec (3 easy runs, 2 bodyweight sessions, swim/ride if possible), back on the 31st.
- From **4 Jan**: blocks of 3 load weeks + 1 easy week (Base 1–3, Build 1–2), then Specific, Peak 1, Race block, Peak 2.

Week layout: Mon noon jog + evening swim · Tue noon run + gym A · Wed noon football (winter) + gym B (upper + core) ·
Thu noon bootcamp + evening swim · Fri gym C (winter) or bike quality (spring) · Sat brick (bike + run, ~2 h; longer in build) · Sun long run + optional swim.

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
- Bike targets are % of FTP and swim targets are relative to CSS until the first tests (12–13 Dec).
- Knee: pain ≤ 2/10 while running and no worse next morning → progress; otherwise repeat the week.
