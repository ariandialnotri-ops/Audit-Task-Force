/**
 * Penyusun isi laporan audit — mengikuti struktur file referensi
 * "Audit_Pertamina_Way_SPBU_*.xlsx" (sheet Ringkasan, Detail Checklist,
 * Komentar Auditor, Pengecekan Q&Q). Dipakai oleh PDF (src/lib/pdf.js) dan
 * dapat diuji tanpa DOM.
 */
import { CHECKLIST_TREE } from '../data/checklist.js'
import {
  ALL_ITEMS, ELEMENT_MIN, DENSITY_ITEMS, TENANT_ITEM, TENANT_CATEGORIES, SHIFTS,
  getResult, computeAudit, reasonsForFail, evalDensity, evalTera, evalTenants,
  operatorCounts, operatorTotal, operatorsOnDuty, OPERATOR_ITEMS,
} from './scoring.js'

export const REPORT_TITLE = 'PERFORMANCE AUDIT REPORT - PERTAMINA WAY'
export const REPORT_UNIT = 'TASK FORCE REGION VI JATIMBALINUS'

/** Warna isian sel (hex tanpa #) — sama dengan file referensi. */
export const COLORS = {
  navy: '1F4E78',
  element: 'F4CCCC',
  sub: 'D9EAD3',
  subsub: 'FCE5CD',
  total: 'D9D9D9',
  grade: { A: '93C47D', B: 'B6D7A8', C: 'A2C4C9', D: 'FFE599', E: 'F9CB9C', F: 'EA9999', X: 'D9D9D9' },
  level: { Excellent: 'F1C232', Good: '93C47D', Average: '9FC5E8', Poor: 'F9CB9C', Warning: 'EA9999' },
  cls: { excellent: '0B5394', good: '38761D', gagal: 'CC0000' },
}

export function complianceLevel(pct) {
  if (pct > 0.95) return 'Excellent'
  if (pct > 0.80) return 'Good'
  if (pct > 0.60) return 'Average'
  if (pct > 0.35) return 'Poor'
  return 'Warning'
}

const r2 = (n) => Math.round(n * 100) / 100
/** 24.2, 7, 13.39 — seperti "Skor : 24.2" di referensi. */
export function fmtSkor(n) {
  return String(r2(n))
}
export function fmtPct(p) {
  return `${(p * 100).toFixed(2)}%`
}
function fmtDateId(v) {
  if (!v) return '-'
  const d = typeof v === 'number' ? new Date(v) : new Date(`${v}T00:00:00`)
  if (Number.isNaN(d.getTime())) return String(v)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}
function quarterOf(dateStr) {
  const m = /^\d{4}-(\d{2})/.exec(dateStr || '')
  return m ? `Q${Math.ceil(Number(m[1]) / 3)}` : '-'
}
const dash = (v) => (v === undefined || v === null || String(v).trim() === '' ? '-' : String(v))
const fmtNum = (v, d) => (v === null || v === undefined || !Number.isFinite(v) ? '-' : v.toFixed(d))

const CLS_TEXT = { excellent: 'PASTI PAS EXCELLENT!', good: 'PASTI PAS GOOD!', gagal: 'BELUM MEMENUHI PASTI PAS' }

