# FORM — Personal training journal

A responsive CrossFit journal with 35 imported sessions from September 21–November 14, 2026. Built with vanilla JavaScript, SVG, and Vite.

## Run

```sh
npm ci
npm run dev -- --port 5173
```

Open http://127.0.0.1:5173. The development server is local to this computer. The interface adapts to phones, but cross-device access and synchronization are not configured.

## Weekly updates from GitHub

This repository includes the owner’s actual workout and scan history as a worked example. To keep a separate training log, use **Use this template** to create your own repository and deploy that copy to your own Vercel project. A fresh copy starts with the included history, so its estimates initially describe the example athlete. For personal estimates, replace the example sessions, scan seeds and import batches with your own before first use. Use your own deployment URL to keep browser journals separate.

1. Keep the daily notes or cumulative table in `imports/`. These files document the source; adding a text file alone does **not** change the app.
2. Use [the November workouts](src/november-workouts.js) as the structured example. Give each session a stable ID and date. Keep the board prescription separate from actual sets, weights, scores and substitutions.
3. Register the new sessions in `seed` in [data.js](src/data.js). For existing browsers, append a dated batch and marker to the workout update list and the corresponding batch list in [updates.js](src/updates.js). Preserve older marker strings; set `LATEST_UPDATE` to the new marker for the pre-update backup. Corrections to already imported entries need a targeted migration.
4. Check new movement names against the muscle map, direct-exercise lists and radar rules. Verify one workout in Logbook, Muscle Spotlight and Insights. Run `npm test` and `npm run build`; commit and push your changes. For automatic deployments, connect your own repo in Vercel. A Git push alone does not configure hosting.
5. Browser edits are local and do not update GitHub. Record lasting corrections in your repository and export a browser backup before replacing a journal.

## Features

- Front and back interactive muscle maps with weekly session counts and links to contributing entries.
- Workout creation, editing, deletion, search, and draft extraction from pasted tables or known movement names in notes.
- Separate board prescriptions, actual results, scaling, completion status, total loads, and individual sets.
- Barbell calculator using bar weight plus twice the plate weight per side.
- Confirmed load history, benchmark scores, milestones, and manually tracked goals.
- Browser-local persistence with downloadable JSON backup and validated restore.
- Body page for bioimpedance scans (InBody): weight, skeletal muscle, body fat, lean mass, what the weight is made of, segmental lean mass with left/right comparison, BMI/BMR/SMI, the device's suggested change, raw impedance, and trend lines once there are two or more scans. Each scan shows how many logged sessions fall between it and the previous one. The latest scan also appears on the overview.

## Design

The interface uses a dark "The Box" theme: Big Shoulders Display headlines, Barlow and Barlow Condensed body type, and Permanent Marker on the whiteboard cards. Colors are tokens on `:root` in `src/style.css`. Bumper-plate colors mark workout formats (red for time, blue AMRAP, yellow other) and a red-to-orange heat scale shows muscle-map involvement. Timed scores are drawn as a seven-segment gym clock (`src/led.js`), and icons live in `src/icons.js`. The three direction mockups that preceded the redesign are in `design/mockups/`.

## Data conventions

The September 30 strength overhead squat sets are 3 × 65 lb, 2 × 85 lb, and 2 × 95 lb. These totals include the 45 lb bar and 10/20/25 lb of plates per side. The WOD load remains 65 lb.

Unknown loads stay null. Unconfirmed and skipped entries do not contribute to coverage or confirmed load history. A reported load is not automatically a personal record. Strength sets and WOD loads retain their separate contexts. DB loads without a clear convention remain in the result text rather than total-load charts. The initial data uses 2026, matching the provided weekdays and conversation date.

The muscle map is a coarse, editable movement-to-muscle mapping. It counts unique sessions involving a muscle, excludes warm-ups, and does not estimate volume, hypertrophy, fatigue, recovery, or prescribe training. Reported completed rounds may imply movement involvement, while unknown scaling is retained in the notes. The app does not infer gymnastics skill achievements from workout prescriptions.

Pasted imports create unconfirmed drafts and preserve the pasted source in session notes. Paste one session at a time, then review the date, movements, completion, muscle mapping, and loads before saving. This is deterministic parsing, not an AI service.

