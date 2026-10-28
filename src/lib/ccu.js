/**
 * Mesin skor Cross Check Up (CCU) SPBU COCO — meniru rumus Excel
 * "Checklist_Program_CCU_SPBU_COCO - Versi 3.0 2024.xlsx":
 * - Nilai item: A=1, B=0.8, C=0.6, D=0.4, E=0.2, F=0, X = N/A. Value = bobot × nilai.
 * - Skor aspek (kolom AN) = Σvalue / (Σbobot − Σbobot item X) × Σbobot  → skala 0–100.
 *   Item yang belum dinilai bernilai 0 (sama seperti Excel).
 * - XIII Digital Campaign: skor = Σvalue (tanpa normalisasi N/A, sesuai sel AG142).
 * - XIV Bright Store: skor = rata-rata skor XIV.1, XIV.2, XIV.3 + skor baris toggle
 *   ("Bila tidak ada Bright Store/Cafe diberikan nilai A"): tidak ada store → A (100) → skor 100.
 * - XV Subsidi Tepat: baris toggle ikut dalam Σ (bobot 100): tidak ada JBT → A; ada JBT → F.
 * - Total Score = Σ skor aspek × bobot aspek (sheet Rekap Score). Status (sel AG5):
 *   ≤35 Warning, ≤60 Poor, ≤80 Average, ≤95 Good, >95 Excellent.
 */
import { CCU_SECTIONS } from '../data/ccu.js'

export const GRADE_VALUE = { A: 1, B: 0.8, C: 0.6, D: 0.4, E: 0.2, F: 0 }

function allowedOf(scale) {
  if (scale === 'A-F') return ['A', 'B', 'C', 'D', 'E', 'F']
  return scale.split('/').filter((g) => g !== 'X')
}

/** Daftar datar item CCU dengan metadata induk. */
export const CCU_ITEMS = []
CCU_SECTIONS.forEach((s) => {
  const parts = s.parts || [{ code: null, title: null, groups: s.groups }]
  parts.forEach((p) => p.groups.forEach((g) => g.items.forEach((it) => {
    CCU_ITEMS.push({
      ...it,
      allowed: allowedOf(it.scale),
      allowNA: /X/.test(it.scale),
      secCode: s.code, secTitle: s.title, partCode: p.code, partTitle: p.title, groupCode: g.code, groupTitle: g.title,
    })
  })))
})
export const CCU_BY_CODE = Object.fromEntries(CCU_ITEMS.map((it) => [it.code, it]))

/** Bagian yang di-nonaktifkan oleh toggle (tidak ada Bright Store / JBT). */
export function ccuSkipped(audit, secCode) {
  const i = (audit && audit.info) || {}
  if (secCode === 'XIV') return i.adaBrightStore === false
  if (secCode === 'XV') return i.adaJbt === false
  return false
}

export function ccuApplicableItems(audit) {
  return CCU_ITEMS.filter((it) => !ccuSkipped(audit, it.secCode))
}

function resultOf(audit, code) {
  return (audit.results && audit.results[code]) || {}
}

/** Σ seperti kolom U/V/W Excel untuk sekumpulan item. */
function sums(audit, items) {
  let u = 0
  let v = 0
  let w = 0
  items.forEach((it) => {
    const g = resultOf(audit, it.code).grade
    u += it.weight
    if (g === 'X') w += it.weight
    else if (g in GRADE_VALUE) v += it.weight * GRADE_VALUE[g]
  })
  return { u, v, w }
}

const norm = ({ u, v, w }) => (u - w > 0 ? (v / (u - w)) * u : 0)

export function ccuStatus(ts) {
  if (ts <= 35) return 'Warning'
  if (ts <= 60) return 'Poor'
  if (ts <= 80) return 'Average'
  if (ts <= 95) return 'Good'
  return 'Excellent'
}

export function computeCcu(audit) {
  const sections = CCU_SECTIONS.map((s) => {
    const items = CCU_ITEMS.filter((it) => it.secCode === s.code)
    const skipped = ccuSkipped(audit, s.code)
    let score
    let parts = null
    if (s.code === 'XIV') {
      parts = s.parts.map((p) => ({ code: p.code, title: p.title, score: skipped ? 0 : norm(sums(audit, items.filter((it) => it.partCode === p.code))) }))
      const toggle = skipped ? 100 : 0
      score = parts.reduce((n, p) => n + p.score, 0) / parts.length + toggle
    } else if (s.code === 'XV') {
      const base = skipped ? { u: 0, v: 0, w: 0 } : sums(audit, items)
      const tw = s.toggle.weight
      const t = { u: base.u + tw, v: base.v + (skipped ? tw : 0), w: base.w }
      // Σbobot item (±100) + bobot toggle (100); hasil ×Σ lalu dibatasi seperti Excel
      score = skipped ? 100 : (t.u - t.w > 0 ? (t.v / (t.u - t.w)) * t.u : 0)
    } else if (s.formula === 'sum') {
      score = sums(audit, items).v
    } else {
      score = norm(sums(audit, items))
    }
    const applicable = skipped ? [] : items
    const graded = applicable.filter((it) => resultOf(audit, it.code).grade).length
    const submitted = applicable.filter((it) => resultOf(audit, it.code).submittedAt).length
    return { code: s.code, title: s.title, bobot: s.bobot, score, weighted: score * s.bobot, count: items.length, applicable: applicable.length, graded, submitted, skipped, parts }
  })
  const ts = sections.reduce((n, s) => n + s.weighted, 0)
  const applicable = ccuApplicableItems(audit)
  return {
    sections,
    ts,
    status: ccuStatus(ts),
    totalItems: applicable.length,
    totalGraded: applicable.filter((it) => resultOf(audit, it.code).grade).length,
    totalSubmitted: applicable.filter((it) => resultOf(audit, it.code).submittedAt).length,
    findings: applicable.filter((it) => { const g = resultOf(audit, it.code).grade; return g && g !== 'A' && g !== 'X' }).length,
  }
}
