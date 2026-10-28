import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CCU_SECTIONS } from '../src/data/ccu.js'
import { CCU_ITEMS, computeCcu, ccuStatus } from '../src/lib/ccu.js'

const allGrade = (g, info = {}) => ({ info, results: Object.fromEntries(CCU_ITEMS.map((it) => [it.code, { grade: it.allowed.includes(g) ? g : it.allowed[it.allowed.length - 1] }])) })

test('struktur sesuai Excel: 15 aspek, 158 item, bobot aspek total 1', () => {
  assert.equal(CCU_SECTIONS.length, 15)
  assert.equal(CCU_ITEMS.length, 158)
  assert.ok(Math.abs(CCU_SECTIONS.reduce((n, s) => n + s.bobot, 0) - 1) < 1e-9)
})

test('semua A → total 100 Excellent', () => {
  const c = computeCcu(allGrade('A'))
  assert.ok(Math.abs(c.ts - 100) < 0.01, c.ts)
  assert.equal(c.status, 'Excellent')
})

test('aspek standar: N/A dikeluarkan, belum dinilai = 0', () => {
  const a = allGrade('A')
  a.results['I.1'] = { grade: 'X' }
  a.results['I.2'] = { grade: 'F' }
  const s = computeCcu(a).sections[0]
  // (13 × 6.667) / (100 − 6.667) × 100
  assert.ok(Math.abs(s.score - (13 * 100 / 15) / (100 - 100 / 15) * 100) < 1e-6)
  delete a.results['I.3']
  assert.ok(computeCcu(a).sections[0].score < s.score)
})

test('Bright Store & JBT tidak ada → skor aspek 100', () => {
  const c = computeCcu({ info: { adaBrightStore: false, adaJbt: false }, results: {} })
  assert.equal(c.sections.find((s) => s.code === 'XIV').score, 100)
  assert.equal(c.sections.find((s) => s.code === 'XV').score, 100)
  assert.equal(c.totalItems, 158 - 43 - 7)
})

test('Bright Store ada: rata-rata 3 bagian', () => {
  const a = allGrade('A')
  CCU_ITEMS.filter((it) => it.partCode === 'XIV.3').forEach((it) => { a.results[it.code] = { grade: 'F' } })
  const s = computeCcu(a).sections.find((x) => x.code === 'XIV')
  assert.ok(Math.abs(s.score - 200 / 3) < 1e-6)
})

test('status mengikuti sel AG5', () => {
  assert.equal(ccuStatus(35), 'Warning')
  assert.equal(ccuStatus(60), 'Poor')
  assert.equal(ccuStatus(80), 'Average')
  assert.equal(ccuStatus(95), 'Good')
  assert.equal(ccuStatus(95.01), 'Excellent')
})
