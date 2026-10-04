// Forgiving search for the Doctors and Patients pages: finds "Dr. Ravi Kumar" from "ravy kumr", "MBSS" from the
// qualification "MBBS", and an orthopaedic surgeon from "orthopedik" or just "bone".
//
// Every word the user types has to match something about the doctor (name, qualifications,
// speciality, phone), and it may match loosely: a prefix, a part of a word, a word that sounds the
// same, or a word with a typo (the longer the word, the more slips are forgiven). Doctors are then
// ranked by how well their words matched, so the closest come first.

import type { Doctor, Patient } from './api'

/** Lowercase, no accents, punctuation turned into spaces, and the "Dr" title dropped. */
function words(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((w) => w && w !== 'dr' && w !== 'doctor')
}

/** A rough "how it sounds" key, so Kavitha / Kavita, Raviendran / Ravindran or Mohammed / Mohamed meet. */
function sound(word: string): string {
  return word
    .replace(/ph/g, 'f')
    .replace(/ck|q/g, 'k')
    .replace(/c(?=[eiy])/g, 's')
    .replace(/c/g, 'k')
    .replace(/z/g, 's')
    .replace(/w/g, 'v')
    .replace(/y/g, 'i')
    .replace(/ee/g, 'i')
    .replace(/oo/g, 'u')
    .replace(/(?!^)h/g, '')
    .replace(/(.)\1+/g, '$1')
}

/** Edit distance counting a swapped pair of neighbouring letters as one slip ("ravi" / "rvai"). */
function distance(a: string, b: string): number {
  const d: number[][] = []
  for (let i = 0; i <= a.length; i++) {
    d[i] = [i]
  }
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
    }
  }
  return d[a.length][b.length]
}

/** How many slips a typed word of this length may contain and still count. */
function allowedSlips(length: number): number {
  return length <= 3 ? 0 : length <= 6 ? 1 : 2
}

/** 0 (no match) to 1 (the same word): how well the typed word `q` matches the doctor's word `w`. */
function wordScore(q: string, w: string): number {
  if (q === w) return 1
  if (q.length >= 2 && w.startsWith(q)) return 0.9
  if (q.length >= 3 && w.includes(q)) return 0.7
  const slips = allowedSlips(q.length)
  if (slips > 0) {
    // a typo anywhere in the word, or in the part being typed so far
    const d = Math.min(distance(q, w), distance(q, w.slice(0, q.length)) + 0.5)
    if (d <= slips) return 0.8 - 0.15 * Math.floor(d)
  }
  if (q.length >= 3 && sound(q) === sound(w)) return 0.6
  return 0
}

// Words that mean the same thing in a doctor's field, so "heart" finds a cardiologist and
// "gynec" or "obgyn" finds a gynaecologist. A doctor who has any word of a group is searchable by all of them.
const SAME_FIELD: string[][] = [
  ['orthopaedic', 'orthopaedics', 'orthopedic', 'orthopedics', 'ortho', 'bone', 'bones', 'joint', 'fracture'],
  ['cardiology', 'cardiologist', 'cardiac', 'cardio', 'heart'],
  ['gynaecology', 'gynaecologist', 'gynecology', 'gynecologist', 'gynae', 'gyne', 'obstetrics', 'obgyn', 'obg', 'women', 'maternity'],
  ['paediatrics', 'paediatrician', 'pediatrics', 'pediatrician', 'child', 'children', 'kids', 'baby'],
  ['general', 'physician', 'medicine', 'gp', 'family'],
  ['dermatology', 'dermatologist', 'skin', 'derma'],
  ['ent', 'otolaryngology', 'ear', 'nose', 'throat'],
  ['ophthalmology', 'ophthalmologist', 'eye', 'ophthal'],
  ['neurology', 'neurologist', 'neuro', 'brain', 'nerve'],
  ['urology', 'urologist', 'kidney', 'nephrology', 'nephrologist'],
  ['gastroenterology', 'gastroenterologist', 'gastro', 'stomach', 'liver', 'hepatology'],
  ['psychiatry', 'psychiatrist', 'mental', 'psychology'],
  ['radiology', 'radiologist', 'xray', 'scan'],
  ['pathology', 'pathologist'],
  ['surgery', 'surgeon', 'surgical'],
  ['diabetology', 'diabetologist', 'diabetes', 'sugar', 'endocrinology', 'endocrinologist'],
  ['dental', 'dentist', 'dentistry', 'bds', 'mds', 'teeth'],
  ['pulmonology', 'pulmonologist', 'chest', 'lung', 'respiratory'],
  ['oncology', 'oncologist', 'cancer'],
  ['anaesthesia', 'anaesthetist', 'anesthesia', 'anesthesiologist']
]

