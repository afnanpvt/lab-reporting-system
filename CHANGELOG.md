# Changelog

Every release is also published on GitHub with its installers. Versions follow
`major.minor.patch` (see the handbook, `docs/licensing-and-releases.md`). Windows 7 builds carry the
same version with a `-win7` tag.

## 2.5.1

### Changed
- **Reference ranges are now chosen, not typed.** The pencil next to a reference range opens an editor
  where you pick the *type* of range — Between (low – high), Up to (≤), Below (<), At least (≥),
  Above (>) or Text only — and enter the number(s). It shows exactly what will print and exactly which
  results will be highlighted ("Red ▲ above 49 IU/L. Nothing is flagged for low values."), and has a
  per-test "Highlight results outside this range" option. Previously every range was a text box and
  the app guessed what it meant from the wording ("Upto 49"). Highlighting now follows the type you
  chose, so a range can no longer be mis-read. The same editor is used for tests added in Settings.
- Ranges that were already saved keep working: they are read once into a type the first time they are
  used, and the editor opens on that type. Nothing needs re-entering.
- Highlighting rules by type: *Between* flags below the low or above the high value; *Up to* only above
  the limit (the limit itself is normal); *Below* at or above the limit; *At least* only below the
  limit; *Above* at or below the limit. Default behaviour is otherwise unchanged: two-sided ranges
  highlight only for Haemoglobin, Total WBC and Platelet Count unless the lab opts a test in with the
  checkbox.

### Added
- **Switches for flagging** (Settings → Features), both on by default:
  - *Abnormal value highlighting* — the red ▲/▼ marks and red result text when a result is outside its
    reference range, on the result sheet and on printed reports.
  - *Smart value checks* — the yellow, red and blue notes on the result sheet (likely typos and unit
    slips, critical values, suggested calculated values) and the "check before report" list.
  Each can be turned off on its own; a lab can use neither, either or both.
- **Saved "Others" tests.** Tests typed under Others are now remembered with their unit and reference
  range, so the next patient can use them without retyping: suggestions appear as you type a name, a
  saved name fills in its unit and reference when you tab out of it, and an "Add a saved test" menu
  lists everything saved. A test is saved automatically once its row has a name and a result and you
  leave the row (so half-typed rows never get saved); an existing entry is never overwritten by a
  one-off change on a single patient, but a blank unit or reference on it is filled in later. Manage
  the list, add tests by hand, or turn automatic saving off in Settings → Saved tests (Others).
- **Editable tests.** Settings → Tests → *Edit tests…* opens a dedicated screen to rename any built-in
  test (e.g. "Plasma Glucose F") and to **add new tests to any section** (name, unit, reference range),
  with search, per-test reset and *Reset names to defaults*. Changes are made only there, never on the
  result sheet, so nothing changes by accident; saving returns to Settings, which is what locks it
  again. Renames apply everywhere a name is shown (result sheet, review warnings, printed report) and
  are per section (renaming Albumin under L.F.T. leaves Urine's Albumin alone). An added test appears
  under "Added tests" at the end of its section on the result sheet, prints like any other result, and
  is flagged against its reference range like an Others row. Duplicate or empty names are refused.
  Removing an added test hides it from the sheet and reports; values already entered stay in the
  database. Antibiotic names and Others rows are not part of this.
- New database table `section_extras` holds the values of added tests (created automatically on
  first launch; existing data is untouched).

### Fixed
- A range like HDL's "> 40" used to be read as "40 – 52" and flagged *high* above 52; it now flags
  *low* at or below 40, which is what the range means.
- Results above an "Upto" or "<" reference range (Post-prandial and Random glucose, SGPT, SGOT,
  Bilirubin, Reticulocyte, the lipid "<" values, Mantoux reading) now get the red ▲ flag. Only
  Haemoglobin, Total WBC and Platelet Count could flag before, so these never showed any warning. Only
  the upper limit flags for these ranges (they have no lower bound), a "<" range counts the limit
  itself as out, and "> 40"-style ranges (HDL) are unchanged.
- Windows 7 build: `v2.5.1-win7` (Electron 22, 32-bit installer, also runs on 64-bit Windows).

## 2.5.0

### Added
- **Analytics page.** A period switcher (7 days, 30 days, 90 days, 12 months, all time) over highlights,
  KPI cards with previous-period comparison, a revenue/patients/tests trend, report completion, top
  investigations, top referring doctors, gender, new vs returning patients, referral source, age
  groups, busiest weekdays and a peak-hours heatmap. Computed live from existing records, no new
  dependencies.
- **Analytics on/off switch** (Settings → Features). Turning it off removes the page from the menu
  and redirects its URL, for labs that don't want revenue figures on screen.
- **Customisable keyboard shortcuts** (Settings → Keyboard shortcuts). Change, add or remove the keys
  for New patient (now works anywhere, Ctrl+N), next/previous field, next/previous section,
  next/previous patient, Review report and the shortcut guide. Conflicts are resolved visibly, unsafe
  keys are refused with a reason, and every row can be reset. The in-app shortcut guide shows the
  lab's current keys.
- **Sidebar fill.** A New Patient button at the top of the expanded sidebar and, at the bottom, a
  "Today" card (patients registered, tests ordered, reports still open — deliberately no money) with
  the license status.

### Fixed
- Analytics and the sidebar's Today card read every patient; the existing patient list call is
  capped at 100 rows and would have under-counted any lab with more.

### Notes
- The Dashboard's counts are still based on the 100 most recent patients (unchanged from before).
- Chart tints use plain opacity instead of CSS `color-mix()`, which the older Chromium inside the Windows 7 build (Electron 22) doesn't support. Looks the same everywhere. This landed on `dev` just after the `v2.5.0` tag and is included in `v2.5.0-win7`.
- Windows 7 builds: `v2.5.0-win7` (Electron 22, 32-bit installer, also runs on 64-bit Windows).
