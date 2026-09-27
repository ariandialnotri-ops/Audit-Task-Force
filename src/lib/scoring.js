/**
 * Mesin skoring & aturan otomatis Audit Pertamina Way.
 * Semua fungsi murni: menerima objek audit, tidak menyentuh DOM/storage.
 *
 * Rumus skoring inti (grade value, compliance, Total Score, ambang Good/Excellent,
 * item pinalti & item bertingkat) tidak berubah dari v1 — lihat CLAUDE.md.
 */
import { CHECKLIST_TREE, PINALTI_META } from '../data/checklist.js'
import { density15, normalizeDensity, round4, DENSITY_TOLERANCE } from './density.js'
import { parseAngka } from './format.js'

export const GRADE_VALUES = { A: 1, B: 0.8, C: 0.6, D: 0.4, E: 0.2, F: 0 }

export const ELEMENT_MIN = {
  good: { 1: 0.80, 2: 0.85, 3: 0.85, 4: 0.15, 5: 0.25 },
  excellent: { 1: 0.85, 2: 0.85, 3: 0.85, 4: 0.20, 5: 0.50 },
}
export const TS_MIN = { good: 0.75, excellent: 0.80 }

export const PRODUCTS = ['Pertalite', 'Pertamax', 'Pertamax Green', 'Pertamax Turbo', 'Bio Solar', 'Pertamina Dex', 'Dexlite']

/** Item checklist density (2.2.f–2.2.l) → produk yang diukur. */
export const DENSITY_ITEMS = {
  '2.2.f': 'Pertalite',
  '2.2.g': 'Pertamax',
  '2.2.h': 'Pertamax Green',
  '2.2.i': 'Pertamax Turbo',
  '2.2.j': 'Bio Solar',
  '2.2.k': 'Pertamina Dex',
  '2.2.l': 'Dexlite',
}

/** Item tera bejana ukur 20 liter per nozzle. */
export const TERA_ITEM = '2.2.m'
/** Batas kekurangan volume tera bejana 20 L (ml). Nilai di bawah -60 ml = gagal. */
export const TERA_LIMIT_ML = -60

/** Item izin prinsip NFR — auditor mengisi daftar tenant. */
export const TENANT_ITEM = '5.2.f'
export const TENANT_CATEGORIES = [
  { id: 'internasional', label: 'NFR Internasional' },
  { id: 'nasional', label: 'NFR Nasional' },
  { id: 'lokal', label: 'NFR Lokal' },
  { id: 'bright', label: 'Bright' },
  { id: 'ebt', label: 'EBT (PLTS / EV)' },
]

export const TIERED_ITEMS = ['4.3.f', '5.1.f', '5.2.g']

/* ------------------------------------------------------------------ */

/** Skala dari Excel sumber, mis. "A/C/F/X": N/A (X) hanya boleh bila skala memuat X. */
export function scaleAllowsNA(scale) {
  return String(scale || '').replace(/\s/g, '').split('/').includes('X')
}

/** Label skala rapi untuk ditampilkan, mis. "A–F · N/A". */
export function scaleLabel(it) {
  const g = it.allowed.length === 6 ? 'A–F' : it.allowed.join('/')
  return scaleAllowsNA(it.scale) ? `${g} · N/A` : g
}

export function allItems() {
  const out = []
  CHECKLIST_TREE.forEach((el) => {
    el.subs.forEach((sub) => {
      sub.items.forEach((it) => out.push({ ...it, allowNA: scaleAllowsNA(it.scale), elCode: el.code, elTitle: el.title, subCode: sub.code, subTitle: sub.title, ssCode: null, ssTitle: null }))
      sub.subsubs.forEach((ss) => {
        ss.items.forEach((it) => out.push({ ...it, allowNA: scaleAllowsNA(it.scale), elCode: el.code, elTitle: el.title, subCode: sub.code, subTitle: sub.title, ssCode: ss.code, ssTitle: ss.title }))
      })
    })
  })
  return out
}
export const ALL_ITEMS = allItems()
export const TOTAL_ITEM_COUNT = ALL_ITEMS.length
export const ITEM_BY_CODE = Object.fromEntries(ALL_ITEMS.map((it) => [it.code, it]))

