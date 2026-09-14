/**
 * License signing shared by scripts/license.js and scripts/apply-profile.js. Needs the private
 * signing key, which is never committed — defaults to ~/scalyft-keys/scalyft-license-private.pem,
 * or set LUMALABS_SIGNING_KEY to wherever it lives on this machine.
 */
const crypto = require('crypto')
const fs = require('fs')
const os = require('os')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const LEDGER_PATH = path.join(ROOT, 'licenses', 'ledger.csv')
const LEDGER_HEADER = 'issued_at,profile,lab_name,license_id,type,expires_at,license_key'
const DEFAULT_TRIAL_DAYS = 30
const KEY_PREFIX = 'LUMA-'

function signingKeyPath() {
  return process.env.LUMALABS_SIGNING_KEY || path.join(os.homedir(), 'scalyft-keys', 'scalyft-license-private.pem')
}

function hasSigningKey() {
  return fs.existsSync(signingKeyPath())
}

function defaultLicenseId(profile, trial) {
  return `${profile.toUpperCase().replace(/[^A-Z0-9]+/g, '-')}-${trial ? 'TRIAL' : 'FULL'}`
}

function signLicense({ labName, licenseId, trialDays }) {
  const keyPath = signingKeyPath()
  if (!fs.existsSync(keyPath)) {
    throw new Error(`Signing key not found at ${keyPath} — set LUMALABS_SIGNING_KEY to its path.`)
  }

  const issuedAt = new Date().toISOString().slice(0, 10)
  let expiresAt
  if (trialDays !== undefined) {
    const expiry = new Date()
    expiry.setUTCDate(expiry.getUTCDate() + trialDays)
    expiresAt = expiry.toISOString().slice(0, 10)
  }

  // Must match the payload electron/main/license.ts verifies — expiresAt is only included when present.
  const payload = expiresAt ? `${labName}|${licenseId}|${issuedAt}|${expiresAt}` : `${labName}|${licenseId}|${issuedAt}`
  const privateKey = crypto.createPrivateKey(fs.readFileSync(keyPath, 'utf8'))
  const signature = crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('base64')

  return expiresAt ? { labName, licenseId, issuedAt, expiresAt, signature } : { labName, licenseId, issuedAt, signature }
}

function encodeLicenseKey(license) {
  return KEY_PREFIX + Buffer.from(JSON.stringify(license), 'utf8').toString('base64url')
}

function csvField(value) {
  const text = value ?? ''
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function appendToLedger(profile, license) {
  fs.mkdirSync(path.dirname(LEDGER_PATH), { recursive: true })
  if (!fs.existsSync(LEDGER_PATH)) fs.writeFileSync(LEDGER_PATH, LEDGER_HEADER + '\n')
  const row = [
    license.issuedAt,
    profile,
    license.labName,
    license.licenseId,
    license.expiresAt ? 'trial' : 'paid',
    license.expiresAt,
    encodeLicenseKey(license)
  ]
  fs.appendFileSync(LEDGER_PATH, row.map(csvField).join(',') + '\n')
}

/** Signs a license, saves it as profiles/<profile>/license.json, and records it in the ledger. */
function issueForProfile(profile, { labName, licenseId, trialDays }) {
  const license = signLicense({ labName, licenseId, trialDays })
  fs.writeFileSync(path.join(ROOT, 'profiles', profile, 'license.json'), JSON.stringify(license, null, 2) + '\n')
  appendToLedger(profile, license)
  return license
}

module.exports = {
  DEFAULT_TRIAL_DAYS,
  signingKeyPath,
  hasSigningKey,
  defaultLicenseId,
  encodeLicenseKey,
  signLicense,
  appendToLedger,
  issueForProfile
}
