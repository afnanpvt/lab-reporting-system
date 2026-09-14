#!/usr/bin/env node
/**
 * Wraps `electron-vite build && electron-builder` so the installer filename always includes
 * the currently-staged profile (see package.json's build.nsis.artifactName, which references
 * ${env.PROFILE_NAME}) — electron-builder throws a hard error if that env var is unset, so this
 * guarantees it's always defined.
 *
 * Usage:
 *   npm run package                     (uses whichever profile resources/.profile-name says)
 *   npm run package -- superlab         (applies the "superlab" profile first, then builds)
 *   npm run package -- dev              (generic pitch installer with a fresh 30-day trial)
 *   npm run package -- --all-profiles   (one installer per profile, dev included — the renderer
 *                                         only needs compiling once, since resources/ is all that differs)
 *
 * dev has no license on disk (so `npm run dev` never expires or locks the lab name). Its installer
 * gets a brand-new trial at build time, recorded in the ledger, which is removed from resources/
 * again once the build finishes.
 */
const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const { DEFAULT_TRIAL_DAYS, appendToLedger, defaultLicenseId, hasSigningKey, signLicense, signingKeyPath } = require('./license-lib')

const resourcesDir = path.join(__dirname, '..', 'resources')
const profilesDir = path.join(__dirname, '..', 'profiles')
const profileMarker = path.join(resourcesDir, '.profile-name')
const stagedLicense = path.join(resourcesDir, 'license.json')
const DEV_PROFILE = 'dev'

function run(cmd, args, extraEnv) {
  const result = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: true,
    env: extraEnv ? { ...process.env, ...extraEnv } : process.env
  })
  return result.status ?? 1
}

function stageProfile(name) {
  const status = run('node', [path.join(__dirname, 'apply-profile.js'), name])
  if (status !== 0) process.exit(status)
}

function currentProfileName() {
  return fs.existsSync(profileMarker) ? fs.readFileSync(profileMarker, 'utf8').trim() : DEV_PROFILE
}

// Why the staged profile can't become an installer, or null if it can.
function unpackageableReason(name) {
  if (name === DEV_PROFILE) {
    return hasSigningKey() ? null : `The dev installer needs a fresh trial, but no signing key was found at ${signingKeyPath()}.`
  }
  if (!fs.existsSync(stagedLicense)) {
    return `profiles/${name} has no license. Run \`npm run license -- ${name} --trial\` first.`
  }
  return null
}

function buildRenderer() {
  const status = run('npx', ['electron-vite', 'build'])
  if (status !== 0) process.exit(status)
}

function packageCurrentlyStaged() {
  const name = currentProfileName()
  const reason = unpackageableReason(name)
  if (reason) {
    console.error(reason)
    return 1
  }
  if (name !== DEV_PROFILE) return run('npx', ['electron-builder'], { PROFILE_NAME: name })

  const { labName } = JSON.parse(fs.readFileSync(path.join(profilesDir, DEV_PROFILE, 'config.json'), 'utf8'))
  const license = signLicense({ labName, licenseId: defaultLicenseId(DEV_PROFILE, true), trialDays: DEFAULT_TRIAL_DAYS })
  fs.writeFileSync(stagedLicense, JSON.stringify(license, null, 2) + '\n')
  appendToLedger(DEV_PROFILE, license)
  console.log(`dev installer: issued a ${DEFAULT_TRIAL_DAYS}-day trial for "${labName}" (ends ${license.expiresAt}).`)
  try {
    return run('npx', ['electron-builder'], { PROFILE_NAME: name })
  } finally {
    fs.unlinkSync(stagedLicense)
  }
}

const arg = process.argv[2]

if (arg === '--all-profiles' || arg === '--all') {
  const names = fs
    .readdirSync(profilesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()

  if (names.length === 0) {
    console.error(`No profiles found under ${profilesDir}`)
    process.exit(1)
  }

  console.log(`Building installers for: ${names.join(', ')}\n`)
  buildRenderer()

  const results = names.map((name) => {
    console.log(`\n=== ${name} ===`)
    stageProfile(name)
    return { name, ok: packageCurrentlyStaged() === 0 }
  })

  console.log('\n=== Summary ===')
  for (const r of results) console.log(`${r.ok ? '✓' : '✗'} ${r.name}`)
  process.exit(results.every((r) => r.ok) ? 0 : 1)
}

if (arg) stageProfile(arg)

// Checked before compiling so an unlicensed profile fails fast instead of after a full build.
const reason = unpackageableReason(currentProfileName())
if (reason) {
  console.error(reason)
  process.exit(1)
}

buildRenderer()
process.exit(packageCurrentlyStaged())