export function emptyResult() {
  return { grade: null, note: '', photos: [], jumlah: null, submittedAt: null, changedAfterSubmit: false }
}

export function getResult(audit, code) {
  return audit.results[code] || emptyResult()
}

/* ------------------------------ Density ------------------------------ */

/**
 * Evaluasi item density: D15 sampel pengiriman terakhir vs D15 sampel saat audit.
 * Selisih harus dalam ±0,003.
 */
export function evalDensity(result, now = Date.now()) {
  const d = (result && result.density) || {}
  const refCalc = density15(d.refObs, d.refSuhu)
  const refD15 = refCalc ? refCalc.value : normalizeDensity(d.refD15Manual)
  const auditCalc = density15(d.obs, d.suhu)
  const auditD15 = auditCalc ? auditCalc.value : null
  const selisih = refD15 !== null && auditD15 !== null ? round4(auditD15 - refD15) : null
  const ok = selisih === null ? null : Math.abs(selisih) <= DENSITY_TOLERANCE + 1e-9
  let jamSetelahBongkar = null
  if (d.waktuBongkar) {
    const t = new Date(d.waktuBongkar).getTime()
    if (Number.isFinite(t)) jamSetelahBongkar = (now - t) / 3600000
  }
  return {
    refCalc, refD15, auditCalc, auditD15, selisih, ok,
    jamSetelahBongkar,
    terlaluCepat: jamSetelahBongkar !== null && jamSetelahBongkar >= 0 && jamSetelahBongkar < 2,
    autoGrade: ok === null ? null : ok ? 'A' : 'F',
  }
}

/* ------------------------------- Tera -------------------------------- */

export function nozzleList(audit) {
  return (audit.info && Array.isArray(audit.info.nozzles)) ? audit.info.nozzles : []
}

export function productsFromNozzles(audit) {
  return [...new Set(nozzleList(audit).map((n) => n.produk).filter(Boolean))]
}

/**
 * Evaluasi tera bejana ukur 20 L. Setiap nozzle yang diperiksa diisi selisih (ml).
 * Kekurangan melebihi -60 ml = gagal. Cakupan minimum per produk:
 * 100% nozzle (Excellent) atau 50% nozzle (Good).
 */
export function evalTera(audit) {
  const level = (audit.info && audit.info.kelasTarget) || 'good'
  const tera = (getResult(audit, TERA_ITEM).tera) || {}
  const nozzles = nozzleList(audit)
  const rows = nozzles.map((n) => {
    const ml = parseAngka(tera[n.id])
    return { ...n, ml, tested: ml !== null, ok: ml === null ? null : ml >= TERA_LIMIT_ML }
  })
  const byProduct = {}
  rows.forEach((r) => {
    const key = r.produk || '(produk belum diisi)'
    if (!byProduct[key]) byProduct[key] = { produk: key, total: 0, tested: 0, fail: 0 }
    byProduct[key].total++
    if (r.tested) byProduct[key].tested++
    if (r.ok === false) byProduct[key].fail++
  })
  Object.values(byProduct).forEach((p) => {
    p.required = level === 'excellent' ? p.total : Math.ceil(p.total / 2)
    p.coverageOk = p.tested >= p.required
  })
  const failRows = rows.filter((r) => r.ok === false)
  const coverageOk = rows.length > 0 && Object.values(byProduct).every((p) => p.coverageOk)
  let autoGrade = null
  if (failRows.length) autoGrade = 'F'
  else if (coverageOk) autoGrade = 'A'
  return { level, rows, byProduct: Object.values(byProduct), failRows, coverageOk, autoGrade, testedCount: rows.filter((r) => r.tested).length }
}

/* ------------------------------ Tenant ------------------------------- */

export function tenantList(audit) {
  const r = getResult(audit, TENANT_ITEM)
  return Array.isArray(r.tenants) ? r.tenants : []
}