The October 5, 2026 InBody 270 scan was transcribed from a photo of the printout; its water, dry lean, and fat masses add up to the printed lean mass and weight, and its arm and leg lean masses reproduce the printed SMI. Body scans are stored as `scans` in the same journal and backups. An existing local journal without the scans field picks up the imported scan on first migration. Explicitly restoring a backup without scans restores an empty scan history, preserving the backup’s contents. Session counts exclude scan dates because workout times are unknown; excluded boundary-day sessions are identified separately. Segment percentages are displayed as device reference values, as printed. Segmental lean mass is not the same as skeletal muscle mass.

Data is stored under `form.training.v1` in localStorage for the current browser and origin. Clearing browser data removes saved edits. Export backups regularly. No account, cloud sync, or backend is configured. Fonts load from Google Fonts with local sans-serif fallbacks; journal data is not sent to a service.

## Validation

```sh
npm test
npm run build
# With the development server running and Google Chrome installed:
node tests/browser.mjs
node tests/analytics-browser.mjs   # set BASE=http://127.0.0.1:<port> to target another port
```

Unit tests cover plate conversion seed data, weekly coverage rules, dates, and backup validation. Browser tests cover navigation, muscle selection, session CRUD, persistence, load history, goals, backup export/restore, table draft extraction, and phone layout. Test browser data is isolated from your normal browser profile.

## Bioimpedance review improvements

The body page supports keyboard-accessible region selection, regional lean-mass deltas, previous-scan or first-scan comparisons, and timestamped charts through the selected scan. Charts label their scales and let you select a scan point. Missing readings remain missing. Consistency checks flag related readings that disagree without rewriting them. Percentage bounds, time format, and positive height are validated. Device changes are called out in comparisons. The imported measurements are preserved; the original scan photo was not reverified in this review.

InBody terminology reference: https://qr.inbody.com/ri/270/adult/en-US

Additional browser checks: `node tests/scans-browser.mjs` (with the local server running).

## October 5 workout update

The cumulative log includes October 1 (8:35), October 2 (16-minute EMOM; no score supplied), and October 5 / Blitzen (14:35). Startup applies this batch once to previously saved journals, preserving other sessions, goals, and scans. It detects existing entries by ID or matching date and title/strength movement. The previous local journal is retained under `form.training.v1.before-workouts-through-2026-10-05`. Update markers are included in backups; explicit restores keep their exact workout contents, and deleted imported workouts are not re-added on reload.

The uncertain pause-snatch progression remains text without a confirmed chart load. Press loads are recorded without inventing six set assignments. New barbell figures are stored as the reported pounds; only September 30 has the explicitly confirmed per-side plate conversion. DB load conventions and unrecorded scaling remain in notes.

## October 17 cumulative update

Eight sessions from October 6–17 are imported as a separate, one-time batch. Earlier deletion markers are honored; saved scans, goals, custom workouts and edits remain intact. The source table is preserved at `imports/workouts-through-2026-10-17.txt`. Skill and Extra sections now persist in the editor and backups. Three additional sessions of 500 single-unders are included. Mixed format/time descriptions and unspecified scaling are retained without inventing missing results. The earlier confirmed overhead squat plate conversion is unchanged; omitted uncertainty notes in a condensed table are not treated as explicit confirmation.

## Goal-focused Insights dashboard

Open `http://127.0.0.1:5173/#insights` or choose Insights. The review uses saved workouts to show weekly attendance, confirmed chest and arm exercise exposure, strength baselines, recovery considerations and gaps in evidence. Session exposure is not treated as effective hypertrophy volume. Recommendations include source links and two editable chest/arm workout drafts; prescriptions are not automatically marked completed.

Optional daily check-ins track weight, waist, chest, upper arm, protein and sleep. They persist locally and travel with backups. Weight comparisons require at least three readings in each of two seven-day windows. Working-set effort (reps in reserve) can now be recorded in the workout editor. One body-composition scan remains a baseline, not proof of fat loss or muscle gain.

Validation: 25 unit tests and production build passed; browser checks verified check-in persistence, workout drafts and set-effort updates on a separate test origin.

## October 24 cumulative update

Five sessions (October 19, 20, 21, 23 and 24) bring the seed journal to 22 sessions. The separate versioned migration preserves saved edits, earlier deletions, goals, scans and check-ins. Source: `imports/workouts-through-2026-10-24.txt`. October 24 includes the 44:54 HYROX result and chest crucifix, biceps curls and rope pushdowns; these names now contribute to the Insights goal counts. Accessory totals are not invented working sets. Press, deadlift and front squat reported 1RMs are recorded; the 120 lb deadlift versus earlier 135 lb WOD discrepancy remains explicitly noted. Human Maker technique has no inferred muscle mapping. Twenty-nine unit tests and production build pass.

