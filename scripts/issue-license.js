#!/usr/bin/env node
/**
 * Issues a signed license.json for one lab. Only runs with the private key,
 * which is never committed to this repo or shipped in any build — keep it
 * somewhere safe outside version control. Each new customer needs a license
 * file generated with this script, dropped into their build's resources/
 * folder as resources/license.json before running `npm run package` (or into
 * profiles/<name>/license.json so it's baked in automatically from then on).
 *
 * Usage:
 *   node scripts/issue-license.js --key /path/to/private.pem --lab "Some Lab Name" --id SLS-0001 --out resources/license.json
 *
 * For a time-limited marketing trial, add --trial-days — the app shows a full-screen
 * "trial ended, contact Scalyft" block once expiresAt has passed, counted from the date
 * this command runs (not from the customer's first launch):
 *   node scripts/issue-license.js --key /path/to/private.pem --lab "SunLab" --id SUNLAB-TRIAL --trial-days 7 --out profiles/sunlab/license.json
 */
const crypto = require('crypto')
const fs = require('fs')

function arg(name, fallback) {
  const i = process.argv.indexOf('--' + name)
  return i !== -1 ? process.argv[i + 1] : fallback
}

const keyPath = arg('key')
const labName = arg('lab')
const licenseId = arg('id')
const outPath = arg('out', 'resources/license.json')
const trialDaysArg = arg('trial-days')

if (!keyPath || !labName || !licenseId) {
  console.error(
    'Usage: node scripts/issue-license.js --key <private.pem> --lab "<Lab Name>" --id <license-id> [--trial-days <n>] [--out resources/license.json]'
  )
  process.exit(1)
}

let expiresAt
if (trialDaysArg !== undefined) {
  const trialDays = parseInt(trialDaysArg, 10)
  if (!Number.isFinite(trialDays) || trialDays <= 0) {
    console.error('--trial-days must be a positive integer')
    process.exit(1)
  }
  const expiry = new Date()
  expiry.setUTCDate(expiry.getUTCDate() + trialDays)
  expiresAt = expiry.toISOString().slice(0, 10)
}

const privateKey = crypto.createPrivateKey(fs.readFileSync(keyPath, 'utf8'))
const issuedAt = new Date().toISOString().slice(0, 10)
const payload = expiresAt ? `${labName}|${licenseId}|${issuedAt}|${expiresAt}` : `${labName}|${licenseId}|${issuedAt}`
const signature = crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('base64')

const license = expiresAt ? { labName, licenseId, issuedAt, expiresAt, signature } : { labName, licenseId, issuedAt, signature }
fs.writeFileSync(outPath, JSON.stringify(license, null, 2))
console.log('Wrote', outPath)
console.log(license)
