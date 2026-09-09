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

Stages that profile's files into `resources/`. Run it before `npm run dev` to preview a profile
locally, or before `npm run package` to bake it into that build's installer. Defaults to `demo`
if no name is given.