## Weekly reviews, workout rankings and progress dashboard (October 24)

Insights now has four tabs: **Dashboard**, **Weekly**, **Rankings** and **Goal review** (the earlier assessment). Links: `#insights`, `#insights/weekly`, `#insights/rankings`, `#insights/review`. Priorities are chest, biceps, triceps and glutes; glutes was added as a fourth focused target (hip thrust, RDL, split squat, step-up, KB swing and similar).

- **Muscle exposure points** (`src/analytics.js`): a direct exercise for a muscle scores 2, a primary role in a compound movement 1 (the first two muscles in its default map), and a secondary role 0.5. Each session is capped at 3 per muscle. Weekly targets are 4 points for priority muscles and 2 for others. Only confirmed, non-warm-up entries count. These are exposure points, not hypertrophy sets.
- **Session demand** uses session-RPE (effort 1–10 × minutes) when you enter RPE and duration in the editor. Otherwise it is estimated: minutes come from the score time, the format ("3 × 5-minute AMRAP", 1K buy-in ≈ 4.5 min), a cap, or a labeled 15-minute default, plus fixed allowances for strength, skill and accessory sections. Effort is estimated by section and multiplied by 0.85–1.15 for muscle breadth. Each session is ranked and compared with the median of the ten sessions before it; a verdict needs at least three earlier sessions. Loads are compared with the heaviest earlier entry for the same movement and section.
- **Weekly review**: a score out of 100 (attendance 20, priority muscles 40, balance 15, load progression 10, load management 15), what went well, what to improve, what was missing (muscles and movement patterns), and the hardest session. Load management uses the weekly load against the average of up to four earlier weeks; it needs two earlier weeks. A priority muscle is met with direct work in two separate sessions plus the point target, or twice the target from compound work alone.
- **Next-week plan**: up to six accessory exercises in two blocks, built from the week's deficits with priority muscles first. Two exercises for the same muscle go on different days. Plans repeat your most recent direct exercise so you can progress it, show your last logged load, and trim to two sets when weekly load is above ×1.5 your recent average (×1.3–1.5 only adds a caution, because the accessory work itself raises load). "Open as workout draft" creates unconfirmed entries. Follow-through shows whether the next week covered the plan; plans for weeks before Oct 26, 2026 were generated in hindsight.
- **Dashboard charts** (`src/charts.js`, hand-built SVG, no dependencies): muscle radar against target (versus the 4-week average or the week before), priority-muscle weekly bars, weekly load with ratios, weekly score trend and breakdown, session-demand timeline with a rolling median, lift progression with toggles (filled dots are strength, hollow are WOD), movement-pattern radar, and a muscle × week heat map. Every chart has hover/focus tooltips and a table view. Chart colors passed a colorblind-separation check against the card surface.
- Logbook cards show each session's rank and its difference from your usual. The overview shows this week's grade and next focus. Saving a session reports its rank.

Session `rpe` and `minutes` are optional and validated in backups. Validation: 38 unit tests (`tests/analytics.test.js` adds 9), the production build, and all four browser suites pass.

## October 31 cumulative update

Five sessions (October 26, 27, 28, 30 and 31) bring the seed journal to 27 sessions, applied once by the versioned `workouts-through-2026-10-31` migration that keeps saved edits, deletions, goals, scans and check-ins. Source: `imports/workouts-through-2026-10-31.txt`. Reported 1RMs are recorded for clean (105), back squat (145), bench press (165) and jerk (130). Hyrox Saturday keeps its three separate AMRAP scores (estimated as 42 minutes of work). The 145 lb Hyrox deadlifts are above the 120 lb 1RM reported Oct 21; both stay as reported.

Accessory names follow the plan: Low / Mid / High cable flies are logged as low-to-high, mid and high-to-low; "Cable Bicep Curl" is Cable Curl and "Overhead Tricep Extension" is Overhead Triceps Extension. Plans match these to the Bayesian curl and overhead cable extension slots and show the last entry as logged. Per-side cable loads, the Nancy "65 lb DBs (scaled)" overhead squats, and curls with an unspecified implement keep their loads in the result text. Rope pushdown and cable curl are cable-stack loads (4×12 sets recorded).

Load progression is now a grid of small charts, one per lift with at least two entries. The change badge compares the latest entry with the first one from the same section; a 1RM is never compared with a WOD load. Validation: 43 unit tests (`tests/october31.test.js` adds 5), the production build, and all four browser suites pass.

## Balance rule (October 31)

