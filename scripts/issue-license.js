#!/usr/bin/env node
/**
 * Issues a signed license.json for one lab. Only runs with the private key,
 * which is never committed to this repo or shipped in any build — keep it
 * somewhere safe outside version control. Each new customer needs a license
 * file generated with this script, dropped into their build's resources/
 * folder as resources/license.json before running `npm run package`.
 *
 * Usage:
 *   node scripts/issue-license.js --key /path/to/private.pem --lab "Some Lab Name" --id SLS-0001 --out resources/license.json
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

if (!keyPath || !labName || !licenseId) {
  console.error('Usage: node scripts/issue-license.js --key <private.pem> --lab "<Lab Name>" --id <license-id> [--out resources/license.json]')
  process.exit(1)
}

const privateKey = crypto.createPrivateKey(fs.readFileSync(keyPath, 'utf8'))
const issuedAt = new Date().toISOString().slice(0, 10)
const payload = `${labName}|${licenseId}|${issuedAt}`
const signature = crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('base64')

const license = { labName, licenseId, issuedAt, signature }
fs.writeFileSync(outPath, JSON.stringify(license, null, 2))
console.log('Wrote', outPath)
console.log(license)
