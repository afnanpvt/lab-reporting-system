# LumaLabs

A modern, offline-first desktop application for laboratory patient registration, result entry, report generation, and billing — built for Windows.

This build is licensed exclusively to **Super Lab Service** (Vaniyambadi) — see [Licensing](#licensing) below. The underlying platform is generic (nothing is hardcoded to one lab's data), but each real-world install is a separate signed, separately-built copy for one specific lab.

## What's in here

Every screen lives under `src/pages/site/`, backed by a single data-access module (`src/pages/site/api.ts`) that talks to the Electron main process over IPC (`window.api.*`). Nothing touches the database directly from the UI.

- **Dashboard** — registered/needs-attention/completed counts, recent patients.
- **Analytics** — charts and insights on how the lab is doing; see [Analytics](#analytics). Can be switched off per lab.
- **Patients** — search, status pills (draft / in progress / completed — always computed live from actual saved results, never manually overridden), referring doctor shown per patient.
- **Patient Entry** — register or edit a patient: name, age, gender, mobile, address, referring doctor, which of the 12 test sections apply, and a consent checkbox.
- **Result Entry** — one test section at a time, a local checklist rail showing completion state per section, prev/next patient navigation, live abnormal-value flagging against reference ranges, click-to-prefill from the printed reference range.
- **Report Preview** — the actual printable A4 report, paginated in JavaScript (`pagination.ts`) so what's on screen is exactly what prints; printed via the browser's native print dialog (`window.print()`), which also offers "Save as PDF."
- **Bill** — per-patient line items derived from a rate card, with per-patient-per-section amount overrides (rates aren't fixed).
- **Doctors / Incentive Report** — referring doctors, who they've referred, and a printable incentive statement per doctor.
- **Reports** — every completed report and bill in one place.
- **Settings** — lab identity (address/phone/email/doctor — editable; the lab *name* is locked to the license, see below), the Analytics on/off switch, [keyboard shortcuts](#keyboard-shortcuts), appearance, and a note confirming everything is stored locally.

12 laboratory categories are supported end to end: Haematology, Biochemistry, Serology, Urine, Motion, C.S. (with a 20-antibiotic antibiogram grid), Mantoux, G.T.T./S.A./Lipid, Blood Group, Electrolytes, L.F.T., and ABG/Sputum.

## Analytics

The **Analytics** page (sidebar, bar-chart icon) turns the lab's own records into something readable, with a period switcher (7 days, 30 days, 90 days, 12 months, all time):

- **Highlights** — plain-language findings (revenue up/down on the previous period, busiest weekday, top test, top referring doctor).
- **KPI cards** — revenue, patients, tests, average bill and completion rate, each compared with the previous period.
- **Trend chart** — revenue / patients / tests by day, week or month. The still-running current week or month is drawn dashed so it isn't read as a drop.
- **Breakdowns** — report completion, top investigations, top referring doctors, gender, new vs returning patients (matched by mobile number, else name), doctor-referred vs walk-in, age groups, busiest weekdays and a peak-hours heatmap.

Everything is computed on the fly from the existing patient, billing and rate-card data — nothing extra is stored, and there are no charting dependencies (the charts are hand-drawn SVG in `src/pages/site/Analytics.tsx`; the maths is in `analyticsData.ts`). Revenue uses the same `priceFor()` as the Bill and the doctors' incentive reports, so the numbers always agree with them.

Because it shows money, a lab can hide it completely: **Settings → Features → Analytics**. Off removes it from the menu and redirects the URL. The choice is stored per lab in the database (`lab_settings.feature_analytics`; on unless set to `0`). The sidebar's "Today" card deliberately shows no money (patients, tests, open reports).

## Keyboard shortcuts

Shortcuts are customisable per lab in **Settings → Keyboard shortcuts**: click a shortcut, press the new keys. Esc cancels, Backspace removes it, each row can be reset, and "Reset all" restores the defaults. A key already in use is moved to the new action (the old one becomes unassigned, and the row says so).

| Action | Default |
|---|---|
| New patient (anywhere) | Ctrl + N |
| Next field / alternate / previous field (Result Entry) | Tab / Enter / Shift + Tab |
| Previous / next section | Ctrl + ↑ / Ctrl + ↓ |
| Previous / next patient | Page Up / Page Down |
| Review report | Ctrl + Enter |
| Open the shortcut guide | ? |

Fixed and not editable: ↑/↓ value stepping (Shift for bigger steps) and Esc to clear a field. Only changes from the defaults are stored (`lab_settings.shortcut_bindings`, JSON), so a future change to a default reaches every lab that never touched that action.

Rules the recorder enforces: a plain letter, digit, arrow, Enter or Esc on its own is refused (it would get in the way of typing) — except Tab/Enter for the field-navigation rows — and Alt+F4 is refused because Windows takes it first. Ctrl+A/C/V/X/Z/Y can be assigned but only fire when focus is *not* in a text field, so select-all and copy/paste keep working. Everything lives in `src/pages/site/shortcutsStore.ts` (actions, defaults, matching) and `ShortcutSettings.tsx` (the editor).

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Shell | Electron 32 (22.3.27 on the `win7-compat` branch — see [Windows 7](#windows-7-builds)) | Native Windows printing, no browser sandbox limitations |
| UI | React 18 + TypeScript + Vite | Fast dev loop, typed IPC contract |
| Styling | Tailwind CSS | Utility classes, no separate design-token build step |
| Local database | sql.js (SQLite compiled to WASM) | Zero native build tooling required — no Visual Studio Build Tools, no Python |
| Routing | React Router (HashRouter) | Plays nicely with Electron's `file://` production loading |
| Licensing | Ed25519 signatures (Node's built-in `crypto`) | Fully offline verification, no server round-trip |

Everything runs fully offline. There is no server, no API, no network call anywhere in the data path — patient data lives in a single local SQLite file.

## Prerequisites

- **Windows 10/11** — required for full functionality (native printing). The UI will run in dev mode on macOS/Linux for review, but printing and packaging target Windows only.
- **[Node.js](https://nodejs.org/) 18 LTS or newer** (20 LTS recommended) — includes npm.
- **Git**

No database server, no Docker, no API keys, no `.env` file.

## Getting started

```bash
git clone https://github.com/afnanpvt/lab-reporting-system.git
cd lab-reporting-system
npm install
npm run dev
```

`npm run dev` starts the app in an Electron window with hot reload. On first launch it creates its own local database and seeds default settings.

Since this build is license-gated (see below), **dev mode also needs a valid `resources/license.json`** in the project root to get past the startup check — without one the app refuses to launch, by design.

> **Windows-specific note:** the `dev` script uses `cross-env` so it works from PowerShell, Git Bash, or cmd.exe without extra setup.

### If `npm install` complains about scripts being blocked

This project uses `electron` and `esbuild`, which run a postinstall step. If npm reports blocked/ignored scripts, approve them once and reinstall:

```bash
npm approve-builds electron esbuild
npm install
```

## Available scripts

| Command | What it does |
|---|---|
| `npm run dev` | Launches the app in development mode with hot reload |
| `npm run build` | Bundles main/preload/renderer for production via `electron-vite` |
| `npm run preview` | Runs the production build locally without packaging |
| `npm run package` | Runs `build` then `electron-builder` to produce a distributable — see [Packaging](#packaging) |

To type-check explicitly:

```bash
npx tsc --noEmit -p tsconfig.web.json    # renderer
npx tsc --noEmit -p tsconfig.node.json   # main + preload
```

## Project structure

```
lab-app/
├── electron/
│   ├── main/
│   │   ├── db.ts        # sql.js init, schema, migrations, dbRun/dbGet/dbAll helpers
│   │   ├── ipc.ts        # every window.api.* handler
│   │   ├── license.ts    # signed-license verification (see Licensing)
│   │   └── index.ts      # app bootstrap: license check → window → IPC registration
│   └── preload/          # contextBridge — the only surface the renderer can call into main
├── src/
│   ├── pages/site/        # every screen, plus api.ts (the sole data-access layer)
│   ├── components/
│   │   └── ErrorBoundary.tsx  # catches render errors and shows them on screen instead of a blank page
│   └── types/lab.ts       # shared types + the per-section field-key registry
├── scripts/
│   └── license.js         # issues a trial or full license for a profile (needs the private key — never in this repo)
├── resources/
│   ├── icon.ico            # app icon
│   └── license.json         # staged from the applied profile by `npm run profile` (gitignored)
└── tailwind.config.js
```

## Data & privacy

All patient records, results, and settings live in a single local SQLite file:

- **Development:** `lab-app/lab-data.db` (project root, gitignored)
- **Packaged app:** `%APPDATA%\LumaLabs\lab-data.db`

Nothing is uploaded anywhere. The app enforces a single-instance lock, so two copies can never run against the same database file and corrupt each other's writes.

Generated PDFs save wherever the user chooses via the native print dialog's "Save as PDF."

## Licensing

> **Setting up on a new computer, onboarding a lab, or shipping a release?** Follow the step-by-step
> handbook in [docs/licensing-and-releases.md](docs/licensing-and-releases.md).

Licenses are signed with an Ed25519 private key that is never committed or shipped (default location `~/scalyft-keys/scalyft-license-private.pem`, or set `LUMALABS_SIGNING_KEY`). The app only holds the public key in `electron/main/license.ts`, so it can check a license but never create one.

A license is either a **trial** (has an `expiresAt`, signed into the payload so it can't be edited) or **full** (no expiry). The app looks in two places and uses the stronger valid one:

1. **Built into the installer** — `resources/license.json`, staged from the profile.
2. **Pasted in the app** — a `LUMA-…` key entered in Settings → License or on the trial-ended screen, saved to `%APPDATA%\LumaLabs\license.json` so updates and reinstalls keep it. A pasted key must be for the same lab the installer was built for.

A packaged build with no valid license won't open. An expired trial opens to a lock screen with a "Contact Scalyft" button (scalyft.tech) and a key box; the last 7 days of a trial show a banner. Whichever license wins, its lab name is force-written into the database on every launch (`lockLabName` in `db.ts`).

**Day-to-day flow** (every issued license is also appended to `licenses/ledger.csv`, which is committed):

```bash
npm run profile sunlab            # first time: auto-issues a 30-day trial into profiles/sunlab/license.json
npm run package                   # LumaLabs-sunlab-Setup-<version>.exe — hand this over
npm run license -- sunlab         # they paid: full license, prints the LUMA-… key to send them
npm run license -- sunlab --trial # restart a fresh 30-day trial (e.g. before handing over a stale build)
```

After `npm run license`, commit `profiles/sunlab` and `licenses/ledger.csv` so every later build for that lab includes the full license.

## Packaging

```bash
npm run package -- superlab           # one lab's installer  -> dist/LumaLabs-superlab-Setup-<version>.exe
npm run package -- --all-profiles     # every profile, including the dev pitch installer
```

`npm run package` runs `electron-vite build` then `electron-builder` (NSIS). The very first build on a machine must be run once from an Administrator terminal (or with Developer Mode on), because electron-builder extracts a tool archive containing symlinks; after that a normal terminal works. Step-by-step, including licensing and releasing, is in [docs/licensing-and-releases.md](docs/licensing-and-releases.md).

### Windows 7 builds

Electron 23+ dropped Windows 7, so Windows 7 machines get a separate build from the long-lived **`win7-compat`** branch, which is `dev` plus one change: Electron pinned to 22.3.27. The app code is identical; merge `dev` into `win7-compat` for each release. These installers are named `LumaLabs-<profile>-win7-<arch>-Setup-<version>.exe` and are tagged `vX.Y.Z-win7`. Code in this repo must stay within what Chromium 108 (Electron 22) supports — e.g. no CSS `color-mix()` in light-mode styling. Use the 32-bit (`ia32`) one for 32-bit Windows 7 — it also runs on 64-bit Windows. See the handbook for the exact commands and the SP1 / KB2999226 prerequisites older machines may need.

## Status

Working end to end: patient registration/editing, result entry across all 12 categories with live abnormal-value flagging, paginated report preview, printing/PDF, billing with per-patient overrides, doctors and incentive reports, analytics, customisable keyboard shortcuts, NSIS installers (64-bit, plus 32-bit/Windows 7 builds), and the licensing/branding lock described above.

Not yet built: multi-computer/shared-data support (each install is a single local database on one machine) and a paid code-signing certificate (installers are unsigned, so Windows SmartScreen may warn on first run — fine for hand-delivered installs, not for broad public distribution).
