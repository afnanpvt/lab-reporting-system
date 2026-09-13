# LumaLabs

A modern, offline-first desktop application for laboratory patient registration, result entry, report generation, and billing — built for Windows.

This build is licensed exclusively to **Super Lab Service** (Vaniyambadi) — see [Licensing](#licensing) below. The underlying platform is generic (nothing is hardcoded to one lab's data), but each real-world install is a separate signed, separately-built copy for one specific lab.

## What's in here

Every screen lives under `src/pages/site/`, backed by a single data-access module (`src/pages/site/api.ts`) that talks to the Electron main process over IPC (`window.api.*`). Nothing touches the database directly from the UI.

- **Dashboard** — today's registered/needs-attention/completed counts, recent patients.
- **Patients** — search, status pills (draft / in progress / completed — always computed live from actual saved results, never manually overridden), referring doctor shown per patient.
- **Patient Entry** — register or edit a patient: name, age, gender, mobile, address, referring doctor, which of the 12 test sections apply, and a consent checkbox.
- **Result Entry** — one test section at a time, a local checklist rail showing completion state per section, prev/next patient navigation, live abnormal-value flagging against reference ranges, click-to-prefill from the printed reference range.
- **Report Preview** — the actual printable A4 report, paginated in JavaScript (`pagination.ts`) so what's on screen is exactly what prints; printed via the browser's native print dialog (`window.print()`), which also offers "Save as PDF."
- **Bill** — per-patient line items derived from a rate card, with per-patient-per-section amount overrides (rates aren't fixed).
- **Doctors / Incentive Report** — referring doctors, who they've referred, and a printable incentive statement per doctor.
- **Reports** — every completed report and bill in one place.
- **Settings** — lab identity (address/phone/email/doctor — editable; the lab *name* is locked to the license, see below), plus a note confirming everything is stored locally.

12 laboratory categories are supported end to end: Haematology, Biochemistry, Serology, Urine, Motion, C.S. (with a 20-antibiotic antibiogram grid), Mantoux, G.T.T./S.A./Lipid, Blood Group, Electrolytes, L.F.T., and ABG/Sputum.

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Shell | Electron 32 | Native Windows printing, no browser sandbox limitations |
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

Licenses are signed with an Ed25519 private key that is never committed or shipped (default location `~/scalyft-keys/scalyft-license-private.pem`, or set `LUMALABS_SIGNING_KEY`). The app only holds the public key in `electron/main/license.ts`, so it can check a license but never create one.

A license is either a **trial** (has an `expiresAt`, signed into the payload so it can't be edited) or **full** (no expiry). The app looks in two places and uses the stronger valid one:

1. **Built into the installer** — `resources/license.json`, staged from the profile.
2. **Pasted in the app** — a `LUMA-…` key entered in Settings → License or on the trial-ended screen, saved to `%APPDATA%\LumaLabs\license.json` so updates and reinstalls keep it. A pasted key must be for the same lab the installer was built for.

A packaged build with no valid license won't open. An expired trial opens to a lock screen with Scalyft's WhatsApp/phone contact and a key box; the last 7 days of a trial show a banner. Whichever license wins, its lab name is force-written into the database on every launch (`lockLabName` in `db.ts`).

**Day-to-day flow** (every issued license is also appended to `licenses/ledger.csv`, which is committed):

```bash
npm run profile sunlab            # first time: auto-issues a 30-day trial into profiles/sunlab/license.json
npm run package                   # LumaLabs-sunlab-Setup-<version>.exe — hand this over
npm run license -- sunlab         # they paid: full license, prints the LUMA-… key to send them
npm run license -- sunlab --trial # restart a fresh 30-day trial (e.g. before handing over a stale build)
```

After `npm run license`, commit `profiles/sunlab` and `licenses/ledger.csv` so every later build for that lab includes the full license.

## Packaging

`npm run package` runs `electron-vite build` then `electron-builder`. On this development machine, the final NSIS-installer step fails because it needs to download and extract a signing-tool archive containing macOS symlinks, which Windows blocks without Developer Mode (or an elevated terminal) enabled. This is an environment limitation, not a code issue.

Working alternative used for the current release: `npx electron-builder --dir --win` produces a plain folder build (`dist/win-unpacked/`) without hitting that step. That folder is then:

1. Signed with a self-signed Authenticode certificate (`Set-AuthenticodeSignature` — no Windows SDK / `signtool.exe` needed), so Windows' Smart App Control doesn't block it on a machine that has imported the matching `.cer` once.
2. Given its icon via `rcedit` directly (bypassing the same blocked step electron-builder would otherwise use).
3. Zipped up as the distributable.

Once Developer Mode (or an elevated terminal) is available, `npm run package` alone should produce a proper `Setup.exe` installer instead of the manual dir-build/sign/icon sequence above.

## Status

Working end to end: patient registration/editing, result entry across all 12 categories with live abnormal-value flagging, paginated report preview, printing/PDF, billing with per-patient overrides, doctors and incentive reports, and the licensing/branding lock described above.

Not yet built: the real NSIS installer (blocked on the Developer Mode issue above, not on missing code), multi-computer/shared-data support (each install is a single local database on one machine), and a proper paid code-signing certificate (the current self-signed one requires a one-time trust step per machine — fine for hand-delivered installs, not for broad public distribution).
