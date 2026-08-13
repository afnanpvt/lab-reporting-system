# Lab Reporter

A modern, offline-first desktop application for laboratory patient registration, result entry, and report generation — built for Windows.

It replaces a legacy VB6-style lab management tool with a keyboard-first workflow, while keeping the operator's existing mental model (patient → tests → results → report → print/share) intact.

## What's in here

- **Start** — search for an existing patient or jump straight into registering a new one. Shows only today's genuinely unfinished patients, not a generic history feed.
- **Patient Intake** — minimal required fields (name, age, gender, mobile), test selection as toggle chips, optional contact/address details tucked behind a disclosure.
- **Edit Patient Info** — go back and correct registration details or adjust selected tests at any point without losing your place in result entry.
- **Result Entry Workbench** — the core of the app:
  - A compact local rail shows every selected category with a completion state (empty / partial / complete) — it's a checklist, not app navigation.
  - One category is shown at a time, sized to its own content (a 4-field category and a 30-field category don't get the same amount of screen).
  - `Enter` and `Tab` move between fields automatically and cross into the next category at the end of one — keyboard-only entry works end to end.
  - Autosave runs continuously in the background (debounced); there's no manual "Save" button to remember.
  - Abnormal values are flagged live, in red/blue, as you type, based on the printed reference range.
  - Haematology is broken into its five legacy sub-panels (CBC / Differential / ESR / Coagulation / Blood Group). Culture & Sensitivity gets a dedicated antibiogram grid (20 antibiotics × S/I/R) instead of being forced into the same row layout as everything else.
- **Report Review** — full A4 preview, printer selection (real Windows printer names), PDF export, and a WhatsApp handoff that opens the patient's actual chat with a message pre-filled and the PDF highlighted in Explorer, ready to drag in.
- **Settings** — lab identity (name/address/phone/authorised doctor), plus a plain-language note confirming everything is stored locally with nothing sent to the cloud.

12 laboratory categories are supported end to end: Haematology, Biochemistry, Serology, Urine, Motion, C.S., Mantoux, G.T.T./S.A./Lipid, Blood Group, Electrolytes, L.F.T., and ABG/Sputum.

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Shell | Electron 32 | Native Windows printer APIs (`webContents.print` / `printToPDF`), not an emulation layer |
| UI | React 18 + TypeScript + Vite | Fast dev loop, typed IPC contract |
| State | Zustand | Small, no boilerplate |
| Styling | Tailwind CSS + a semantic token system | One accent color, light-mode-only design tokens defined once in `tailwind.config.js` and mirrored as CSS variables for print output |
| Local database | sql.js (SQLite compiled to WASM) | Zero native build tooling required — no Visual Studio Build Tools, no Python, works out of the box on any machine that runs Node |
| Routing | React Router (HashRouter) | Plays nicely with Electron's `file://` production loading |

Everything runs fully offline. There is no server, no API, no network call anywhere in the data path — patient data lives in a single local SQLite file.

## Prerequisites

- **Windows 10/11** — required for full functionality (native printer detection/printing). The UI will run in dev mode on macOS/Linux for review, but printing and the Windows installer target Windows only.
- **[Node.js](https://nodejs.org/) 18 LTS or newer** (20 LTS recommended) — includes npm.
- **Git**

No database server, no Docker, no API keys, no `.env` file. That's the whole list.

## Getting started

```bash
git clone https://github.com/afnanpvt/lab-reporting-system.git
cd lab-reporting-system
npm install
npm run dev
```

That's it — `npm run dev` starts the app in an Electron window with hot reload. On first launch it creates its own local database and seeds default settings; there's nothing else to configure.

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
| `npm run build` | Type-checks nothing on its own, but bundles main/preload/renderer for production via `electron-vite` |
| `npm run preview` | Runs the production build locally without packaging an installer |
| `npm run package` | Builds a distributable Windows installer (`.exe`, via `electron-builder`) — see note below |

To type-check the renderer explicitly:

```bash
npx tsc --noEmit -p tsconfig.json
```

## Project structure

```
lab-app/
├── electron/
│   ├── main/          # Electron main process: window, IPC handlers, sql.js database
│   └── preload/       # contextBridge — the only surface the renderer can call into main
├── src/
│   ├── components/
│   │   ├── layout/     # App shell, patient context bar, autosave indicator
│   │   ├── report/     # Printable report template (renders to static HTML for PDF/print)
│   │   └── sections/   # One component per lab category (Haematology, Biochemistry, ...)
│   ├── pages/          # Start, PatientEntry, EditPatient, ReportEntry, ReportPreview, Settings
│   ├── store/          # Zustand store (settings)
│   ├── types/          # Shared TypeScript types + the field-key registry used for completion tracking
│   └── lib/            # Small utilities (autosave hook, date helpers)
├── resources/          # Windows installer icon goes here (see Packaging below)
└── tailwind.config.js  # The design token system — colors, nothing else touches raw hex values
```

## Data & privacy

All patient records, results, and settings live in a single local SQLite file:

- **Development:** `lab-app/lab-data.db` (in the project root, gitignored — this is local test data, not committed)
- **Production (installed app):** `%APPDATA%/Lab Reporter/lab-data.db`

Nothing is uploaded anywhere. The app enforces a single-instance lock, so two copies can never run against the same database file and corrupt each other's writes.

Generated PDFs are saved to `Documents\LabReports\` on whichever machine runs the app.

## Printing, PDF, and WhatsApp sharing

- **Printing** uses `webContents.print()` against the actual list of installed Windows printers (`webContents.getPrinters()`) — no OS print dialog, no virtual-printer workarounds.
- **PDF** uses `webContents.printToPDF()` against a hidden, offscreen window rendering the same report template.
- **WhatsApp sharing** opens `wa.me/<patient's number>` with a pre-filled message and simultaneously reveals the generated PDF in File Explorer. One honest limitation: neither WhatsApp Web nor the desktop app expose any public way to auto-attach a local file to an outgoing chat — that's only possible through WhatsApp's paid Business API. So the last step is a single drag of the already-highlighted PDF into the already-open chat, not a fully automatic send.

## Packaging a Windows installer

`npm run package` (electron-builder) expects a `.ico` file at `resources/icon.ico`. That file isn't included yet — the lab's actual logo/branding is expected to replace the current neutral placeholder identity used in the app shell before a distributable installer is built. Add an icon there first, or packaging will fail on that step (dev and `npm run build` are unaffected).

## Status

Built and working end to end: patient search/registration, editing patient info, keyboard-first result entry across all 12 categories with autosave and live abnormal flagging, report review with printer selection, PDF export, and WhatsApp handoff.

Not yet built: a lock/sign-in screen, a full visual pass on the Report Review screen to match the rest of the app's design system, and a dedicated cross-cutting error-recovery pass (individual failure states — save errors, printer errors, PDF errors — are already handled, but haven't been audited screen-by-screen as a single pass).