/** Izin prinsip dianggap berlaku bila tanggal berlaku ≥ tanggal audit dan foto izin ada. */
export function evalTenants(audit) {
  const refDate = (audit.info && audit.info.tanggalAudit) || new Date().toISOString().slice(0, 10)
  const rows = tenantList(audit).map((t) => {
    const hasFotoTenant = (t.fotoTenant || []).length > 0
    const hasFotoIzin = (t.fotoIzin || []).length > 0
    const dateOk = !!t.berlakuSampai && t.berlakuSampai >= refDate
    const complete = !!(t.nama && t.kategori && t.berlakuSampai && hasFotoTenant && hasFotoIzin)
    return { ...t, hasFotoTenant, hasFotoIzin, dateOk, complete, valid: dateOk && hasFotoIzin }
  })
  const hasIntl = rows.some((r) => r.kategori === 'internasional' && r.valid)
  const hasNas = rows.some((r) => r.kategori === 'nasional' && r.valid)
  let autoGrade = null
  if (rows.length) autoGrade = rows.every((r) => r.valid) ? 'A' : 'F'
  return { refDate, rows, hasIntl, hasNas, excellentOk: hasIntl && hasNas, autoGrade }
}

/* ------------------------------ Scoring ------------------------------ */

export function computeGroupScore(audit, items) {
  let applicable = 0, achieved = 0, graded = 0
  items.forEach((it) => {
    const r = getResult(audit, it.code)
    if (r.grade && r.grade !== 'X') {
      applicable += it.weight
      achieved += it.weight * (GRADE_VALUES[r.grade] || 0)
      graded++
    } else if (r.grade === 'X') {
      graded++
    }
  })
  const pct = applicable > 0 ? achieved / applicable : 0
  return { applicable, achieved, pct, graded, total: items.length }
}

export function computeAudit(audit) {
  const elementResults = {}
  CHECKLIST_TREE.forEach((el) => {
    const items = ALL_ITEMS.filter((i) => i.elCode === el.code)
    elementResults[el.code] = { ...computeGroupScore(audit, items), weight: el.weight, title: el.title }
  })
  let ts = 0
  Object.values(elementResults).forEach((er) => { ts += er.pct * er.weight })

  const subResults = {}
  const subsubResults = {}
  CHECKLIST_TREE.forEach((el) => {
    el.subs.forEach((sub) => {
      subResults[sub.code] = { ...computeGroupScore(audit, ALL_ITEMS.filter((i) => i.subCode === sub.code)), weight: sub.weight, title: sub.title, elCode: el.code }
      sub.subsubs.forEach((ss) => {
        subsubResults[ss.code] = { ...computeGroupScore(audit, ALL_ITEMS.filter((i) => i.ssCode === ss.code)), weight: ss.weight, title: ss.title, subCode: sub.code }
      })
    })
  })

  const failedPinalti = []
  const pendingPinalti = []
  Object.keys(PINALTI_META).forEach((code) => {
    const r = getResult(audit, code)
    if (!r.grade) { pendingPinalti.push(code); return }
    if (r.grade === 'F') failedPinalti.push(code)
  })

  const tierFail = { good: [], excellent: [] }
  TIERED_ITEMS.forEach((code) => {
    const jumlah = getResult(audit, code).jumlah || 0
    if (jumlah < 1) tierFail.good.push(code)
    if (jumlah < 2) tierFail.excellent.push(code)
  })

  // Aturan tambahan: Excellent wajib punya ≥1 tenant internasional & ≥1 tenant nasional
  // dengan izin prinsip yang masih berlaku.
  const tenants = evalTenants(audit)

  function meetsLevel(level) {
    if (ts < TS_MIN[level] * 100) return false
    for (const elCode in ELEMENT_MIN[level]) {
      if (elementResults[elCode].pct < ELEMENT_MIN[level][elCode]) return false
    }
    if (failedPinalti.length > 0) return false
    if (tierFail[level].length > 0) return false
    if (level === 'excellent' && !tenants.excellentOk) return false
    return true
  }

  let classification = 'gagal'
  if (meetsLevel('excellent')) classification = 'excellent'
  else if (meetsLevel('good')) classification = 'good'

  const totalGraded = ALL_ITEMS.filter((i) => getResult(audit, i.code).grade).length
  const totalSubmitted = ALL_ITEMS.filter((i) => getResult(audit, i.code).submittedAt).length

  return {
    elementResults, subResults, subsubResults, ts, classification,
    failedPinalti, pendingPinalti, tierFail, tenants,
    totalGraded, totalSubmitted, totalItems: TOTAL_ITEM_COUNT,
  }
}

