import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ALL_ITEMS, computeAudit, evalDensity, evalTera, evalTenants, reasonsForFail, searchItems, TERA_ITEM, TENANT_ITEM,
} from '../src/lib/scoring.js'

function baseAudit(extra = {}) {
  const results = {}
  ALL_ITEMS.forEach((it) => { results[it.code] = { grade: 'A', photos: [], jumlah: null } })
  ;['4.3.f', '5.1.f', '5.2.g'].forEach((c) => { results[c].jumlah = 2 })
  return { id: 'x', info: { kelasTarget: 'excellent', tanggalAudit: '2026-09-27', nozzles: [] }, results, ...extra }
}

const tenant = (kategori, berlakuSampai, izin = true) => ({
  id: kategori + berlakuSampai, nama: 'T ' + kategori, kategori, berlakuSampai,
  fotoTenant: [{ src: 'x' }], fotoIzin: izin ? [{ src: 'x' }] : [],
})

test('semua A tanpa tenant → hanya Good (Excellent butuh tenant int\'l + nasional)', () => {
  const a = baseAudit()
  const c = computeAudit(a)
  assert.equal(c.ts.toFixed(2), '100.00')
  assert.equal(c.classification, 'good')
  assert.ok(reasonsForFail(c, 'excellent').some((r) => r.includes('tenant internasional')))
})

test('tenant internasional + nasional berizin berlaku → Excellent', () => {
  const a = baseAudit()
  a.results[TENANT_ITEM].tenants = [tenant('internasional', '2027-01-01'), tenant('nasional', '2026-12-31')]
  assert.equal(computeAudit(a).classification, 'excellent')
})

test('izin kedaluwarsa atau tanpa foto izin tidak dihitung', () => {
  const a = baseAudit()
  a.results[TENANT_ITEM].tenants = [tenant('internasional', '2026-09-01'), tenant('nasional', '2027-01-01')]
  assert.equal(computeAudit(a).classification, 'good')
  a.results[TENANT_ITEM].tenants = [tenant('internasional', '2027-01-01', false), tenant('nasional', '2027-01-01')]
  assert.equal(computeAudit(a).classification, 'good')
  assert.equal(evalTenants(a).autoGrade, 'F')
})

test('density: selisih dalam/luar toleransi 0,003', () => {
  const ok = evalDensity({ density: { refD15Manual: '0,7450', obs: '0,7400', suhu: '15' } })
  assert.equal(ok.auditD15, 0.74)
  assert.equal(ok.selisih, -0.005)
  assert.equal(ok.autoGrade, 'F')
  const pas = evalDensity({ density: { refD15Manual: '0,7420', obs: '0,7400', suhu: '15' } })
  assert.equal(pas.autoGrade, 'A')
  const batas = evalDensity({ density: { refD15Manual: '0,7430', obs: '0,7400', suhu: '15' } })
  assert.equal(batas.ok, true)
})

test('tera: batas -60 ml dan cakupan nozzle per produk', () => {
  const nozzles = [
    { id: 'n1', nomor: '1', produk: 'Pertalite' },
    { id: 'n2', nomor: '2', produk: 'Pertalite' },
    { id: 'n3', nomor: '3', produk: 'Pertamax' },
  ]
  const a = baseAudit()
  a.info.nozzles = nozzles
  a.info.kelasTarget = 'good'
  a.results[TERA_ITEM].tera = { n1: '-60', n3: '+20' }
  let e = evalTera(a)
  assert.equal(e.coverageOk, true)
  assert.equal(e.autoGrade, 'A')

  a.info.kelasTarget = 'excellent'
  e = evalTera(a)
  assert.equal(e.coverageOk, false)
  assert.equal(e.autoGrade, null)

  a.results[TERA_ITEM].tera = { n1: '-61' }
  assert.equal(evalTera(a).autoGrade, 'F')
})

test('pencarian "apar" menemukan APAR, APAB & item pemadam lain', () => {
  const codes = searchItems('Apar').map((h) => h.code)
  for (const c of ['3.1.4.a', '3.1.4.b', '3.1.4.c']) assert.ok(codes.includes(c), c)
  assert.ok(searchItems('zzzz').length === 0)
})

test('pencarian beberapa kata & kode item', () => {
  assert.deepEqual(searchItems('2.2.m').map((h) => h.code), ['2.2.m'])
  assert.ok(searchItems('density pertamax').some((h) => h.code === '2.2.g'))
})
