# Changelog

Every release is also published on GitHub with its installers. Versions follow
`major.minor.patch` (see the handbook, `docs/licensing-and-releases.md`). Windows 7 builds carry the
same version with a `-win7` tag.

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
- Windows 7 builds: `v2.5.0-win7` (Electron 22, 32-bit installer, also runs on 64-bit Windows).
