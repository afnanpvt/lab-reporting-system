#!/usr/bin/env node
/**
 * Stages one vendor profile (see profiles/README.md) into resources/ before a dev run or a
 * package build — copies profiles/<name>/config.json to resources/branding.json (the seed
 * lab name/address/phone/email/doctor), and profiles/<name>/logo.png and license.json to
 * resources/, if the profile has them. Run before `npm run dev` to preview a profile locally,
 * or before `npm run package` to bake it into that build's installer.
 *
 * Usage:
 *   node scripts/apply-profile.js [name]     (defaults to "demo")
 */
const fs = require('fs')
const path = require('path')

const name = process.argv[2] || 'demo'
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

// Remembers which profile is currently staged so `npm run package` can name the installer
// after it (e.g. LumaLabs-superlab-Setup-2.0.0.exe) without needing a separate flag — see
// scripts/package.js, which reads this back.
fs.writeFileSync(path.join(resourcesDir, '.profile-name'), name)

console.log(
  `Applied profile "${name}" -> resources/branding.json` +
    (hasLicense ? ' + license.json' : ' (no license: runs unlicensed)') +
    (hasLogo ? ' + logo.png' : '')
)
