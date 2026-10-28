/**
 * Isi laporan CCU mengikuti format Excel "Checklist CCU" + sheet "Rekap Score",
 * ditambah lampiran foto Temuan & Catatan vs Evidence per aspek (format sama dengan
 * laporan Pertamina Way).
 */
import { CCU_SECTIONS, CCU_TITLE, CCU_COMPANY, CCU_FORM_CODE, CCU_INFO_UMUM } from '../data/ccu.js'
import { CCU_ITEMS, computeCcu, ccuSkipped } from './ccu.js'

const dash = (v) => (v === undefined || v === null || String(v).trim() === '' ? '-' : String(v))
const lines = (t) => String(t || '').split(/\r?\n/).map((x) => x.replace(/^\s*(\d+[.)]|[-•])\s*/, '').trim()).filter(Boolean)
const shortText = (s, n) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t }
function fmtDateId(v) {
  if (!v) return '-'
  const d = typeof v === 'number' ? new Date(v) : new Date(`${v}T00:00:00`)
  if (Number.isNaN(d.getTime())) return String(v)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}
const resultOf = (a, code) => (a.results && a.results[code]) || {}

export function buildCcuReport(a) {
  const i = a.info || {}
  const comp = computeCcu(a)
  const byCode = Object.fromEntries(comp.sections.map((s) => [s.code, s]))

  const infoRows = [
    ['Nama SPBU', dash(i.namaSpbu), 'Tanggal Kunjungan', fmtDateId(i.tanggalKunjungan)],
    ['No SPBU', dash(i.nomorSpbu), 'Waktu Kunjungan', dash(i.waktuKunjungan)],
    ['Nama ABH', dash(i.namaAbh), 'Nama ABH Observer', dash(i.abhObserver)],
    ['Kota', dash(i.kota), 'Pengawas SPBU', dash(i.pengawas)],
  ]

  const itemRow = (it, skipped) => {
    const r = resultOf(a, it.code)
    return { kind: 'item', code: it.code, no: it.no, desc: it.desc.replace(/\s+/g, ' ').trim(), scale: it.scale, grade: skipped ? '-' : (r.grade || '-'), ket: it.ket || '', note: skipped ? '' : String(r.note || '').trim() }
  }
  const sections = CCU_SECTIONS.map((s) => {
    const sc = byCode[s.code]
    const skipped = ccuSkipped(a, s.code)
    const rows = []
    if (s.toggle) rows.push({ kind: 'toggle', desc: s.toggle.label, scale: 'A/F', grade: skipped ? 'A' : 'F', note: skipped ? (s.code === 'XIV' ? 'Tidak ada Bright Store/Cafe' : 'Tidak ada JBT') : '' })
    if (skipped) {
      rows.push({ kind: 'group', desc: `${s.code === 'XIV' ? 'SPBU tidak memiliki Bright Store/Cafe' : 'SPBU tidak melayani JBT'} — seluruh item aspek ini tidak dinilai, skor aspek = 100 (nilai "A")` })
      return { code: s.code, title: s.title, score: sc.score, bobot: s.bobot, skipped, rows }
    }
    const parts = s.parts || [{ code: null, groups: s.groups }]
    parts.forEach((p, k) => {
      if (p.code) rows.push({ kind: 'part', desc: `${p.code} ${p.title}`, score: sc.parts ? sc.parts[k].score : null })
      p.groups.forEach((g) => {
        if (g.code) rows.push({ kind: 'group', desc: `${g.code} ${g.title}` })
        g.items.forEach((it) => rows.push(itemRow(it, skipped)))
      })
    })
    return { code: s.code, title: s.title, score: sc.score, bobot: s.bobot, skipped, rows }
  })

  const rekap = comp.sections.map((s, k) => ({ no: k + 1, title: s.title.replace(/^PENGECEKAN\s+/, ''), jumlah: s.count, nilai: s.score, bobot: s.bobot, skor: s.weighted }))

  const autoTemuan = CCU_ITEMS.filter((it) => !ccuSkipped(a, it.secCode)).map((it) => {
    const r = resultOf(a, it.code)
    const finding = r.grade && r.grade !== 'A' && r.grade !== 'X'
    if (!finding) return null
    return `[${it.code}] ${shortText(it.desc, 110)} — nilai ${r.grade}${r.note ? `: ${String(r.note).trim()}` : ''}`
  }).filter(Boolean)
  const catatan = [...lines(i.catatanTemuan), ...autoTemuan]

  /* ---- Lampiran foto per aspek ---- */
  const photos = []
  const findings = []
  const evidence = []
  let nFind = 0
  let nEvid = 0
  let nGroupF = 0
  CCU_SECTIONS.forEach((s) => {
    if (ccuSkipped(a, s.code)) return
    const fG = []
    const eG = []
    CCU_ITEMS.filter((it) => it.secCode === s.code).forEach((it) => {
      const r = resultOf(a, it.code)
      const note = String(r.note || '').trim()
      const kind = r.grade && !['A', 'X'].includes(r.grade) ? 'temuan' : note ? 'catatan' : null
      const caption = shortText(it.desc, 60)
      const list = (r.photos || []).map((p) => ({ photo: p, caption }))
      list.forEach((x) => photos.push({ photo: x.photo, caption: `CCU ${it.code}` }))
      const g = { key: it.code, code: it.code, title: shortText(it.desc, 90), fullDesc: it.desc.replace(/\s+/g, ' ').trim(), kind, grade: r.grade || '', note, pinalti: false, photos: list }
      if (kind) { fG.push(g); nFind += list.length } else if (list.length) { eG.push(g); nEvid += list.length }
    })
    const title = s.title.replace(/^PENGECEKAN\s+/, '')
    if (fG.length) { findings.push({ code: s.code, title, prefix: 'Aspek', groups: fG }); nGroupF += fG.length }
    if (eG.length) evidence.push({ code: s.code, title, prefix: 'Aspek', groups: eG })
  })

  return {
    type: 'ccu',
    title: CCU_TITLE,
    unit: CCU_COMPANY,
    formCode: CCU_FORM_CODE,
    reportNo: a.reportNo || 'DRAFT',
    infoRows,
    ts: comp.ts,
    status: comp.status,
    comp,
    sections,
    rekap,
    catatan,
    rekomendasi: lines(i.rekomendasi),
    infoUmum: CCU_INFO_UMUM,
    approval: [['Pengawas SPBU', dash(i.pengawas)], ['ABH SPBU', dash(i.namaAbh)], ['ABH Observer', dash(i.abhObserver)]],
    photos,
    photoSections: { findings, evidence, counts: { findingGroups: nGroupF, findingPhotos: nFind, evidencePhotos: nEvid } },
    fileName: `CCU_SPBU_${String(i.nomorSpbu || 'SPBU').replace(/[^\w-]+/g, '_')}_${i.tanggalKunjungan || ''}.pdf`,
    fingerprint: JSON.stringify({ id: a.id, ts: Math.round(comp.ts * 100) / 100, g: CCU_ITEMS.map((it) => resultOf(a, it.code).grade || '-').join('') }),
  }
}
