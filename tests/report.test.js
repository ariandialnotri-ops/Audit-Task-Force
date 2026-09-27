import { test } from 'node:test'
import assert from 'node:assert/strict'
import { operatorCounts, operatorTotal, operatorsOnDuty, operatorSampleTotal, evalTera, ALL_ITEMS } from '../src/lib/scoring.js'
import { buildReport, complianceLevel } from '../src/lib/report.js'
import { createReportPdf, pdfText, PDF_LAYOUT } from '../src/lib/pdf.js'

function sampleAudit(extra = {}) {
  const results = {}
  ALL_ITEMS.forEach((it) => { results[it.code] = { grade: it.allowed[0], photos: [] } })
  return {
    id: 'a_test1234', status: 'selesai', reportNo: 'PW/5164116/1234',
    info: {
      nomorSpbu: '5164116', kota: 'Kediri', tanggalAudit: '2026-09-27', kelasTarget: 'good',
      auditors: ['Ari', 'Budi'], operators: { S1: '4', S2: '3', S3: '2', OFF: '5' }, shiftAudit: ['S1', 'S3', 'OFF'],
      nozzles: [{ id: 'n1', nomor: '2', produk: 'Pertalite' }, { id: 'n2', nomor: '1', produk: 'Pertamax' }],
    },
    results: { ...results, '2.2.m': { grade: 'A', tera: { n1: '-20', n2: '12' }, teraMode: { n2: 'M' } } },
    ...extra,
  }
}

test('operator: total semua shift, bertugas = shift terpilih tanpa OFF', () => {
  const a = sampleAudit()
  assert.deepEqual(operatorCounts(a).OFF, 5)
  assert.equal(operatorTotal(a), 14)
  assert.equal(operatorsOnDuty(a), 6)
  assert.equal(operatorSampleTotal(a, '1.1.1.a'), 6)
  assert.equal(operatorSampleTotal(a, '3.1.4.t'), 14)
})

test('tera: mode P/M dan qty var = ml / 20 L', () => {
  const e = evalTera(sampleAudit())
  const n2 = e.rows.find((r) => r.id === 'n2')
  assert.equal(n2.mode, 'M')
  assert.equal(e.rows.find((r) => r.id === 'n1').mode, 'P')
  assert.equal(n2.qtyVar, 12 / 20000)
})

test('laporan: struktur mengikuti Excel referensi', () => {
  const R = buildReport(sampleAudit())
  assert.equal(R.indikator.length, 5)
  assert.ok(Math.abs(R.totalScore - R.ts) < 1e-9)
  assert.ok(R.infoAudit.some((r) => r[0] === 'Auditor 2' && r[1] === 'Budi'))
  assert.ok(!JSON.stringify(R.infoAudit).includes('Koordinator'))
  // Q&Q diurutkan per nomor nozzle, produk huruf besar
  assert.deepEqual(R.qq.map((r) => [r[0], r[1], r[2]]), [['1', 'PERTAMAX', 'M'], ['2', 'PERTALITE', 'P']])
  // semua item masuk tepat sekali di Detail Checklist
  const codes = R.detailGroups.flatMap((g) => g.rows.map((r) => r.code))
  assert.equal(codes.length, ALL_ITEMS.length)
  assert.equal(new Set(codes).size, ALL_ITEMS.length)
  assert.equal(complianceLevel(0.96), 'Excellent')
  assert.equal(complianceLevel(0.5), 'Poor')
})

test('PDF A4: kelompok checklist tidak terpotong antarhalaman', async () => {
  const R = buildReport(sampleAudit())
  const doc = await createReportPdf(R)
  const w = doc.internal.pageSize.getWidth()
  const h = doc.internal.pageSize.getHeight()
  assert.ok(Math.abs(w - 210) < 0.5 && Math.abs(h - 297) < 0.5, 'ukuran A4')
  assert.ok(doc.getNumberOfPages() >= 4)
  assert.deepEqual(doc.reportMeta.splitGroups, [])
  assert.ok(PDF_LAYOUT.BOTTOM < PDF_LAYOUT.PAGE_H)
})

test('teks PDF bebas karakter di luar WinAnsi', () => {
  assert.equal(pdfText('≥ 60 − 3 → ✓'), '>= 60 - 3 -> OK')
})