/** Susun seluruh isi laporan. */
export function buildReport(audit) {
  const a = audit
  const i = a.info || {}
  const comp = computeAudit(a)
  const level = i.kelasTarget === 'excellent' ? 'excellent' : 'good'
  const auditors = (i.auditors || []).map((x) => String(x || '').trim()).filter(Boolean)
  const counts = operatorCounts(a)
  const dutyIds = (i.shiftAudit || []).filter((id) => id !== 'OFF')

  /* ---------- Ringkasan ---------- */
  const infoSpbu = [
    ['Nomor SPBU', dash(i.nomorSpbu), 'Region', dash(i.region)],
    ['Kota', dash(i.kota), 'Alamat', dash(i.alamat)],
    ['Nama Pemilik', dash(i.namaPemilik), 'Area Business Head', dash(i.areaBusinessHead)],
    ['Tipe Kepemilikan', dash(i.tipeKepemilikan), 'Quarter', quarterOf(i.tanggalAudit)],
    ['Tahun', dash(i.tahun), 'Telepon', dash(i.telepon)],
  ]
  const auditorRows = (auditors.length ? auditors : ['-']).map((nm, k) => [`Auditor ${k + 1}`, nm])
  const right = [
    ['Tipe Audit', dash(i.tipeAudit)],
    ['Kelas SPBU (Target)', level === 'excellent' ? 'Pasti Pas Excellent' : 'Pasti Pas Good'],
    ['Total Operator', `${operatorTotal(a)} orang`],
    ['Bertugas saat Audit', dutyIds.length ? `${operatorsOnDuty(a)} orang (${dutyIds.join(' + ')})` : '-'],
    ['Jumlah Nozzle', `${(i.nozzles || []).length} nozzle`],
  ]
  const infoAudit = [['Tanggal Audit', fmtDateId(i.tanggalAudit), 'No. Report', a.reportNo || 'DRAFT']]
  const leftRows = [['Tanggal Laporan', a.reportSubmittedAt ? fmtDateId(a.reportSubmittedAt) : '-'], ...auditorRows]
  const n = Math.max(leftRows.length, right.length)
  for (let k = 0; k < n; k++) {
    const l = leftRows[k] || ['', '']
    const rr = right[k] || ['', '']
    infoAudit.push([l[0], l[1], rr[0], rr[1]])
  }

  const indikator = CHECKLIST_TREE.map((el) => {
    const er = comp.elementResults[el.code]
    const pct = er.applicable > 0 ? er.pct : 0
    return { title: el.title, weight: el.weight, min: ELEMENT_MIN[level][el.code], pct, level: complianceLevel(pct), skor: el.weight * pct }
  })

  const subRows = []
  CHECKLIST_TREE.forEach((el) => {
    subRows.push({ type: 'el', title: el.title })
    el.subs.forEach((sub) => {
      const sr = comp.subResults[sub.code]
      const pct = sr.applicable > 0 ? sr.pct : 0
      subRows.push({ type: 'sub', title: sub.title, weight: sub.weight, pct, level: sr.applicable > 0 ? complianceLevel(pct) : '-' })
    })
  })

  /* ---------- Detail Checklist (dikelompokkan untuk pemenggalan halaman) ---------- */
  const itemRow = (it) => {
    const g = getResult(a, it.code).grade
    return { code: it.code, desc: it.desc.replace(/\s+/g, ' ').trim(), grade: g || '-' }
  }
  const detailGroups = []
  CHECKLIST_TREE.forEach((el, ei) => {
    const er = comp.elementResults[el.code]
    let elHeader = { level: 'el', text: `Elemen ${el.code}: ${el.title}`, skor: fmtSkor(el.weight * (er.applicable > 0 ? er.pct : 0)) }
    el.subs.forEach((sub) => {
      const sr = comp.subResults[sub.code]
      let subHeader = { level: 'sub', text: `Sub-Elemen ${sub.code}. ${sub.title}`, skor: fmtSkor(sub.weight * (sr.applicable > 0 ? sr.pct : 0)) }
      if (sub.items.length) {
        detailGroups.push({ headers: [elHeader, subHeader].filter(Boolean), rows: sub.items.map(itemRow) })
        elHeader = null
        subHeader = null
      }
      sub.subsubs.forEach((ss) => {
        const xr = comp.subsubResults[ss.code]
        const ssHeader = { level: 'ss', text: `${ss.code}: ${ss.title}`, skor: fmtSkor(ss.weight * (xr.applicable > 0 ? xr.pct : 0)) }
        detailGroups.push({ headers: [elHeader, subHeader, ssHeader].filter(Boolean), rows: ss.items.map(itemRow) })
        elHeader = null
        subHeader = null
      })
    })
    void ei
  })

  /* ---------- Komentar Auditor ---------- */
  const komentar = CHECKLIST_TREE.map((el) => {
    const rows = []
    ALL_ITEMS.filter((it) => it.elCode === el.code).forEach((it) => {
      const r = getResult(a, it.code)
      const names = OPERATOR_ITEMS[it.code] && r.pct && String(r.pct.names || '').trim()
      let text = String(r.note || '').trim()
      if (!text && r.grade && !['A', 'X'].includes(r.grade)) text = `Nilai ${r.grade} — ${it.desc.replace(/\s+/g, ' ').slice(0, 110)}${it.desc.length > 110 ? '…' : ''}`
      if (names) text = [text, `Operator tidak memenuhi: ${names}`].filter(Boolean).join('. ')
      if (text) rows.push([it.code, text])
    })
    if (el.code === '1') {
      if (i.umkTahunIni) rows.push(['-', `UMK Tahun ini: Rp ${i.umkTahunIni}`])
      if (i.upahOperator) rows.push(['-', `Upah operator: Rp ${i.upahOperator}`])
      if (i.hariKerja) rows.push(['-', `Hari kerja: ${i.hariKerja}`])
      if (i.bpjs) rows.push(['-', `Bukti bayar/kepesertaan BPJS Kes dan TK: ${i.bpjs}`])
      const opParts = SHIFTS.filter((s) => counts[s.id]).map((s) => `${s.id} ${counts[s.id]}`)
      if (opParts.length) rows.push(['-', `Operator: ${operatorTotal(a)} orang (${opParts.join(', ')}); bertugas saat audit ${operatorsOnDuty(a)} orang`])
    }
    if (el.code === '5') {
      const ten = evalTenants(a)
      TENANT_CATEGORIES.forEach((c) => {
        const names = ten.rows.filter((t) => t.kategori === c.id).map((t) => t.nama).filter(Boolean)
        rows.push(['-', names.length ? `Tersedia ${c.label} (${names.join(', ')})` : `Tidak tersedia ${c.label}`])
      })
    }
    return { element: el.title, rows: rows.length ? rows : [['-', '-']] }
  })

  /* ---------- Pengecekan Q&Q ---------- */
  const densityByProduct = {}
  Object.entries(DENSITY_ITEMS).forEach(([code, produk]) => {
    const r = getResult(a, code)
    densityByProduct[produk] = r.grade === 'X' ? null : { d: r.density || {}, e: evalDensity(r) }
  })
  const tera = evalTera(a)
  const qq = [...tera.rows]
    .sort((x, y) => (parseInt(x.nomor, 10) || 0) - (parseInt(y.nomor, 10) || 0))
    .map((row) => {
      const dn = densityByProduct[row.produk]
      const e = dn && dn.e
      return [
        dash(row.nomor),
        String(row.produk || '-').toUpperCase(),
        row.mode || 'P',
        row.ml === null ? '-' : String(row.ml),
        row.qtyVar === null ? '-' : `${(row.qtyVar * 100).toFixed(2)}%`,
        dn && dn.d.obs ? String(dn.d.obs).replace(',', '.') : '-',
        dn && dn.d.suhu ? String(dn.d.suhu).replace(',', '.') : '-',
        e ? fmtNum(e.auditD15, 4) : '-',
        e ? fmtNum(e.refD15, 4) : '-',
        e && e.selisih !== null ? e.selisih.toFixed(4) : '-',
      ]
    })

  /* ---------- Uji takar (tera) saja, tanpa kolom density ---------- */
  const teraRes = getResult(a, '2.2.m')
  const teraOnly = {
    rows: [...tera.rows]
      .sort((x, y) => (parseInt(x.nomor, 10) || 0) - (parseInt(y.nomor, 10) || 0))
      .map((row) => [
        dash(row.nomor),
        String(row.produk || '-').toUpperCase(),
        row.mode || 'P',
        row.ml === null ? '-' : String(row.ml),
        row.qtyVar === null ? '-' : `${(row.qtyVar * 100).toFixed(2)}%`,
        row.ok === null ? 'Tidak diperiksa' : row.ok ? 'Sesuai' : 'Di bawah toleransi',
      ]),
    checked: tera.testedCount,
    red: tera.failRows.length,
    total: tera.rows.length,
    grade: teraRes.grade || '-',
    note: String(teraRes.note || '').trim(),
    byProduct: tera.byProduct.map((p) => [String(p.produk).toUpperCase(), `${p.tested}/${p.total}`, String(p.required), p.fail ? `${p.fail} di bawah toleransi` : '-']),
    photos: (teraRes.photos || []).map((p) => ({ photo: p, caption: 'Item 2.2.m (uji takar)' })),
  }

  /* ---------- Lampiran foto ---------- */
  const photos = []
  ALL_ITEMS.forEach((it) => {
    ;(getResult(a, it.code).photos || []).forEach((p) => photos.push({ photo: p, caption: `Item ${it.code}` }))
  })
  ;(getResult(a, TENANT_ITEM).tenants || []).forEach((t) => {
    ;(t.fotoTenant || []).forEach((p) => photos.push({ photo: p, caption: `${TENANT_ITEM} ${t.nama || ''} (tenant)` }))
    ;(t.fotoIzin || []).forEach((p) => photos.push({ photo: p, caption: `${TENANT_ITEM} ${t.nama || ''} (izin prinsip)` }))
  })

  return {
    title: REPORT_TITLE,
    unit: REPORT_UNIT,
    reportNo: a.reportNo || 'DRAFT',
    status: a.status,
    infoSpbu,
    infoAudit,
    ts: comp.ts,
    classification: comp.classification,
    clsText: CLS_TEXT[comp.classification],
    reasons: comp.classification === 'gagal' ? reasonsForFail(comp, level) : [],
    indikator,
    totalScore: indikator.reduce((s, x) => s + x.skor, 0),
    subRows,
    detailGroups,
    komentar,
    komentarManajer: String(i.komentarManajer || '').trim(),
    qq,
    teraOnly,
    nomorSpbu: String(i.nomorSpbu || ''),
    tanggalAudit: String(i.tanggalAudit || ''),
    photos,
    fileName: `Audit_Pertamina_Way_SPBU_${String(i.nomorSpbu || 'SPBU').replace(/[^\w-]+/g, '_')}.pdf`,
    fingerprint: JSON.stringify({ id: a.id, ts: r2(comp.ts), cls: comp.classification, g: ALL_ITEMS.map((it) => getResult(a, it.code).grade || '-').join('') }),
  }
}
