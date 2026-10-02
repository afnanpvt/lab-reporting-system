# Changelog

Every release is also published on GitHub with its installers. Versions follow
`major.minor.patch` (see the handbook, `docs/licensing-and-releases.md`). Windows 7 builds carry the
same version with a `-win7` tag.

## 2.5.3

### Added
- **Doctors page rebuilt.** The Doctors page is a directory (search, Cards / List, edit, delete). Opening a
  doctor shows their page: qualifications, speciality, phone, a period filter, patients referred, tests
  done, amount billed and the list of patients. **Create incentive report** on that page opens the
  printable report (Super Lab style header, PDF, print) on the same period. Back from the report returns
  to wherever it was opened (the doctor, or Reports).
- **Doctor qualifications.** Referring doctors have a Qualifications field ("MBBS, MD"). It shows on the
  doctor's card, in the doctor dropdown, on the incentive report and in "Referred by Dr. X, MBBS" on
  printed reports.
- **Smart search.** Doctors and Patients search forgives spelling slips and understands more than the name:
  "ravy kumr" finds Ravi Kumar, "mbss" finds every MBBS doctor, "heart" finds a cardiologist, "14" finds
  SID 000014. Patients are also found by mobile, test and referring doctor. `npm run test:search` covers it.
- **Cards and List views** on Doctors, Patients and the Dashboard (remembered). A patient card shows the
  first three tests and a "+N more" chip that opens the full list in place, so cards stay the same height.
- **Day filter on Patients.** A "Show" button slides out Today, Last 7 days, Last 30 days, All or Custom
  (any number of days). The Completed / In progress / Draft chips are now filters too.
- **Period filter on Reports, Analytics and the doctor screens** uses the same slide-out control; the
  period is shared with the incentive report. Reports lists (patient reports, billing, doctor incentives)
  follow it.
- **Unsaved changes.** Leaving a screen with unsaved edits (Back, Cancel, the sidebar, a shortcut) asks
  Save changes / Discard changes / Keep editing. Covers the patient form, doctor form, Settings
  (Laboratory) and the test editor.
- **Reports page tabs** (Patient Reports, Billing, Doctor Incentives) with counts; Analytics
  **Highlights** open and close on demand.
- **Pin the sidebar** so the menu stays open beside the page instead of over it.
- **One look for dates and times.** The browser's own date and time boxes are replaced by an app calendar
  and time picker everywhere, and the custom-days box is a stepper.

### Changed
- The report watermark is the lab's **logo** (faint, grey) instead of the lab name in text.
- Empty dropdowns say "Select" instead of a dash, and **no screen uses em dashes** any more
  (`node scripts/find-emdash.js` checks).
- Window buttons (minimise, maximise, close) are a normal height instead of as tall as the logo header.

### Fixed
- A reference range now follows a changed unit: change a unit and the range text and printed report use it.
- The tab strips no longer show a stray scrollbar.

## 2.5.2

### Fixed
- **Blank first page on a printed report.** A report with one long section (for example a Urine report
  of 11–12 rows) could print with page 1 holding only the patient header and the whole table on page 2.
  The rule that keeps the sign-off from sitting alone on a page was moving the *entire* last section to
  the next page; it now moves only the last couple of rows with the sign-off (as a "(continued)" chunk),
  and moves a whole section only when the page it leaves behind is still well filled. The bug dates from
  the 2.4.0 page-break change and only appeared at particular row counts.
- **Report pages no longer guess how tall things are.** The paginator used fixed sizes (a row is 38px, the
  sign-off is 118px…), so any content taller than the guess — a long test name or result that wraps onto
  extra lines, a method note, a footer with many logos — ran past the bottom of the page and was silently
  clipped (in testing, up to 1,200px of rows lost). Pagination now uses the **measured** height of every
  row, heading and sign-off, and the real room above the footer, taken from an invisible copy of the
  report (`measureReport.ts`). If a page ever still overflows, the report re-paginates with extra room
  rather than clipping.
- A single row is no longer left alone on the next page ("(continued)" with one row), and a page that is
  nearly empty now takes whatever rows fit instead of being skipped.
- **Red ▲/▼ arrows were missing on most tests.** Only Haemoglobin, Total WBC and Platelet Count could
  flag a result outside its reference range; every other test with a numeric range (RBC Count, PCV,
  the differential counts, ESR, MCV/MCH/MCHC, urea, creatinine, uric acid, cholesterol, proteins,
  calcium, all electrolytes, bilirubin, GGT, PT/INR, blood gases, urine microscopy and more — 66 test
  ranges in all) never showed one. Every numeric range now flags a result above or below it, on the
  result sheet and on the printed report. A single test can still be switched off with the
  "Highlight results outside this range" checkbox in its range editor, and the whole feature with
  Settings → Features → Abnormal value highlighting.
- Results typed as a span, such as urine pus cells "4-6/HPF", are judged by both ends (high if any
  part is above the range) instead of by the first number only.
- Others rows now show the red highlight and arrow on the result sheet too (they already did on the
  printed report), judged against the row's own reference range.

### Changed
- **Settings is organised into tabs** — Laboratory, Tests, Preferences, Shortcuts, License & About — instead
  of one long page of cards. Only the Laboratory tab has a Save button (everything else applies at once).
  Unsaved lab details survive switching tabs, the last tab is remembered, and saving in the test editor
  returns to the Tests tab.
- **Settings page layout.** The cards now flow down two balanced columns instead of a fixed left/right
  split with a separate row underneath, which had left a large empty area beside the lab details. No
  gaps, a single column on a narrow window.
- **A proper delete / confirmation dialog.** Deleting a patient, a doctor, a profile or an added test,
  and leaving the test editor with unsaved changes, used to pop up the old Windows message box
  (titled "lumalabs"). They now use the app's own dialog: themed, with the name of what is being
  deleted shown clearly, a red "Delete patient" style button, and Cancel focused by default so a stray
  Enter can't delete anything. Esc or a click outside cancels.

### Added
- `npm run test:pagination` — a regression test that paginates 20,000 random reports (random sections, row
  counts and row heights, including very tall rows) and checks that every row prints once and in order,
  no page overflows, no page holds only the patient header, and the sign-off is not left alone.
- **Automatic thousands separators.** Typing a number of four or more digits into a result adds the
  commas as you go: `20000` becomes `20,000`, `11500` becomes `11,500`, and larger numbers use Indian
  grouping (`1,00,000`). The cursor stays beside the digit you typed, so editing in the middle of a
  number works normally. Only plain numbers change: text, spans like `4-6/HPF`, titres like `1:80`,
  decimals under 1,000 and anything typed with a unit are left exactly as typed. It applies to every
  result box, including Others rows, and to values set with the arrow keys, "use this range" and the
  one-click fixes. Printed reports show the value as entered (`11,500`).

### Notes
- Windows 7 build: `v2.5.2-win7` (Electron 22, 32-bit installer, also runs on 64-bit Windows).

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
