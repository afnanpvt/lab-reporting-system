#!/usr/bin/env node
/**
 * Stages one vendor profile (see profiles/README.md) into resources/ before a dev run or a
 * package build — copies profiles/<name>/config.json to resources/branding.json (the seed
 * lab name/address/phone/email/doctor), and profiles/<name>/logo.png and license.json to
 * resources/, if the profile has them. Run before `npm run dev` to preview a profile locally,
 * or before `npm run package` to bake it into that build's installer.
 *
 * Usage:
 *   node scripts/apply-profile.js [name]     (defaults to "dev")
 */
const fs = require('fs')
const path = require('path')
const { DEFAULT_TRIAL_DAYS, defaultLicenseId, hasSigningKey, issueForProfile, signingKeyPath } = require('./license-lib')

const name = process.argv[2] || 'dev'
const profileDir = path.join(__dirname, '..', 'profiles', name)
const resourcesDir = path.join(__dirname, '..', 'resources')

if (!fs.existsSync(profileDir)) {
  console.error(`No profile named "${name}" at profiles/${name}/`)
  process.exit(1)
}

const configPath = path.join(profileDir, 'config.json')
if (!fs.existsSync(configPath)) {
  console.error(`profiles/${name}/config.json is missing`)
  process.exit(1)
}
fs.copyFileSync(configPath, path.join(resourcesDir, 'branding.json'))

// Every real lab starts on a trial the first time its profile is staged; `npm run license` upgrades
// it later. dev stays unlicensed on disk so `npm run dev` keeps every field editable and never
// expires; `npm run package -- dev` gives its installer a fresh trial instead (scripts/package.js).
if (name !== 'dev' &&!fs.existsSync(path.join(profileDir, 'license.json'))) {
  if (hasSigningKey()) {
    const { labName } = JSON.parse(fs.readFileSync(configPath, 'utf8'))
    const license = issueForProfile(name, { labName, licenseId: defaultLicenseId(name, true), trialDays: DEFAULT_TRIAL_DAYS })
    console.log(`No license yet: issued a ${DEFAULT_TRIAL_DAYS}-day trial for "${labName}" (ends ${license.expiresAt}).`)
  } else {
    console.warn(`Warning: profiles/${name} has no license and no signing key was found at ${signingKeyPath()}, so a packaged build won't open.`)
  }
}

// license.json and logo.png are optional per profile — copy if present, otherwise remove
// whatever a previously-applied profile left behind so this one doesn't inherit it by accident.
function stageOptional(fileName) {
  const source = path.join(profileDir, fileName)
  const target = path.join(resourcesDir, fileName)
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, target)
    return true
  }
  if (fs.existsSync(target)) fs.unlinkSync(target)
  return false
}

const hasLicense = stageOptional('license.json')
const hasLogo = stageOptional('logo.png')
const hasBadge = stageOptional('badge.png')

// certifications/ is a whole folder of PNGs (zero or more) rather than one fixed file, so it
// gets its own copy step instead of stageOptional — same idea (mirror the profile, remove
// whatever a previous profile left behind if this one doesn't have any).
function stageCertifications() {
  const source = path.join(profileDir, 'certifications')
  const target = path.join(resourcesDir, 'certifications')
  fs.rmSync(target, { recursive: true, force: true })
  if (!fs.existsSync(source)) return 0
  fs.cpSync(source, target, { recursive: true })
  return fs.readdirSync(target).filter((f) => f.toLowerCase().endsWith('.png')).length
}
const certCount = stageCertifications()

// Remembers which profile is currently staged so `npm run package` can name the installer
// after it (e.g. LumaLabs-superlab-Setup-2.0.0.exe) without needing a separate flag — see
// scripts/package.js, which reads this back.
fs.writeFileSync(path.join(resourcesDir, '.profile-name'), name)

console.log(
  `Applied profile "${name}" -> resources/branding.json` +
    (hasLicense ? ' + license.json' : ' (no license: runs unlicensed)') +
    (hasLogo ? ' + logo.png' : '') +
    (hasBadge ? ' + badge.png' : '') +
    (certCount > 0 ? ` + ${certCount} certification logo${certCount === 1 ? '' : 's'}` : '')
)
