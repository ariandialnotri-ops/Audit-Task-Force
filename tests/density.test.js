import { test } from 'node:test'
import assert from 'node:assert/strict'
import { density15, normalizeDensity } from '../src/lib/density.js'
import table from '../src/data/table53.js'

test('nilai tepat di tabel ASTM 53 dikembalikan apa adanya', () => {
  const di = table.densities.indexOf(0.745)
  const ti = table.temps.indexOf(30)
  const expected = table.values[ti][di]
  const r = density15('0,745', '30')
  assert.equal(r.method, 'table')
  assert.equal(r.value, Math.round(expected * 10000) / 10000)
})

test('input kg/m3 setara g/mL', () => {
  assert.deepEqual(density15('745', '30'), density15('0.745', '30'))
  assert.equal(normalizeDensity('745'), 0.745)
})

test('density 15 lebih besar dari observasi saat suhu > 15°C', () => {
  const r = density15('0,7400', '32,5')
  assert.ok(r.value > 0.74)
})

test('interpolasi di antara baris suhu', () => {
  const a = density15('0,745', '30').value
  const b = density15('0,745', '30,5').value
  const mid = density15('0,745', '30,25').value
  assert.ok(Math.min(a, b) <= mid && mid <= Math.max(a, b))
})

test('di luar tabel memakai rumus 53B', () => {
  const r = density15('0,950', '30')
  assert.equal(r.method, 'formula')
})

test('input kosong/invalid → null', () => {
  assert.equal(density15('', '30'), null)
  assert.equal(density15('abc', '30'), null)
})
