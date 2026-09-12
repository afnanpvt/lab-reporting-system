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
 */
const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const resourcesDir = path.join(__dirname, '..', 'resources')
const profileMarker = path.join(resourcesDir, '.profile-name')

const requestedProfile = process.argv[2]
if (requestedProfile) {
  const apply = spawnSync('node', [path.join(__dirname, 'apply-profile.js'), requestedProfile], {
    stdio: 'inherit'
  })
  if (apply.status !== 0) process.exit(apply.status ?? 1)
}

const profileName = fs.existsSync(profileMarker) ? fs.readFileSync(profileMarker, 'utf8').trim() : 'demo'

const build = spawnSync('npx', ['electron-vite', 'build'], {
  stdio: 'inherit',
  shell: true
})
if (build.status !== 0) process.exit(build.status ?? 1)

const pack = spawnSync('npx', ['electron-builder'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, PROFILE_NAME: profileName }
})
process.exit(pack.status ?? 1)
