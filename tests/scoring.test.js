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

test('N/A hanya untuk item berskala /X (sesuai Excel sumber)', async () => {
  const { ITEM_BY_CODE, scaleLabel } = await import('../src/lib/scoring.js')
  const na = ALL_ITEMS.filter((i) => i.allowNA).map((i) => i.code)
  assert.equal(na.length, 20)
  for (const c of ['1.2.c', '1.2.d', '2.2.f', '2.2.l', '3.1.3.a', '3.1.1.n', '5.1.h']) assert.ok(na.includes(c), c)
  for (const c of ['1.1.1.a', '2.2.m', '3.1.4.a', '5.2.f']) assert.ok(!na.includes(c), c)
  assert.equal(scaleLabel(ITEM_BY_CODE['1.1.1.a']), 'A/F')
  assert.equal(scaleLabel(ITEM_BY_CODE['1.2.g']), 'A–F · N/A')
  assert.equal(scaleLabel(ITEM_BY_CODE['3.1.3.a']), 'A/C · N/A')
})

test('tera: tabel ketentuan nilai guideline (nozzle dicek vs di bawah −60 ml)', async () => {
  const { teraGradeByTable } = await import('../src/lib/scoring.js')
  assert.equal(teraGradeByTable(3, 0), 'A')
  assert.equal(teraGradeByTable(3, 1), 'F')
  assert.equal(teraGradeByTable(8, 1), 'C')
  assert.equal(teraGradeByTable(8, 2), 'F')
  assert.equal(teraGradeByTable(14, 2), 'C')
  assert.equal(teraGradeByTable(14, 3), 'F')
  assert.equal(teraGradeByTable(30, 3), 'C')
  assert.equal(teraGradeByTable(30, 4), 'F')
  assert.equal(teraGradeByTable(60, 4), 'C')
  assert.equal(teraGradeByTable(60, 5), 'F')
  assert.equal(teraGradeByTable(80, 2), 'B')
  assert.equal(teraGradeByTable(80, 6), 'C')
  assert.equal(teraGradeByTable(80, 7), 'F')
})

test('tera: 8 nozzle, 1 di bawah toleransi → C setelah cakupan terpenuhi', () => {
  const a = baseAudit()
  a.info.kelasTarget = 'excellent'
  a.info.nozzles = Array.from({ length: 8 }, (_, i) => ({ id: 'n' + i, nomor: String(i + 1), produk: 'Pertalite' }))
  a.results[TERA_ITEM].tera = { n0: '-70' }
  let e = evalTera(a)
  assert.equal(e.autoGrade, null) // belum lengkap, 1 Red masih bisa C
  assert.equal(e.provisional, 'F')
  a.results[TERA_ITEM].tera = Object.fromEntries(a.info.nozzles.map((n, i) => [n.id, i === 0 ? '-70' : '-10']))
  e = evalTera(a)
  assert.equal(e.autoGrade, 'C')
  a.results[TERA_ITEM].tera.n1 = '-61'
  assert.equal(evalTera(a).autoGrade, 'F')
})

test('kalkulator persentase sesuai kriteria guideline', async () => {
  const { gradeFromPct } = await import('../src/lib/scoring.js')
  assert.equal(gradeFromPct('A-F', 10, 10), 'A')
  assert.equal(gradeFromPct('A-F', 8, 10), 'B')
  assert.equal(gradeFromPct('A-F', 7, 10), 'C')
  assert.equal(gradeFromPct('A-F', 4, 10), 'D')
  assert.equal(gradeFromPct('A-F', 2, 10), 'E')
  assert.equal(gradeFromPct('A-F', 1, 10), 'F')
  assert.equal(gradeFromPct('ACF', 5, 5), 'A')
  assert.equal(gradeFromPct('ACF', 3, 5), 'C')
  assert.equal(gradeFromPct('ACF', 2, 5), 'F')
  assert.equal(gradeFromPct('AF', 9, 10), 'F')
  assert.equal(gradeFromPct('ABCF', 4, 5), 'B')
  assert.equal(gradeFromPct('AF', 11, 10), null)
})

test('skala setiap item sesuai Audit Guideline (item yang ada di guideline)', async () => {
  const { GUIDELINE } = await import('../src/data/guideline.js')
  const { ITEM_BY_CODE } = await import('../src/lib/scoring.js')
  const expand = (s) => {
    const g = []
    let x = false
    for (const p of s.split('/')) {
      if (p === 'X') { x = true; continue }
      const r = p.match(/^([A-F])-([A-F])$/)
      if (r) for (let c = r[1].charCodeAt(0); c <= r[2].charCodeAt(0); c++) g.push(String.fromCharCode(c))
      else g.push(p)
    }
    return { g: g.join(''), x }
  }
  assert.equal(Object.keys(GUIDELINE).length, 83)
  for (const [code, gl] of Object.entries(GUIDELINE)) {
    const it = ITEM_BY_CODE[code]
    const e = expand(gl.scale)
    assert.equal(it.allowed.join(''), e.g, `${code} (guideline ${gl.ref})`)
    assert.equal(it.allowNA, e.x, `${code} N/A`)
    for (const k of Object.keys(gl.crit)) assert.ok(k === 'X' ? it.allowNA : it.allowed.includes(k), `${code} kriteria ${k}`)
  }
  assert.equal(ITEM_BY_CODE['3.1.4.r'].allowed.join(''), 'ABCDEF')
})
