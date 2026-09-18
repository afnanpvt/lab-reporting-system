# Vendor profiles

Each subfolder here is one customer/build target — a name, contact details, and optionally a
logo and a signed license, staged into `resources/` before a dev run or a package build. Nothing
about the app's code changes between profiles; only which profile is staged.

Every profile is committed (the repo is private), so builds come out the same on either founder's
machine. The private signing key is the one thing that never goes in git.

## Folder shape

```
profiles/<name>/
  config.json        required — { labName, labAddress, labPhone, labEmail, labDoctor,
                      labDoctorQualifications, labQualityCheck }
                      labDoctor is the signing doctor's name alone; labDoctorQualifications is
                      their degrees/certifications (e.g. "M.Sc. (Biochem), DMLT, DMRT, DCA"),
                      printed smaller underneath on the report sign-off — kept as two fields so
                      editing one never risks mangling the other.
                      labQualityCheck names an institution for the report's quality-control-check
                      line (e.g. "CMC Hospital, Vellore.") — leave it "" and the line just doesn't print.
  logo.png            optional — shown in the app header and report letterhead instead of the text wordmark
  badge.png           optional — a second image next to the logo in the report header (e.g. Super
                      Lab's "25 years of service" seal). No in-app picker, unlike the logo: it's
                      fixed branding for that vendor, not something staff swap at runtime.
  certifications/     optional folder of PNGs (zero or more) — accreditation logos (e.g. ISO 9001)
                      shown together on the report/bill/incentive footer, sorted by filename.
  license.json  written by scripts — a 30-day trial the first time the profile is staged, a full
                license after `npm run license -- <name>`. dev has none on disk (see below).
```

## Licensing a profile

```
npm run license -- <name>                    # full license + prints the LUMA-… key to send the lab
npm run license -- <name> --trial            # fresh 30-day trial from today
npm run license -- <name> --trial --days 14  # custom trial length
```

Each run updates `profiles/<name>/license.json` and appends a row to `licenses/ledger.csv` — the
record of who's on trial and who has paid. Commit both afterwards. See the Licensing section of the
main README for how the app picks between a built-in license and a pasted key.

## Using a profile

```
node scripts/apply-profile.js <name>
```

Stages that profile's files into `resources/` and remembers the name in `resources/.profile-name`
(gitignored) — the license (if any) can only be applied this way, since it's verified once at
launch. Defaults to `dev` if no name is given.

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
npm run package                    # uses whichever profile is already staged
npm run package -- superlab        # stages "superlab" first, then builds
npm run package -- --all-profiles  # builds one installer per lab profile in one go
```

`--all-profiles` compiles the renderer once (it doesn't vary per vendor — only `resources/`
does), then loops profile-stage + package for every lab under `profiles/`, producing e.g.
`LumaLabs-superlab-Setup-2.1.0.exe` and `LumaLabs-sunlab-Setup-2.1.0.exe` in one run.

`dev` is the generic profile. It has no license on disk, so `npm run dev` keeps every field editable
and never expires. `npm run package -- dev` (and `--all-profiles`) gives its installer a fresh
30-day trial at build time, recorded in `licenses/ledger.csv` as `DEV-TRIAL`. Rebuild it before a
pitch so the trial clock starts that day.