export function reasonsForFail(comp, level) {
  const reasons = []
  if (comp.ts < TS_MIN[level] * 100) reasons.push(`Total Score ${comp.ts.toFixed(2)} < minimum ${(TS_MIN[level] * 100).toFixed(0)}`)
  for (const elCode in ELEMENT_MIN[level]) {
    const er = comp.elementResults[elCode]
    if (er.pct < ELEMENT_MIN[level][elCode]) {
      reasons.push(`${er.title}: ${(er.pct * 100).toFixed(1)}% < minimum ${(ELEMENT_MIN[level][elCode] * 100).toFixed(0)}%`)
    }
  }
  if (comp.failedPinalti.length > 0) {
    reasons.push('Item Pinalti gagal: ' + comp.failedPinalti.map((c) => PINALTI_META[c].label).join(', '))
  }
  if (comp.tierFail[level].length > 0) {
    reasons.push('Belum memenuhi jumlah minimum: ' + comp.tierFail[level].map((c) => PINALTI_META[c].label).join(', '))
  }
  if (level === 'excellent' && !comp.tenants.excellentOk) {
    const missing = []
    if (!comp.tenants.hasIntl) missing.push('tenant internasional')
    if (!comp.tenants.hasNas) missing.push('tenant nasional')
    reasons.push(`Excellent wajib memiliki minimal 1 tenant internasional & 1 tenant nasional dengan izin prinsip berlaku — belum ada: ${missing.join(' & ')}`)
  }
  return reasons
}

/* ------------------------------ Search ------------------------------- */

function normalize(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function escRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
function wholeWord(hay, word) {
  return new RegExp(`(^|[^a-z0-9])${escRe(word)}($|[^a-z0-9])`).test(hay)
}
function wordPrefix(hay, word) {
  return new RegExp(`(^|[^a-z0-9])${escRe(word)}`).test(hay)
}

/** Sinonim istilah lapangan → kata yang dipakai di teks checklist. */
const SYNONYMS = {
  apar: ['apab', 'pemadam', 'pemadaman'],
  apab: ['apar', 'pemadam', 'pemadaman'],
  pemadam: ['apar', 'apab'],
  kebakaran: ['pemadam', 'apar', 'apab'],
  density: ['densitas', 'berat jenis'],
  densitas: ['density', 'berat jenis'],
  bj: ['berat jenis', 'densitas'],
  tera: ['bejana', 'takaran'],
  wc: ['toilet'],
  kamar: ['toilet'],
  mushola: ['musala', 'ibadah'],
  musholla: ['musala', 'ibadah'],
  masjid: ['musala', 'ibadah'],
  hp: ['telepon genggam'],
  tenant: ['nfr'],
  nfr: ['tenant'],
  genset: ['generator'],
  fastrack: ['fast track', 'red carpet'],
}

/**
 * Cari item checklist berdasarkan kata kunci (kode, deskripsi, nama elemen /
 * sub-elemen, label pinalti). Semua kata harus cocok (langsung atau lewat sinonim).
 */
export function searchItems(query) {
  const words = normalize(query).split(/\s+/).filter(Boolean)
  if (!words.length) return []
  return ALL_ITEMS.filter((it) => {
    const hay = normalize([it.code, it.desc, it.elTitle, it.subTitle, it.ssTitle, PINALTI_META[it.code] && PINALTI_META[it.code].label, DENSITY_ITEMS[it.code]].join(' '))
    // Istilah yang punya sinonim dicocokkan per kata utuh (agar "apab" tidak cocok ke
    // "apabila", "tera" tidak cocok ke "terakhir"); kata lain cukup cocok di awal kata.
    return words.every((w) => (SYNONYMS[w] ? [w, ...SYNONYMS[w]].some((x) => wholeWord(hay, x)) : wordPrefix(hay, w)))
  })
}