interface Haystack {
  weighted: { word: string; weight: number }[]
  /** The name with nothing between the words, so "rkapoor" still finds "R. Kapoor". */
  joinedName: string
  /** A phone number, digits only. */
  digits: string
  /** Record numbers such as a patient's SID: "14" finds 000014. */
  ids: string[]
}

function haystackFor(d: Doctor): Haystack {
  const weighted: { word: string; weight: number }[] = []
  const add = (text: string, weight: number) => words(text).forEach((word) => weighted.push({ word, weight }))
  add(d.name, 1)
  add(d.qualifications ?? '', 0.95)
  add(d.specialty ?? '', 0.95)
  // the lab's own wording of the field, widened with everything that means the same
  const field = new Set(words(d.specialty ?? '').concat(words(d.qualifications ?? '')))
  SAME_FIELD.forEach((group) => {
    if (group.some((g) => field.has(g))) group.forEach((word) => weighted.push({ word, weight: 0.85 }))
  })
  return { weighted, joinedName: words(d.name).join(''), digits: (d.phone ?? '').replace(/\D/g, ''), ids: [] }
}

/** How well one typed word matches this doctor; 0 means it doesn't. */
function tokenScore(q: string, h: Haystack): number {
  let best = 0
  for (const { word, weight } of h.weighted) {
    const s = wordScore(q, word) * weight
    if (s > best) best = s
  }
  if (/^\d{3,}$/.test(q) && h.digits.includes(q)) best = Math.max(best, 0.9)
  if (/^\d+$/.test(q)) {
    const bare = q.replace(/^0+/, '')
    for (const id of h.ids) {
      const idBare = id.replace(/^0+/, '')
      if (bare && idBare === bare) best = Math.max(best, 1)
      else if (bare.length >= 2 && idBare.includes(bare)) best = Math.max(best, 0.8)
    }
  }
  return best
}

export interface DoctorMatch {
  doctor: Doctor
  /** 0 to 1; below about 0.85 the doctor is a close guess rather than a straight match. */
  score: number
}

const MIN_WORD_SCORE = 0.45

/** Scores every item against the query (every typed word must match) and returns the matches, best first. */
function rank<T>(items: T[], query: string, build: (item: T) => Haystack, nameOf: (item: T) => string): { item: T; score: number }[] {
  const tokens = words(query)
  if (tokens.length === 0) return items.map((item) => ({ item, score: 1 }))
  const joinedQuery = tokens.join('')

  const matches: { item: T; score: number }[] = []
  for (const item of items) {
    const h = build(item)
    const scores = tokens.map((t) => tokenScore(t, h))
    let score = scores.every((s) => s >= MIN_WORD_SCORE) ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
    // the whole query run together against the whole name ("rkapoor", "ravikumar")
    if (tokens.length > 1 || score === 0) {
      const joined = joinedQuery.length >= 4 && h.joinedName.includes(joinedQuery) ? 0.9
        : joinedQuery.length >= 5 && distance(joinedQuery, h.joinedName.slice(0, joinedQuery.length)) <= allowedSlips(joinedQuery.length) ? 0.7 : 0
      score = Math.max(score, joined)
    }
    if (score > 0) matches.push({ item, score })
  }
  return matches.sort((a, b) => b.score - a.score || nameOf(a.item).localeCompare(nameOf(b.item)))
}

/** Doctors matching `query`, best first. An empty query returns everyone, in the order given. */
export function searchDoctors(doctors: Doctor[], query: string): DoctorMatch[] {
  return rank(doctors, query, haystackFor, (d) => d.name).map(({ item, score }) => ({ doctor: item, score }))
}

function patientHaystack(p: Patient): Haystack {
  const weighted: { word: string; weight: number }[] = []
  const add = (text: string, weight: number) => words(text).forEach((word) => weighted.push({ word, weight }))
  add(p.name, 1)
  add((p.sections ?? []).join(' '), 0.9)
  add(p.referredBy === 'Self' ? '' : p.referredBy ?? '', 0.9)
  return { weighted, joinedName: words(p.name).join(''), digits: (p.mobile ?? '').replace(/\D/g, ''), ids: [p.sid] }
}

/**
 * Patients matching `query`, best first: by name (typos and spellings forgiven), SID ("14" finds
 * 000014), mobile number, test or referring doctor. An empty query returns everyone, in order.
 */
export function searchPatients<T extends { patient: Patient }>(rows: T[], query: string): T[] {
  return rank(rows, query, (r) => patientHaystack(r.patient), (r) => r.patient.name).map((m) => m.item)
}
