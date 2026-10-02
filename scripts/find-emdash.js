#!/usr/bin/env node
/**
 * Lists every em dash that can actually appear on screen, i.e. in strings and JSX text and not in
 * code comments, so the app's wording can be kept free of them.
 *
 *   node scripts/find-emdash.js        (exits 1 if any are found)
 *
 * Comments are removed first, then what is left is searched. An en dash used as a range separator
 * (13.0 to 17.0 written with an en dash) is fine and is not reported.
 */
const fs = require('fs')
const path = require('path')
const esbuild = require('esbuild')

const EM = '—'
const files = []
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(p)
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(p)
  }
}
const root = path.join(__dirname, '..')
for (const d of ['src', 'electron']) walk(path.join(root, d))

let total = 0
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8')
  if (!source.includes(EM)) continue
  // Compile to plain JS first (this removes type syntax), then drop the comments that remain.
  const code = esbuild.transformSync(source, { loader: file.endsWith('x') ? 'tsx' : 'ts', jsx: 'preserve', charset: 'utf8', legalComments: 'none' }).code
  const noBlock = code.replace(/\/\*[\s\S]*?\*\//g, '')
  const noLine = noBlock
    .split('\n')
    .map((line) => line.replace(/(^|\s)\/\/\s.*$/, '$1'))
    .join('\n')
  noLine.split('\n').forEach((line) => {
    if (!line.includes(EM)) return
    total++
    console.log(`${path.relative(root, file).replace(/\\/g, '/')}: ${line.trim().slice(0, 160)}`)
  })
}
console.log(total === 0 ? 'No em dashes in visible text.' : `\n${total} line(s) with an em dash in visible text.`)
process.exit(total === 0 ? 0 : 1)
