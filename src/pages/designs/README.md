# Design Gallery (`/designs`)

This folder is a **standalone, front-end-only UI exploration space**, separate from the real app. It exists so alternative visual directions for the Lab Reporter dashboard could be built and compared side by side in a browser before committing to one. It was added in commit `26a6b35` ("Add six alternative dashboard/report designs for comparison").

Read this file before touching anything in `src/pages/designs/` — it explains what's mock vs. real, how routing works, and where the shared logic lives.

## Why this exists

The production app (`src/pages/*`, outside this folder) is an Electron desktop app that talks to a `window.api` IPC bridge (see `src/types/lab.ts` and `src/components/sections/*`) for real patient/report data. That bridge doesn't exist in a plain browser tab, so the real app pages error out there (`Cannot read properties of undefined (reading 'settings'/'patients')` — expected and harmless outside Electron).

The design gallery is the opposite: it's pure React with **no `window.api` calls**, backed entirely by mock data (`mockData.ts`), so every design renders fine in a normal browser tab. That's what makes it possible to open `http://localhost:5173/#/designs` in a regular browser and click through full flows without running Electron at all.

## How to view it

Run the Vite dev server (`npm run dev`, or just the renderer if you don't want the Electron window) and open:

```
http://localhost:5173/#/designs
```

**Important:** the app uses React Router's `HashRouter` (required so routing still works when Electron loads the app from a `file://` URL). In a plain browser you must include the `#`, e.g. `#/designs/6`, not `/designs/6`.

## Routing

All `/designs*` routes are branched out early in [`src/App.tsx`](../../App.tsx):

```tsx
if (location.pathname.startsWith('/designs')) {
  return designRoutes
}
```

`designRoutes` maps:
- `/designs` → [`DesignsIndex.tsx`](DesignsIndex.tsx) — the gallery landing page listing all designs with descriptions/tags
- `/designs/1` .. `/designs/6` → each design's dashboard/patient-register screen
- `/designs/{1-6}/new` → patient entry form for that design
- `/designs/6/tests` → Design 6's "Choose Tests" step (unique to that design)
- `/designs/{2,5,6}/report` → report/result entry screen (only Designs 2, 5, 6 were built out fully)
- `/designs/{2,5,6}/preview` → print-style report preview
- `/designs/{2,5,6}/settings` → settings screen

## What's built out per design

| # | Name | File | Dashboard | Patient Entry | Report Entry | Preview | Settings |
|---|------|------|:---:|:---:|:---:|:---:|:---:|
| 1 | Clinical Minimal | `Design1ClinicalMinimal.tsx` | ✅ | ✅ | — | — | — |
| 2 | Command Console | `Design2CommandConsole.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ |
| 3 | Soft Cards | `Design3SoftCards.tsx` | ✅ | ✅ | — | — | — |
| 4 | Dark Pro | `Design4DarkPro.tsx` | ✅ | ✅ | — | — | — |
| 5 | Compact Utility | `Design5CompactUtility.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ |
| 6 | Manual Entry | `Design6Start.tsx` | ✅ | ✅ (`Design6NewPatient.tsx`) | ✅ (`Design6ResultEntry.tsx`, plus unique `Design6ChooseTests.tsx` step) | ✅ (`Design6ReportPaper.tsx` + `Design6ReportPreview.tsx`) | ✅ |

Designs 1, 3, and 4 were early visual-language comparisons (spacious teal minimal / warm soft cards / dark professional) and were never carried past the dashboard + patient entry stage — the user picked 2, 5, and 6 to develop further. Design 6 was reproduced from a client-supplied handoff folder (`design_handoff_lab_reporter`: `.dc.html` reference files + a spec `README.md` with exact colors/typography/spacing) rather than invented from scratch, and is visually distinct: warm cream/brick palette (`#f4f3f0` / `#b3382c`), big touch-friendly cards, Inter font, and a dedicated "Choose Tests" step the other designs don't have.

## Shared infrastructure

- **[`mockData.ts`](mockData.ts)** — the mock patient list and helpers.
  - `MockPatient` — `{ id, sid, name, age, ageUnit, gender, referredBy, regTime, status: 'draft'|'partial'|'completed', sections: string[] }`. `sections` holds the real section **labels** (from `SECTIONS` in `src/types/lab.ts`), e.g. `'Haematology'`, `'L.F.T.'`.
  - `mockPatients` — 8 fixed demo patients covering all three statuses.
  - `emptyPatientForm()` / `patientToForm()` / `formToPatient()` — used by every design's patient-entry form; `formToPatient` mints a new id as `max(existing ids) + 1`.

- **[`reportFields.ts`](reportFields.ts)** — the bridge to *real* clinical data. This is the one file in the gallery that imports from the production type system (`SECTIONS`, `SECTION_FIELD_KEYS` from `src/types/lab.ts`), and its reference ranges/units are copied verbatim from the real section components (`src/components/sections/Haematology.tsx`, `Biochemistry.tsx`, `Serology.tsx`, `Urine.tsx`, `OtherSections.tsx`) — **not invented**. Key exports:
  - `humanizeKey(key)` — snake_case field key → Title Case label (with an override map for abbreviations like ESR, MCV, SGOT).
  - `sectionKeyForLabel(label)` — maps a display label (e.g. `'L.F.T.'`) to its internal section key.
  - `FIELD_META` / `getReferenceRange(sectionKey, fieldKey, gender?)` — the real, gender-aware reference ranges.
  - `unitFor(sectionKey, fieldKey)` — the real unit for a field.
  - `defaultValueForRange(range)` — turns a range string into a fillable default (midpoint for numeric ranges, first word for qualitative ones). Used for the "click a reference range to fill it in as the value" affordance on Report/Result Entry screens.
  - `flagFor(value, range)` — returns `'high' | 'low' | null`, used to flag abnormal results (red styling, ↑/↓ arrows) on Design 6's entry and preview screens.
  - `initialResultsFor(patient)` — shared demo-fill logic: fills every field if `status === 'completed'`, every other field if `'partial'`, nothing if `'draft'`. This was refactored out of three near-identical copies (Design2/5/6 report-entry files) into one place after a duplication bug surfaced (see below).
  - `mockValueFor(key)` — deterministic hash-based placeholder generator backing `initialResultsFor`.

- **[`DesignSwitcher.tsx`](DesignSwitcher.tsx)** — the nav bar rendered at the top of every design page (`current: number` prop selects the highlighted tab; optional `screen` prop shows a breadcrumb-style label, e.g. `"Report — Ravi Kumar Sharma"`). Lets you jump directly between all 6 designs without going back to the index.

- **[`DesignsIndex.tsx`](DesignsIndex.tsx)** — the `/designs` gallery landing page with a card per design (name, description, tags).

- **[`ReportPaper.tsx`](ReportPaper.tsx)** — shared print-style report layout used by Designs 2 and 5 (letterhead, patient meta, per-section result tables). Design 6 has its own separate `Design6ReportPaper.tsx` instead, since its print spec differs (2-column meta grid, inline value/unit/arrow/range format, single signature block) — don't try to unify these, they're intentionally different layouts.

- **[`Design6Shell.tsx`](Design6Shell.tsx)** — header wrapper unique to Design 6 (logo + "Lab Reporter" wordmark + `headerRight` slot), used by every Design 6 screen except Settings (which deliberately has no logo row, matching the handoff spec).

## Known constraints / gotchas for future changes

- **Global `overflow: hidden` on `<body>`** (`src/styles/index.css`) is intentional for the Electron desktop-app feel, but it means every scrollable design page must supply its own scroll container — use `h-screen overflow-y-auto` (or `min-h-screen` only for pages that never need to scroll past the viewport). A design page using plain `min-h-screen` without an overflow container will appear frozen/non-scrollable in a real browser.
- **Table layouts for the field/value/unit/range rows are a trap**: an HTML `<table className="w-full">` with only some columns given explicit widths lets the remaining column (usually "Normal Range") stretch to fill the entire viewport width and right-align its text far from the input. Use a flex-row layout with explicit `style={{ width: ... }}` on every column instead (see `Design2ReportEntry.tsx` / `Design5ReportEntry.tsx` / `Design6ResultEntry.tsx` for the working pattern).
- **`unitFor` takes two arguments**: `unitFor(sectionKey, fieldKey)`, not `unitFor(fieldKey)`. A stale single-arg call site was previously a real TypeScript error caught by `npx tsc --noEmit -p tsconfig.json` — always run that before considering a design change done.
- **Patients navigate with `location.state`**, not a backend: `navigate('/designs/N/report', { state: { patient } })`. A route that reads `location.state` must fall back to `mockPatients[0]` (or similar) for the case where someone lands on it directly without state (e.g. a hard refresh).
- **Completed patients need `results` in state too**: linking straight to a Preview screen with only `{ patient }` and no `results` renders a report with patient info but zero result rows. Always pass `results: initialResultsFor(patient)` alongside `patient` when deep-linking a `completed`-status patient to a preview screen.

## Extending this gallery

- To flesh out Report Entry/Preview/Settings for Designs 1, 3, or 4, copy the pattern from `Design5ReportEntry.tsx` (simplest) — swap only the visual tokens (colors, spacing, fonts), reuse `reportFields.ts` and `mockData.ts` as-is.
- New shared logic belongs in `reportFields.ts` or `mockData.ts`, not duplicated per design — that duplication already caused one real bug (see `initialResultsFor` above) and cost a refactor to fix.
- This folder is scoped to visual exploration only. None of it should start making real `window.api` calls — if a design "wins" and gets promoted to production, it should be rebuilt against the real data layer in `src/pages/` outside this folder, using this code only as a visual reference.
