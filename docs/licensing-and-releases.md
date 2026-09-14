# LumaLabs handbook: licensing, builds and releases

Everything needed to work on LumaLabs from your own computer: setup, onboarding a lab on a trial,
converting them to paid, and shipping a new version. If you only read one section, read
**[Everyday tasks](#3-everyday-tasks)**.

---

## 1. One-time setup

**1. Get the code**

```bash
git clone https://github.com/afnanpvt/lab-reporting-system.git
cd lab-reporting-system
git checkout dev
npm install
```

**2. Get the signing key.** Licenses are signed with `scalyft-license-private.pem`. It is **not** in
git and never will be. Get it from Alhaan through the shared password manager (never over WhatsApp
or email) and save it here:

```
C:\Users\<your-windows-user>\scalyft-keys\scalyft-license-private.pem
```

If you keep it somewhere else, set an environment variable `LUMALABS_SIGNING_KEY` to its full path.

Without the key you can still run the app and build installers for labs whose license is already
committed. You just can't issue new trials or licenses.

**3. Build an installer once as Administrator.** On Windows, the very first `npm run package`
fails with `Cannot create symbolic link: A required privilege is not held by the client`. Run it
once from an **Administrator** PowerShell (or turn on Windows Developer Mode). After that one
success, a normal terminal works.

---

## 2. How licensing works

- **Each lab is a profile**: `profiles/<name>/` holds `config.json` (name, address, phone, email,
  doctor), an optional `logo.png`, and `license.json`. All profiles are committed.
- **A license is either a trial or full.** A trial has an `expiresAt` date. Both are signed, so
  editing `license.json` by hand breaks it.
- **One installer per lab.** `npm run package` bakes in whatever `license.json` that lab's profile
  has at build time.
- **Keys unlock without reinstalling.** A key looks like `LUMA-eyJsYWJOYW1l…`. The lab pastes it in
  **Settings → License** (or on the trial-ended screen). It's saved to
  `%APPDATA%\LumaLabs\license.json` next to their patient data, so updates and reinstalls keep it.
- **The stronger license wins.** The app compares the license built into the installer with any
  pasted key and uses the better one (full beats trial, a later trial beats an earlier one). A
  pasted key only works if it's for the same lab name the installer was built for.
- **Trials last 30 days from the day they're issued**, not from the day the lab installs. In the
  last 7 days a banner appears. After expiry the app opens to a lock screen with a "Contact Scalyft"
  button (opens scalyft.tech) and the key box. Their data is never deleted.
- **No valid license means the installed app won't open.** Dev mode (`npm run dev`) ignores this.
- **`licenses/ledger.csv` is our record** of every license issued: date, lab, license ID,
  trial/paid, expiry, and the key itself. The scripts add rows automatically.

---

## 3. Everyday tasks

> **Always `git pull` before issuing a license and push right after.** The ledger is shared, so if
> we both issue without pulling we get a merge conflict. If that happens, keep both rows.

### Run the app locally

```bash
npm run profile <name>     # e.g. superlab, sunlab, dev
npm run dev
```

`dev` is the generic profile with no license on disk, so locally it never expires. Its installer
(`npm run package -- dev`) gets a fresh 30-day trial at build time: build it right before a pitch.

### Onboard a new lab on a 30-day trial

1. `git pull`
2. Create their profile. The easy way: `npm run dev`, go to **Settings**, fill in the lab details and
   logo, then use **Save as new profile** in the yellow dev-only panel. Or create
   `profiles/<name>/config.json` by hand (copy `profiles/dev/config.json`).
3. Stage it. This issues the 30-day trial automatically the first time:

   ```bash
   npm run profile <name>
   ```

4. Build their installer:

   ```bash
   npm run package
   ```

   Output: `dist/LumaLabs-<name>-Setup-<version>.exe`. This is what you hand over.
5. Commit and push:

   ```bash
   git add profiles/<name> licenses/ledger.csv
   git commit -m "Onboard <Lab Name> on trial"
   git push
   ```

**Handing over later than planned?** The trial clock starts when it's issued. Restart it first with
`npm run license -- <name> --trial`, then `npm run package`.

### Lab has paid: give them the full version

1. `git pull`
2. Issue the full license:

   ```bash
   npm run license -- <name>
   ```

3. Copy the printed `LUMA-…` key and send it to them on WhatsApp. They paste it in **Settings →
   License** (or on the lock screen) and click **Activate**. No reinstall, no data lost.
4. Commit and push so every future build for them comes out as the full version:

   ```bash
   git add profiles/<name> licenses/ledger.csv
   git commit -m "<Lab Name> is now a paid customer"
   git push
   ```

### Extend a trial

```bash
npm run license -- <name> --trial              # 30 more days from today
npm run license -- <name> --trial --days 14    # custom length
```

Send them the printed key. It only takes effect if it ends later than their current trial. The
script refuses to downgrade a lab that already has a full license (add `--force` if you really mean
it).

### "My key doesn't work"

| Message they see | Meaning |
|---|---|
| *doesn't look like a LumaLabs license key* | Part of the key is missing. Resend it; it must start with `LUMA-`. |
| *This license key is not valid* | The key was altered or wasn't issued by us. Reissue with `npm run license`. |
| *This key is for "X", but this installation is for "Y"* | Wrong lab's key. Check the ledger for the right one. |
| *This license key has already expired* | You sent an old trial key. Issue a new one. |
| *This installation is already fully licensed* | Nothing to do; they're already on the full version. |
| *This key would not extend the current trial* | The trial key ends before their current trial does. |

---

## 4. Command reference

| Command | What it does |
|---|---|
| `npm run dev` | Run the app locally with whichever profile is staged |
| `npm run profile <name>` | Stage a profile into `resources/`. Issues a 30-day trial if the lab has no license yet |
| `npm run license -- <name>` | Issue a full license, print the key, update profile + ledger |
| `npm run license -- <name> --trial [--days N]` | Issue a fresh trial (default 30 days) |
| `npm run package` | Build the installer for the staged profile |
| `npm run package -- <name>` | Stage `<name>`, then build its installer |
| `npm run package -- --all-profiles` | Build an installer for every profile, including `dev` |

---

## 5. Releasing a new version

Versions follow `major.minor.patch`: **patch** for bug fixes (2.1.0 → 2.1.1), **minor** for new
features (2.1.0 → 2.2.0), **major** for big changes (2.x → 3.0.0). Releases are currently tagged on
the `dev` branch.

1. Make sure `dev` is clean and up to date: `git status`, `git pull`.
2. Bump the version and push:

   ```bash
   npm version 2.2.0 --no-git-tag-version
   git add package.json package-lock.json
   git commit -m "Bump version to 2.2.0"
   git push
   ```

3. Build the installers you're shipping:

   ```bash
   npm run package -- superlab          # one lab
   npm run package -- --all-profiles    # every lab
   ```

   `npm run package -- dev` builds the generic pitch installer with a fresh 30-day trial.
4. Tag and publish the release with the installers attached:

   ```bash
   git tag v2.2.0
   git push origin v2.2.0
   gh release create v2.2.0 dist/LumaLabs-superlab-Setup-2.2.0.exe --target dev --title "v2.2.0" --notes "What changed..."
   ```

5. Send each lab its new installer. Installing over the old version keeps their patients, reports
   and activated key (all in `%APPDATA%\LumaLabs\`).

Customer downloads for Super Lab Service are also published separately in the public
`afnanpvt/superlab-service` repo.

---

## 6. Rules

- **Never commit, email or WhatsApp the private key.** Anyone with it can create unlimited free
  licenses. If it leaks or is lost, every lab's license has to be reissued.
- **Never hand-edit `license.json`.** It breaks the signature. Use `npm run license`.
- **Pull before issuing, push right after**, so the ledger stays in sync between us.
- **Every license lives in git** (profile + ledger). If it isn't committed, the other person's next
  build for that lab ships without it.
