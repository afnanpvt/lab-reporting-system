#!/usr/bin/env node
/**
 * Wraps `electron-vite build && electron-builder` so the installer filename always includes
 * the currently-staged profile (see package.json's build.nsis.artifactName, which references
 * ${env.PROFILE_NAME}) — electron-builder throws a hard error if that env var is unset, so this
 * guarantees it's always defined, even for a bare `npm run package` with no profile applied yet.
 *
 * Usage:
 *   npm run package                 (uses whichever profile resources/.profile-name says, or
 *                                     falls back to "demo" if no profile has been applied yet)
 *   npm run package -- superlab     (applies the "superlab" profile first, then builds)
 *   npm run package -- --all-profiles   (builds one installer per profiles/<name>/ folder —
 *                                         the renderer only needs compiling once, since
 *                                         resources/ is the only thing that differs per vendor)
 */
const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const resourcesDir = path.join(__dirname, '..', 'resources')
const profilesDir = path.join(__dirname, '..', 'profiles')
const profileMarker = path.join(resourcesDir, '.profile-name')

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
  return fs.existsSync(profileMarker) ? fs.readFileSync(profileMarker, 'utf8').trim() : 'demo'
}

function buildRenderer() {
  const status = run('npx', ['electron-vite', 'build'])
  if (status !== 0) process.exit(status)
}

function packageCurrentlyStaged() {
  const name = currentProfileName()
  // A packaged build with no license refuses to open, so never produce one for a real lab.
  if (name !== 'demo' && !fs.existsSync(path.join(resourcesDir, 'license.json'))) {
    console.error(`profiles/${name} has no license. Run \`npm run license -- ${name} --trial\` first.`)
    return 1
  }
  return run('npx', ['electron-builder'], { PROFILE_NAME: name })
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

buildRenderer()
process.exit(packageCurrentlyStaged())
