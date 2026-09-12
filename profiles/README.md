# Vendor profiles

Each subfolder here is one customer/build target — a name, contact details, and optionally a
logo and a signed license, staged into `resources/` before a dev run or a package build. Nothing
about the app's code changes between profiles; only which profile is staged.

Only `demo/` is committed — it has no real identity in it. Every other profile (a real, paying
customer's actual name, logo, and signed license) stays local, never committed. See `.gitignore`.

## Folder shape

```
profiles/<name>/
  config.json   required — { labName, labAddress, labPhone, labEmail, labDoctor }
  logo.png      optional — shown in the app header and report letterhead instead of the text wordmark
  license.json  optional — a real signed license from scripts/issue-license.js; omit for an
                unlicensed/open build (e.g. demo)
```

## Using a profile

```
node scripts/apply-profile.js <name>
```

Stages that profile's files into `resources/` and remembers the name in `resources/.profile-name`
(gitignored) — the license (if any) can only be applied this way, since it's verified once at
launch. Defaults to `demo` if no name is given.

For everyday dev/demo use you don't need this script at all: Settings' dev-only "profile preview"
panel applies a profile's fields *and* logo live, straight from the running app, as soon as you
pick it from the dropdown — no separate apply step. It also has a "Save as new profile" box that
writes whatever's currently filled in (plus the currently-applied logo) to a new
`profiles/<name>/` folder, so a vendor's branding can be captured on the fly instead of
hand-writing `config.json`.

## Packaging an installer per profile

`npm run package` bakes whichever profile is currently staged into the installer, naming it after
that profile automatically (`LumaLabs-<name>-Setup-<version>.exe`):

```
npm run package                    # uses whatever's already staged (falls back to "demo")
npm run package -- superlab        # stages "superlab" first, then builds
npm run package -- --all-profiles  # builds one installer per profiles/<name>/ folder in one go
```

`--all-profiles` compiles the renderer once (it doesn't vary per vendor — only `resources/`
does), then loops profile-stage + package for every folder under `profiles/`, producing e.g.
`LumaLabs-demo-Setup-2.0.0.exe` and `LumaLabs-superlab-Setup-2.0.0.exe` in one run. Handy once
there are more than a couple of vendors.
