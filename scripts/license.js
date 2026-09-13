#!/usr/bin/env node
/**
 * Issues a license for a vendor profile: saves it as profiles/<name>/license.json (so every later
 * `npm run package` for that lab builds with it), records it in licenses/ledger.csv, and prints the
 * LUMA-… key to send the lab. Pasting that key in the app activates it without reinstalling.
 *
 * Usage:
 *   npm run license -- <profile>                       full (paid) license
 *   npm run license -- <profile> --trial               fresh 30-day trial starting today
 *   npm run license -- <profile> --trial --days 14     custom trial length
 * Options: --lab "Lab Name" (defaults to the profile's current license, then config.json),
 *          --id LICENSE-ID, --force (replace a full license with a trial)
 */
const fs = require('fs')
const path = require('path')
const { DEFAULT_TRIAL_DAYS, defaultLicenseId, encodeLicenseKey, issueForProfile } = require('./license-lib')

const args = process.argv.slice(2)
const profile = args[0] && !args[0].startsWith('--') ? args[0] : undefined
const hasFlag = (name) => args.includes('--' + name)
const option = (name) => {
  const i = args.indexOf('--' + name)
  return i !== -1 ? args[i + 1] : undefined
}

if (!profile) {
  console.error('Usage: npm run license -- <profile> [--trial [--days N]] [--lab "Lab Name"] [--id LICENSE-ID]')
  process.exit(1)
}

const profileDir = path.join(__dirname, '..', 'profiles', profile)
const configPath = path.join(profileDir, 'config.json')
if (!fs.existsSync(configPath)) {
  console.error(`No profile at profiles/${profile}/ (config.json is missing)`)
  process.exit(1)
}

const licensePath = path.join(profileDir, 'license.json')
const existing = fs.existsSync(licensePath) ? JSON.parse(fs.readFileSync(licensePath, 'utf8')) : null
const existingIsFull = !!existing && !existing.expiresAt
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))

const trial = hasFlag('trial')
if (!trial && option('days') !== undefined) {
  console.error('--days only applies together with --trial')
  process.exit(1)
}
const days = option('days') !== undefined ? Number(option('days')) : DEFAULT_TRIAL_DAYS
if (trial && (!Number.isInteger(days) || days <= 0)) {
  console.error('--days must be a positive whole number')
  process.exit(1)
}
if (trial && existingIsFull && !hasFlag('force')) {
  console.error(`profiles/${profile} already has a full license (${existing.licenseId}); refusing to replace it with a trial. Add --force if you mean it.`)
  process.exit(1)
}

// The license's lab name is what the app locks into the database, so keep it stable across re-issues.
const labName = option('lab') || (existing && existing.labName) || config.labName
const licenseId = option('id') || (!trial && existingIsFull ? existing.licenseId : defaultLicenseId(profile, trial))

const license = issueForProfile(profile, { labName, licenseId, trialDays: trial ? days : undefined })

console.log(`\n${trial ? `Trial (${days} days, ends ${license.expiresAt})` : 'Full license'} for "${labName}", ID ${licenseId}`)
console.log(`Saved to profiles/${profile}/license.json and recorded in licenses/ledger.csv.\n`)
console.log('Key to send the lab (they paste it in Settings → License, or on the trial-ended screen):\n')
console.log(encodeLicenseKey(license) + '\n')
console.log(`Commit profiles/${profile} and licenses/ledger.csv so builds on other machines include it.`)