Muscle points cannot tell a pull-up from a row, so plans also check four kinds of work each week: rows (horizontal pulling, not the rowing machine), rear-shoulder work (face pulls, reverse flies), direct core (toes-to-bar, sit-ups, planks, hollow holds, knee raises) and hamstring curls (knee flexion; deadlifts and swings only train hamstrings at the hip). When the week had pressing but no rows, the plan adds a seated cable row or single-arm DB row and face pulls on both days. Missing core and hamstring-curl work each add one exercise. Each item drops out once that kind of work appears in a week. Follow-through credits a balance item only for the same kind of work, so pull-ups do not count as a row.

Balance items start with the plan for the week of November 2, 2026 (`BALANCE_LIVE_FROM`). The plan already shown for October 26 is unchanged. Weekly reviews list balance gaps under "Not in this week" for every week. Lower back and calves are no longer suggested when the week had hinging or regular running, because those load them more than the points show. Block length is estimated at about two minutes per set; large plans suggest supersets. Validation: 46 unit tests, the production build and all four browser suites pass.

## October 31 body scan (Fit Profile)

A second scan from a different device (Fit Profile report, October 31, 09:49) is added once by the `scans-through-2026-10-31` update, which keeps deletions and any scan already logged for that date. The journal from before the update is kept under `form.training.v1.before-scans-through-2026-10-31`. Source transcription: `imports/scan-fitprofile-2026-10-31.txt`. The report is in kilograms; values are converted at 2.20462 lb/kg and rounded to 0.1 lb, and the original kilograms are kept in the scan notes. Dry lean mass is protein + bone mass. Segment lean is the device's soft lean mass, reported to 0.1 kg.

Scans can now carry optional fat-distribution readings (`extras`: visceral fat level, subcutaneous fat in lb, waist-hip ratio and fat per segment with % of the device reference). They are validated, editable in the scan editor, and shown on the Body page as "Where the fat sits". The waist-hip ratio is the scale's estimate, not a tape measurement. Because the two scans come from different devices, the Body page and the Insights fat-loss card label the comparison as a rough direction rather than a measured change. Validation: 49 unit tests (`tests/scan-oct31.test.js` adds 3), the production build and all four browser suites pass.

## Calories and daily targets (Nutrition tab)

Open `#insights/nutrition`. Every session gets an estimate of **active calories** (energy above rest, like a watch's "active" number). Each part of a session is costed as (MET − 1) × body weight in kg × hours, using MET values from the 2024 Compendium of Physical Activities: warm-up 3.0 (02056, 10 min per class), AMRAP/for-time WOD 7.5 (02040), EMOM/interval WOD 7.0 (02210), run-heavy WOD or HYROX 8.5 (12030), barbell strength 5.0 (02052), skill 3.0, accessories 3.5 (02054, 2 min per set) and jump rope 11.0 (02068, 5 min per 500 reps). Durations reuse the demand estimate (score time, format, section allowances). Body weight is the latest scan or weighed check-in on or before the session. Session RPE adjusts effort by up to ±25%, and recorded minutes rescale the time. Ranges of ±25% are shown; the estimates lean conservative on purpose (`src/energy.js`).

Daily targets: resting energy from lean mass (Katch–McArdle, 370 + 21.6 × lean kg, which matches both scan devices' BMR) × an everyday-movement factor (mostly sitting 1.2, lightly active 1.35, active 1.5), plus expected training (recent sessions per week × typical session + the next week's accessory blocks), minus a deficit sized by pace (gentle 0.25%, steady 0.5%, faster 0.75% of body weight a week at ~3,500 kcal per lb). Training days get the training calories; rest days do not; targets never go below resting energy. Protein is 2.4 g per kg of lean mass (dieting range 2.3–3.1, Helms et al. 2014), fat ~0.8 g per kg of body weight, and carbs fill the rest. The two settings are stored as `nutrition` in the journal and backups.

Because workouts are logged after they happen, targets are presented as the standard for the coming week: each weekly review's plan ends with a "Fuel" line for the following week, and the overview shows it. Check-ins accept "Calories eaten"; with about two weeks of logged intake and morning weights (two 7-day averages), the app shows a maintenance figure calibrated from the actual weight trend. Scans with a rate (currently −0.84 lb/week across two devices) are compared with the chosen pace. Rankings can sort by active calories; the session analysis, logbook cards and save toast show the estimate. Validation: 57 unit tests (`tests/energy.test.js` adds 8), the production build and all four browser suites pass.
