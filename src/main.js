import './styles.css'
import { CHECKLIST_TREE, PINALTI_META } from './data/checklist.js'
import {
  ALL_ITEMS, TOTAL_ITEM_COUNT, ITEM_BY_CODE, ELEMENT_MIN, TS_MIN, PRODUCTS,
  DENSITY_ITEMS, TERA_ITEM, TERA_LIMIT_ML, TENANT_ITEM, TENANT_CATEGORIES,
  emptyResult, getResult, computeAudit, reasonsForFail, evalDensity, evalTera, evalTenants,
  productsFromNozzles, searchItems,
} from './lib/scoring.js'
import { DENSITY_TOLERANCE, METHOD_LABEL } from './lib/density.js'
import { formatDensity, formatSigned, formatNumber, parseAngka } from './lib/format.js'
import { loadAll, scheduleSave, flushSave, flushAll, deleteAudit } from './lib/storage.js'
import { requireGps, captureStampedPhoto, formatStampTime, formatCoord } from './lib/camera.js'
import { thumbSrc, fullUrl, storeNewPhoto, removePhotoFiles, migrateAuditPhotos, photoLists } from './lib/photos.js'

/* =========================================================
   STATE
   ========================================================= */
let AUDITS = {}
let currentAuditId = null
let currentView = 'home'
let currentElementOpen = null
let noteOpenSet = new Set()
let searchQuery = ''
let pinaltiFilter = null // null | 'all' | elCode

/* Cloud (Supabase) — modul dimuat dinamis setelah tampilan pertama. */
const cloud = {
  mod: null, enabled: false, session: null, role: null,
  status: 'idle', // idle | syncing | error | offline
  message: '', lastSync: null,
  remote: null, remoteLoading: false, remoteError: '',
  members: null, remoteFilter: '',
}

const contentEl = () => document.getElementById('content')

function uid(prefix = 'a') {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function defaultInfo() {
  return {
    nomorSpbu: '', region: '', kota: '', alamat: '', namaPemilik: 'PT. PERTAMINA RETAIL', areaBusinessHead: '',
    tipeKepemilikan: 'COCO', tahun: new Date().getFullYear().toString(), telepon: '',
    tanggalAudit: new Date().toISOString().slice(0, 10), tipeAudit: '', koordinator: '', kelasTarget: 'good',
    operatorTotal: '', operatorShift1: '', operatorShift2: '', operatorShift3: '',
    nozzles: [],
    umkTahunIni: '', umkTahunLalu: '', upahOperator: '', hariKerja: '', bpjs: '',
  }
}

/** Lengkapi audit lama (v1) dengan field baru. */
function normalizeAudit(a) {
  a.info = { ...defaultInfo(), ...(a.info || {}) }
  if (!a.info.areaBusinessHead && a.info.namaManager) a.info.areaBusinessHead = a.info.namaManager
  if (!Array.isArray(a.info.nozzles)) a.info.nozzles = []
  a.results = a.results || {}
  return a
}

function newAudit() {
  const id = uid()
  AUDITS[id] = { id, version: 2, createdAt: Date.now(), updatedAt: Date.now(), status: 'draft', info: defaultInfo(), results: {} }
  persist(id)
  return id
}

function getAudit(id) { return AUDITS[id] }
function curAudit() { return AUDITS[currentAuditId] }

function persist(id) {
  const a = AUDITS[id]
  if (!a) return
  a.updatedAt = Date.now()
  scheduleSave(a)
  flashSaved()
  scheduleSync()
}

function setResult(code, patch) {
  const a = curAudit()
  if (!a.results[code]) a.results[code] = emptyResult()
  const r = a.results[code]
  Object.assign(r, patch)
  if (r.submittedAt && !('submittedAt' in patch)) r.changedAfterSubmit = true
  persist(a.id)
  return r
}

/* =========================================================
   HELPERS
   ========================================================= */
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}
function fmtDate(ts) {
  return new Date(ts).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}
function complianceBand(pct) {
  if (pct > 0.95) return { label: 'Excellent', color: '#0066FF' }
  if (pct > 0.80) return { label: 'Good', color: '#10B981' }
  if (pct > 0.60) return { label: 'Average', color: '#00C2B8' }
  if (pct > 0.35) return { label: 'Poor', color: '#F59E0B' }
  return { label: 'Warning', color: '#EF4444' }
}
function classificationBadge(cls) {
  if (cls === 'excellent') return { text: 'PASTI PAS EXCELLENT!', bg: 'linear-gradient(135deg,#0066FF,#0050CB)' }
  if (cls === 'good') return { text: 'PASTI PAS GOOD!', bg: 'linear-gradient(135deg,#10B981,#006645)' }
  return { text: 'BELUM MEMENUHI PASTI PAS', bg: 'linear-gradient(135deg,#EF4444,#BA1A1A)' }
}
function clsLabel(cls) {
  return cls === 'excellent' ? 'Pasti Pas Excellent' : cls === 'good' ? 'Pasti Pas Good' : 'Belum Lulus'
}
function breadcrumb(it) {
  return [it.elTitle, `${it.subCode} ${it.subTitle}`, it.ssCode ? `${it.ssCode} ${it.ssTitle}` : null].filter(Boolean).join(' › ')
}
function attrSel(name, value) {
  return `[${name}="${String(value).replace(/"/g, '\\"')}"]`
}

function showToast(msg, ms = 2000) {
  const t = document.getElementById('toast')
  t.textContent = msg
  t.classList.add('show')
  clearTimeout(showToast._t)
  showToast._t = setTimeout(() => t.classList.remove('show'), ms)
}

function flashSaved() {
  const el = document.getElementById('saveState')
  if (!el) return
  el.textContent = 'Menyimpan…'
  clearTimeout(flashSaved._t)
  flashSaved._t = setTimeout(() => { el.textContent = '✓ Tersimpan otomatis' }, 600)
}

function showModal(html) {
  const root = document.getElementById('modalRoot')
  root.innerHTML = `<div class="modal-overlay" data-modal-overlay><div class="modal-sheet"><span class="modal-close"></span>${html}</div></div>`
}
function closeModal() {
  document.getElementById('modalRoot').innerHTML = ''
}

/* ============== ICONS ============== */
const iconHome = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9"/></svg>`
const iconHistory = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>`
const iconInfo = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 16v-5"/><path d="M12 8h.01"/></svg>`
const iconCamera = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8a2 2 0 0 1 2-2h1.2a1 1 0 0 0 .83-.45L9 4h6l.97 1.55a1 1 0 0 0 .83.45H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8z"/><circle cx="12" cy="13" r="3.2"/></svg>`
const iconSearch = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`
const iconCloud = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.1 9.2 4.5 4.5 0 0 0 7 18z"/></svg>`
const iconPin = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>`

/* =========================================================
   ROUTER / RENDER
   ========================================================= */
function go(view, params) {
  currentView = view
  if (params && params.auditId) currentAuditId = params.auditId
  render()
  window.scrollTo(0, 0)
}

function render() {
  renderTabbar()
  renderTopbar()
  const c = contentEl()
  if (currentView === 'home') c.innerHTML = viewHome()
  else if (currentView === 'history') c.innerHTML = viewHistory()
  else if (currentView === 'form') c.innerHTML = viewForm()
  else if (currentView === 'checklist') c.innerHTML = viewChecklist()
  else if (currentView === 'report') { c.innerHTML = viewReport(); hydrateFullPhotos() }
  else if (currentView === 'about') c.innerHTML = viewAbout()
  else if (currentView === 'cloud') c.innerHTML = viewCloud()
}

function renderTabbar() {
  const tabs = [
    { id: 'home', label: 'Beranda', icon: iconHome },
    { id: 'history', label: 'Riwayat', icon: iconHistory },
    { id: 'cloud', label: 'Cloud', icon: iconCloud },
    { id: 'about', label: 'Panduan', icon: iconInfo },
  ]
  document.getElementById('tabbar').innerHTML = tabs.map((t) => `
    <button class="tab ${(currentView === t.id || (t.id === 'home' && ['form', 'checklist', 'report'].includes(currentView))) ? 'active' : ''}" data-tab="${t.id}">
      ${t.icon}<span>${t.label}</span>
    </button>`).join('')
}

function renderTopbar() {
  const tb = document.getElementById('topbar')
  if (currentView === 'home') { tb.innerHTML = `<h1 style="text-align:left;flex:1;">Audit Pertamina Way</h1>`; return }
  if (currentView === 'history') { tb.innerHTML = `<h1 style="text-align:left;flex:1;">Riwayat Audit</h1>`; return }
  if (currentView === 'about') { tb.innerHTML = `<h1 style="text-align:left;flex:1;">Panduan</h1>`; return }
  if (currentView === 'cloud') { tb.innerHTML = `<h1 style="text-align:left;flex:1;">Cloud &amp; Rekap</h1>`; return }
  if (currentView === 'form') {
    tb.innerHTML = `<button class="back" data-back="home">&#8249; Kembali</button><h1>Data SPBU</h1><span style="width:70px"></span>`
    return
  }
  if (currentView === 'checklist') {
    const a = curAudit()
    tb.innerHTML = `<button class="back" data-back="form">&#8249;</button><h1>${esc(a.info.nomorSpbu || 'Checklist')}</h1><button class="action" data-action="goreport">Laporan</button>`
    return
  }
  if (currentView === 'report') {
    tb.innerHTML = `<button class="back" data-back="checklist">&#8249;</button><h1>Laporan Audit</h1><button class="action" data-action="pdf">Unduh</button>`
  }
}

/* =========================================================
   VIEW: HOME / HISTORY
   ========================================================= */
function auditRow(a) {
  const comp = computeAudit(a)
  const band = complianceBand(comp.ts / 100)
  return `<div class="card tap" data-open-audit="${a.id}">
    <div class="audit-item">
      <div class="audit-badge" style="background:${band.color}22;color:${band.color};">${comp.ts.toFixed(0)}</div>
      <div class="meta">
        <div class="title">${esc(a.info.nomorSpbu || 'SPBU Baru')} &middot; ${esc(a.info.kota || '-')}</div>
        <div class="sub">${fmtDate(a.updatedAt)}${a.info.tipeAudit ? ' &middot; ' + esc(a.info.tipeAudit) : ''} &middot; ${comp.totalSubmitted}/${comp.totalItems} submit</div>
      </div>
      <span class="pill ${a.status}">${a.status === 'draft' ? 'Draft' : 'Selesai'}</span>
      <span class="chev">&#8250;</span>
    </div>
  </div>`
}

function viewHome() {
  const list = Object.values(AUDITS).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 4)
  const draftHtml = list.length ? list.map(auditRow).join('')
    : `<div class="card" style="text-align:center;color:var(--muted);padding:24px;">Belum ada audit. Mulai audit baru untuk SPBU Anda.</div>`
  return `
  <div class="hero">
    <h1>Audit Pertamina Way</h1>
    <p>Checklist Pasti Pas &middot; foto GPS ber-timestamp &middot; skor real-time</p>
    <div class="cloud-line" data-tab="cloud">${cloudLineHtml()}</div>
  </div>
  <button class="btn-primary" data-action="newaudit" style="margin-bottom:18px;">+ Mulai Audit SPBU Baru</button>

  <div class="section-title">Audit Terakhir</div>
  ${draftHtml}
  ${list.length ? `<div style="text-align:center;margin-top:6px;"><button class="btn-ghost" data-tab="history">Lihat Semua Riwayat</button></div>` : ''}

  <div class="section-title">Ringkasan Standar</div>
  <div class="card">
    <div class="link-row"><span class="l">Total item checklist</span><span class="v">${TOTAL_ITEM_COUNT} item</span></div>
    <div class="link-row"><span class="l">Elemen penilaian</span><span class="v">5 elemen</span></div>
    <div class="link-row"><span class="l">Item Pinalti (wajib lulus)</span><span class="v">${Object.keys(PINALTI_META).length} item</span></div>
    <div class="link-row"><span class="l">Minimum Pasti Pas Good</span><span class="v">TS &ge; 75%</span></div>
    <div class="link-row"><span class="l">Minimum Pasti Pas Excellent</span><span class="v">TS &ge; 80%</span></div>
    <div class="link-row"><span class="l">Syarat tambahan Excellent</span><span class="v">1 tenant int'l + 1 nasional</span></div>
  </div>`
}

function viewHistory() {
  const list = Object.values(AUDITS).sort((a, b) => b.updatedAt - a.updatedAt)
  if (!list.length) return `<div class="empty-state"><div class="ico">&#128203;</div>Belum ada riwayat audit.</div>`
  return list.map(auditRow).join('')
}

/* =========================================================
   VIEW: FORM (data SPBU, operator, nozzle)
   ========================================================= */
function infoInput(key, label, opts = {}) {
  const i = curAudit().info
  return `<div class="field"><label>${label}</label><input data-info="${key}" value="${esc(i[key])}"${opts.type ? ` type="${opts.type}"` : ''}${opts.inputmode ? ` inputmode="${opts.inputmode}"` : ''}${opts.placeholder ? ` placeholder="${esc(opts.placeholder)}"` : ''}></div>`
}

function operatorHint(i) {
  const total = parseAngka(i.operatorTotal)
  const s = [i.operatorShift1, i.operatorShift2, i.operatorShift3].map(parseAngka)
  if (total === null || s.some((x) => x === null)) return 'Isi total operator dan jumlah operator tiap shift.'
  const sum = s.reduce((x, y) => x + y, 0)
  if (sum !== total) return `<span style="color:var(--status-poor)">Jumlah shift 1+2+3 = ${sum}, berbeda dengan total operator (${total}). Periksa kembali bila tidak ada operator rangkap shift.</span>`
  return `<span style="color:var(--status-good)">✓ Shift 1+2+3 = ${sum} sesuai total operator.</span>`
}

function viewForm() {
  const a = curAudit()
  const i = a.info
  const nozzles = i.nozzles
  const nozzleRows = nozzles.map((n, idx) => `
    <div class="nozzle-row">
      <span class="nozzle-idx">${idx + 1}</span>
      <div class="field"><label>Nomor Nozzle</label><input data-nozzle="${n.id}" data-nf="nomor" value="${esc(n.nomor)}" placeholder="cth. ${idx + 1}"></div>
      <div class="field"><label>Produk</label>
        <select data-nozzle="${n.id}" data-nf="produk">
          <option value="">— pilih —</option>
          ${PRODUCTS.map((p) => `<option ${n.produk === p ? 'selected' : ''}>${p}</option>`).join('')}
        </select>
      </div>
    </div>`).join('')

  const perProduct = PRODUCTS.map((p) => [p, nozzles.filter((n) => n.produk === p).length]).filter(([, c]) => c > 0)

  return `
  <div class="section-title">Informasi SPBU</div>
  <div class="card">
    ${infoInput('nomorSpbu', 'Nomor SPBU', { placeholder: 'cth. 5164116' })}
    <div class="field-row">${infoInput('region', 'Region')}${infoInput('kota', 'Kota')}</div>
    ${infoInput('alamat', 'Alamat')}
    <div class="field-row">
      <div class="field"><label>Tipe Kepemilikan</label>
        <select data-info="tipeKepemilikan">${['COCO', 'CODO', 'DODO'].map((t) => `<option ${i.tipeKepemilikan === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
      </div>
      ${infoInput('tahun', 'Tahun', { inputmode: 'numeric' })}
    </div>
    ${infoInput('areaBusinessHead', 'Area Business Head')}
    ${infoInput('telepon', 'Telepon', { type: 'tel' })}
  </div>

  <div class="section-title">Informasi Kegiatan Audit</div>
  <div class="card">
    <div class="field-row">
      ${infoInput('tanggalAudit', 'Tanggal Audit', { type: 'date' })}
      ${infoInput('tipeAudit', 'Tipe Audit', { placeholder: '(belum ditentukan)' })}
    </div>
    <div class="field"><label>Target Kelas SPBU</label>
      <select data-info="kelasTarget">
        <option value="good" ${i.kelasTarget === 'good' ? 'selected' : ''}>Pasti Pas Good</option>
        <option value="excellent" ${i.kelasTarget === 'excellent' ? 'selected' : ''}>Pasti Pas Excellent</option>
      </select>
    </div>
    ${infoInput('koordinator', 'Koordinator')}
  </div>

  <div class="section-title">Data Operator <span class="req">wajib</span></div>
  <div class="card">
    ${infoInput('operatorTotal', 'Total Operator', { type: 'number', inputmode: 'numeric' })}
    <div class="field-row">
      ${infoInput('operatorShift1', 'Shift 1', { type: 'number', inputmode: 'numeric' })}
      ${infoInput('operatorShift2', 'Shift 2', { type: 'number', inputmode: 'numeric' })}
      ${infoInput('operatorShift3', 'Shift 3', { type: 'number', inputmode: 'numeric' })}
    </div>
    <div class="hint" id="opHint">${operatorHint(i)}</div>
  </div>

  <div class="section-title">Data Nozzle <span class="req">wajib</span></div>
  <div class="card">
    <div class="field"><label>Jumlah Nozzle</label><input type="number" min="0" max="80" inputmode="numeric" data-action-change="nozzlecount" value="${nozzles.length || ''}" placeholder="cth. 8"></div>
    ${nozzleRows}
    ${perProduct.length ? `<div class="hint">${perProduct.map(([p, c]) => `${esc(p)}: <b>${c}</b>`).join(' &middot; ')}</div>` : ''}
    <div class="hint">Data nozzle dipakai langsung untuk penilaian tera bejana ukur 20 liter (item 2.2.m, batas −60 ml) dan untuk cek produk density.</div>
  </div>

  <div class="section-title">Data Ketenagakerjaan (opsional)</div>
  <div class="card">
    <div class="field-row">${infoInput('umkTahunIni', 'UMK Tahun Ini (Rp)', { inputmode: 'numeric' })}${infoInput('umkTahunLalu', 'UMK Tahun Lalu (Rp)', { inputmode: 'numeric' })}</div>
    <div class="field-row">${infoInput('upahOperator', 'Upah Operator (Rp)', { inputmode: 'numeric' })}${infoInput('hariKerja', 'Hari Kerja/bulan', { inputmode: 'numeric' })}</div>
    ${infoInput('bpjs', 'Bukti bayar/kepesertaan BPJS', { placeholder: 'Tersedia / Tidak tersedia' })}
  </div>

  <button class="btn-primary" data-action="tochecklist">Lanjut ke Checklist &#8250;</button>
  <div class="hint" style="text-align:center;margin-top:8px;">${iconPin.replace('<svg', '<svg width="13" height="13" style="vertical-align:-2px"')} Checklist membutuhkan izin lokasi (GPS) aktif di HP.</div>
  <div style="height:10px"></div>
  <button class="btn-danger" data-action="deleteaudit" style="width:100%;">Hapus Audit Ini</button>`
}

function formErrors(a) {
  const i = a.info
  const errs = []
  const nums = [['operatorTotal', 'Total operator'], ['operatorShift1', 'Operator shift 1'], ['operatorShift2', 'Operator shift 2'], ['operatorShift3', 'Operator shift 3']]
  nums.forEach(([k, l]) => {
    const v = parseAngka(i[k])
    if (v === null || v < 0) errs.push(`${l} belum diisi`)
  })
  if (!i.nozzles.length) errs.push('Jumlah nozzle belum diisi')
  i.nozzles.forEach((n, idx) => {
    if (!String(n.nomor || '').trim()) errs.push(`Nomor nozzle baris ${idx + 1} belum diisi`)
    if (!n.produk) errs.push(`Produk nozzle baris ${idx + 1} belum dipilih`)
  })
  const nomor = i.nozzles.map((n) => String(n.nomor || '').trim()).filter(Boolean)
  if (new Set(nomor).size !== nomor.length) errs.push('Ada nomor nozzle yang sama (duplikat)')
  return errs
}

function resizeNozzles(count) {
  const a = curAudit()
  const n = Math.max(0, Math.min(80, count | 0))
  const list = a.info.nozzles
  while (list.length < n) list.push({ id: uid('n'), nomor: String(list.length + 1), produk: '' })
  if (list.length > n) {
    const removed = list.splice(n)
    const tera = getResult(a, TERA_ITEM).tera
    if (tera) removed.forEach((r) => { delete tera[r.id] })
  }
  persist(a.id)
  render()
}

/* =========================================================
   GPS gate
   ========================================================= */
function gpsHelpHtml(err) {
  return `
    <h3>${iconPin.replace('<svg', '<svg width="20" height="20" style="vertical-align:-4px;color:var(--primary)"')} Aktifkan Lokasi (GPS)</h3>
    <p class="modal-p">${esc(err && err.message ? err.message : 'Aplikasi membutuhkan lokasi GPS.')}</p>
    <p class="modal-p">Audit hanya bisa dilanjutkan bila GPS aktif, karena setiap foto bukti dicap tanggal, jam dan koordinat lokasi.</p>
    <ol class="modal-list">
      <li>Nyalakan <b>Lokasi / GPS</b> di pengaturan cepat HP.</li>
      <li>Di browser, ketuk ikon gembok/pengaturan situs di address bar &rarr; <b>Izin</b> &rarr; <b>Lokasi</b> &rarr; <b>Izinkan</b>. Lakukan juga untuk <b>Kamera</b>.</li>
      <li>Ketuk <b>Coba Lagi</b>.</li>
    </ol>
    <button class="btn-primary" data-action="gpsretry">Coba Lagi</button>
    <div style="height:8px"></div>
    <button class="btn-secondary" data-close>Tutup</button>`
}

async function enterChecklist() {
  const a = curAudit()
  const errs = formErrors(a)
  if (errs.length) {
    showModal(`<h3>Lengkapi Data Dulu</h3><p class="modal-p">Data berikut wajib diisi sebelum checklist:</p><ul class="modal-list">${errs.map((e) => `<li>${esc(e)}</li>`).join('')}</ul><button class="btn-primary" data-close>Oke</button>`)
    return
  }
  showToast('Memeriksa lokasi GPS…', 4000)
  try {
    const pos = await requireGps()
    if (!a.lokasiAudit) a.lokasiAudit = pos
    a.lokasiTerakhir = pos
    persist(a.id)
    closeModal()
    const first = !a.pinaltiPromptShown
    go('checklist', { auditId: a.id })
    showToast(`Lokasi aktif · ${formatCoord(pos)}`)
    if (first) {
      a.pinaltiPromptShown = true
      persist(a.id)
      showModal(`
        <h3>Cek Item Pinalti Dahulu?</h3>
        <p class="modal-p">Ada <b>${Object.keys(PINALTI_META).length} item pinalti</b> yang wajib lulus (tidak boleh F). Bila salah satu F, SPBU otomatis tidak lulus Pasti Pas.</p>
        <button class="btn-primary" data-pinfilter="all" data-close>Ya, Cek Item Pinalti Dahulu</button>
        <div style="height:8px"></div>
        <button class="btn-secondary" data-close>Tidak, Langsung Checklist Lengkap</button>`)
    }
  } catch (err) {
    showModal(gpsHelpHtml(err))
  }
}

/* =========================================================
   VIEW: CHECKLIST
   ========================================================= */
function statusChip(r) {
  if (r.submittedAt && r.changedAfterSubmit) return `<span class="st-chip warn">Ada perubahan · submit ulang</span>`
  if (r.submittedAt) return `<span class="st-chip ok">✓ Tersubmit ${fmtTime(r.submittedAt)}</span>`
  if (r.grade) return `<span class="st-chip draft">Draft</span>`
  return ''
}

function gradeRowHtml(it, r) {
  return it.allowed.map((g) => `<button class="grade-btn g-${g} ${r.grade === g ? 'sel-' + g : ''}" data-grade="${g}" data-code="${it.code}">${g}</button>`).join('')
    + `<button class="grade-btn g-X ${r.grade === 'X' ? 'sel-X' : ''}" data-grade="X" data-code="${it.code}">N/A</button>`
}

function autoGradeInfo(a, code) {
  const r = getResult(a, code)
  if (DENSITY_ITEMS[code]) {
    const e = evalDensity(r)
    if (e.autoGrade) return { grade: e.autoGrade, why: `selisih ${formatSigned(e.selisih)} ${e.ok ? 'dalam' : 'melebihi'} toleransi ±${String(DENSITY_TOLERANCE).replace('.', ',')}` }
  } else if (code === TERA_ITEM) {
    const e = evalTera(a)
    if (e.autoGrade === 'F') return { grade: 'F', why: `${e.failRows.length} nozzle melebihi batas ${TERA_LIMIT_ML} ml` }
    if (e.autoGrade === 'A') return { grade: 'A', why: 'semua nozzle diperiksa dalam batas & cakupan terpenuhi' }
  } else if (code === TENANT_ITEM) {
    const e = evalTenants(a)
    if (e.autoGrade === 'A') return { grade: 'A', why: 'semua tenant punya izin prinsip berlaku' }
    if (e.autoGrade === 'F') return { grade: 'F', why: 'ada tenant tanpa izin prinsip berlaku / foto izin' }
  }
  return null
}

function autoHintHtml(a, code) {
  const info = autoGradeInfo(a, code)
  if (!info) return ''
  const r = getResult(a, code)
  const differs = r.grade && r.grade !== 'X' && r.grade !== info.grade
  return `<div class="auto-hint ${differs ? 'warn' : ''}">Nilai otomatis sistem: <b>${info.grade}</b> — ${esc(info.why)}${differs ? ` · <b>nilai dipilih (${r.grade}) berbeda</b>` : ''}</div>`
}

/* ----- Density block ----- */
function densityField(code, key, label, d, opts = {}) {
  return `<div class="field"><label>${label}</label><input data-dens="${code}" data-df="${key}" value="${esc(d[key])}" ${opts.type ? `type="${opts.type}"` : 'inputmode="decimal"'} placeholder="${esc(opts.placeholder || '')}"></div>`
}

function densityOutHtml(a, code) {
  const r = getResult(a, code)
  const e = evalDensity(r)
  const rows = [
    ['D15 pengiriman terakhir', e.refD15 !== null ? `${formatDensity(e.refD15)}${e.refCalc ? ` <small>(${METHOD_LABEL[e.refCalc.method]})</small>` : ' <small>(dokumen)</small>'}` : '—'],
    ['D15 sampel audit', e.auditD15 !== null ? `${formatDensity(e.auditD15)} <small>(${METHOD_LABEL[e.auditCalc.method]})</small>` : '—'],
    ['Selisih', formatSigned(e.selisih)],
  ]
  let status = `<span class="res-pill idle">Isi density &amp; suhu (cth. 0,7450 atau 745)</span>`
  if (e.ok === true) status = `<span class="res-pill ok">✓ Dalam toleransi ±0,003</span>`
  if (e.ok === false) status = `<span class="res-pill bad">✕ Melebihi toleransi ±0,003</span>`
  return `${rows.map(([l, v]) => `<div class="out-row"><span>${l}</span><b>${v}</b></div>`).join('')}
    <div style="margin-top:6px">${status}</div>
    ${e.terlaluCepat ? `<div class="res-pill warn" style="margin-top:6px">Sampel diambil &lt; 2 jam setelah bongkar (${e.jamSetelahBongkar.toFixed(1)} jam)</div>` : ''}`
}

function densityBlock(a, it) {
  const r = getResult(a, it.code)
  const d = r.density || {}
  const produk = DENSITY_ITEMS[it.code]
  const sold = productsFromNozzles(a)
  const notSold = sold.length && !sold.includes(produk)
  return `<div class="calc">
    <div class="calc-head">Density @15°C · ${esc(produk)} <span class="mini-pill">±0,003</span></div>
    ${notSold ? `<div class="res-pill warn" style="margin-bottom:8px">${esc(produk)} tidak ada di data nozzle — pilih N/A bila produk tidak dijual.</div>` : ''}
    <div class="calc-sec">1 · Sampel pengiriman terakhir</div>
    <div class="field-row">
      ${densityField(it.code, 'refObs', 'Density obs', d, { placeholder: '0,7450' })}
      ${densityField(it.code, 'refSuhu', 'Suhu °C', d, { placeholder: '30,5' })}
    </div>
    <div class="field-row">
      ${densityField(it.code, 'refD15Manual', 'atau D15 dokumen', d, { placeholder: 'opsional' })}
      ${densityField(it.code, 'waktuBongkar', 'Waktu bongkar', d, { type: 'datetime-local' })}
    </div>
    <div class="calc-sec">2 · Sampel saat audit</div>
    <div class="field-row">
      ${densityField(it.code, 'obs', 'Density obs', d, { placeholder: '0,7440' })}
      ${densityField(it.code, 'suhu', 'Suhu °C', d, { placeholder: '31,0' })}
    </div>
    <div class="calc-out" data-calcout="${it.code}">${densityOutHtml(a, it.code)}</div>
  </div>`
}

/* ----- Tera block ----- */
function teraStatusHtml(row) {
  if (row.ok === null) return `<span class="res-pill idle sm">—</span>`
  return row.ok ? `<span class="res-pill ok sm">OK</span>` : `<span class="res-pill bad sm">&lt; ${TERA_LIMIT_ML}</span>`
}

function teraOutHtml(a) {
  const e = evalTera(a)
  if (!e.rows.length) return ''
  return `<div class="calc-sec" style="margin-top:4px">Cakupan per produk (target ${e.level === 'excellent' ? '100%' : '50%'})</div>
    ${e.byProduct.map((p) => `<div class="out-row"><span>${esc(p.produk)}</span><b>${p.tested}/${p.total} diperiksa · min ${p.required} ${p.coverageOk ? '<span style="color:var(--status-good)">✓</span>' : '<span style="color:var(--status-poor)">kurang</span>'}${p.fail ? ` · <span style="color:var(--status-warning)">${p.fail} gagal</span>` : ''}</b></div>`).join('')}`
}

function teraBlock(a) {
  const e = evalTera(a)
  const tera = getResult(a, TERA_ITEM).tera || {}
  return `<div class="calc">
    <div class="calc-head">Tera Bejana Ukur 20 L per Nozzle <span class="mini-pill">batas ${TERA_LIMIT_ML} ml</span></div>
    <div class="hint">Isi selisih volume (ml) nozzle yang diperiksa: negatif = kurang, positif = lebih. Kurang dari ${TERA_LIMIT_ML} ml = gagal. Kosongkan nozzle yang tidak diperiksa.</div>
    ${!e.rows.length ? `<div class="res-pill warn" style="margin:8px 0">Data nozzle belum diisi.</div><button class="btn-ghost" data-back="form">Isi Data Nozzle</button>` : `
    <table class="tera-table">
      <tr><th>Nozzle</th><th>Produk</th><th>Selisih (ml)</th><th></th></tr>
      ${e.rows.map((row) => `<tr>
        <td class="mono">${esc(row.nomor)}</td>
        <td>${esc(row.produk)}</td>
        <td><input data-tera="${row.id}" inputmode="numeric" value="${esc(tera[row.id])}" placeholder="—"></td>
        <td data-terastatus="${row.id}">${teraStatusHtml(row)}</td>
      </tr>`).join('')}
    </table>`}
    <div class="calc-out" data-calcout="${TERA_ITEM}">${teraOutHtml(a)}</div>
  </div>`
}

/* ----- Tenant block ----- */
function tenantOutHtml(a) {
  const e = evalTenants(a)
  const lines = e.rows.map((t) => {
    const issues = []
    if (!t.nama) issues.push('nama')
    if (!t.kategori) issues.push('kategori')
    if (!t.hasFotoTenant) issues.push('foto tenant')
    if (!t.hasFotoIzin) issues.push('foto izin')
    if (!t.berlakuSampai) issues.push('tanggal berlaku')
    else if (!t.dateOk) issues.push('izin kedaluwarsa')
    return `<div class="out-row"><span>${esc(t.nama || '(tanpa nama)')}</span><b>${issues.length ? `<span style="color:var(--status-warning)">kurang: ${issues.join(', ')}</span>` : '<span style="color:var(--status-good)">✓ lengkap &amp; berlaku</span>'}</b></div>`
  }).join('')
  return `${lines}
    <div class="calc-sec" style="margin-top:6px">Syarat Pasti Pas Excellent</div>
    <div class="out-row"><span>Tenant internasional berizin berlaku</span><b>${e.hasIntl ? '<span style="color:var(--status-good)">✓ ada</span>' : '<span style="color:var(--status-warning)">belum ada</span>'}</b></div>
    <div class="out-row"><span>Tenant nasional berizin berlaku</span><b>${e.hasNas ? '<span style="color:var(--status-good)">✓ ada</span>' : '<span style="color:var(--status-warning)">belum ada</span>'}</b></div>`
}

function thumbsHtml(photos, rmAttr) {
  if (!photos || !photos.length) return ''
  return `<div class="photo-strip">${photos.map((p, idx) => `
    <div class="photo-thumb"><img src="${thumbSrc(p)}" alt="" loading="lazy"><button class="rm" ${rmAttr}="${idx}">&times;</button></div>`).join('')}</div>`
}

function tenantBlock(a) {
  const tenants = getResult(a, TENANT_ITEM).tenants || []
  return `<div class="calc">
    <div class="calc-head">Daftar Tenant NFR &amp; Izin Prinsip</div>
    <div class="hint">Isi tiap tenant: nama, kategori, foto tenant, dan foto izin prinsip yang masih berlaku. Excellent wajib punya minimal 1 tenant internasional &amp; 1 tenant nasional berizin berlaku.</div>
    ${tenants.map((t, idx) => `
      <div class="tenant-card">
        <div class="tenant-head"><b>Tenant ${idx + 1}</b><button class="link-danger" data-rmtenant="${t.id}">Hapus</button></div>
        <div class="field-row">
          <div class="field"><label>Nama Tenant</label><input data-tenant="${t.id}" data-tf="nama" value="${esc(t.nama)}" placeholder="cth. Starbucks"></div>
          <div class="field"><label>Kategori</label>
            <select data-tenant="${t.id}" data-tf="kategori">
              <option value="">— pilih —</option>
              ${TENANT_CATEGORIES.map((c) => `<option value="${c.id}" ${t.kategori === c.id ? 'selected' : ''}>${c.label}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="field-row">
          <div class="field"><label>No. Izin Prinsip</label><input data-tenant="${t.id}" data-tf="nomorIzin" value="${esc(t.nomorIzin)}"></div>
          <div class="field"><label>Berlaku s/d</label><input type="date" data-tenant="${t.id}" data-tf="berlakuSampai" value="${esc(t.berlakuSampai)}"></div>
        </div>
        <div class="tenant-photos">
          <div>
            <button class="photo-btn" data-tphoto="${t.id}|fotoTenant">${iconCamera} Foto Tenant (${(t.fotoTenant || []).length})</button>
            ${thumbsHtml(t.fotoTenant, `data-rmtphoto="${t.id}|fotoTenant" data-idx`)}
          </div>
          <div>
            <button class="photo-btn" data-tphoto="${t.id}|fotoIzin">${iconCamera} Foto Izin Prinsip (${(t.fotoIzin || []).length})</button>
            ${thumbsHtml(t.fotoIzin, `data-rmtphoto="${t.id}|fotoIzin" data-idx`)}
          </div>
        </div>
      </div>`).join('')}
    <button class="btn-ghost" data-addtenant style="width:100%;margin-top:4px;">+ Tambah Tenant</button>
    <div class="calc-out" data-calcout="${TENANT_ITEM}">${tenantOutHtml(a)}</div>
  </div>`
}

function specialBlock(a, it) {
  if (DENSITY_ITEMS[it.code]) return densityBlock(a, it)
  if (it.code === TERA_ITEM) return teraBlock(a)
  if (it.code === TENANT_ITEM) return tenantBlock(a)
  return ''
}

function itemCardHtml(a, it, opts = {}) {
  const r = getResult(a, it.code)
  const meta = PINALTI_META[it.code]
  const tiered = meta && meta.tiered
  const submitted = r.submittedAt && !r.changedAfterSubmit
  return `
  <div class="item-card ${it.pinalti ? 'pinalti' : ''} ${submitted ? 'submitted' : ''}" id="item-${it.code.replace(/\./g, '_')}" data-item="${it.code}">
    ${opts.breadcrumb ? `<div class="crumb">${esc(breadcrumb(it))}</div>` : ''}
    <div class="item-head">
      <div class="code">${it.code}${it.pinalti ? '<span class="badge-pinalti">PINALTI</span>' : ''}</div>
      <span data-status="${it.code}">${statusChip(r)}</span>
    </div>
    <div class="desc">${esc(it.desc)}</div>
    ${specialBlock(a, it)}
    <div class="grade-row" data-graderow="${it.code}">${gradeRowHtml(it, r)}</div>
    <div data-autohint="${it.code}">${autoHintHtml(a, it.code)}</div>
    ${tiered ? `<div class="jumlah-row">
      <label>Jumlah ${meta.unit} tersedia</label>
      <input type="number" min="0" max="9" inputmode="numeric" value="${r.jumlah || ''}" data-jumlah="${it.code}">
    </div>` : ''}
    <div class="item-toolrow">
      <button class="photo-btn" data-photo="${it.code}">${iconCamera} Foto (${(r.photos || []).length})</button>
      <button class="note-toggle" data-notetoggle="${it.code}">${noteOpenSet.has(it.code) || r.note ? 'Sembunyikan catatan' : '+ Catatan'}</button>
      <button class="submit-btn" data-submit="${it.code}">Submit</button>
    </div>
    ${(noteOpenSet.has(it.code) || r.note) ? `<div class="item-note field"><textarea placeholder="Catatan temuan auditor..." data-note="${it.code}">${esc(r.note)}</textarea></div>` : ''}
    ${thumbsHtml(r.photos, `data-rmphoto="${it.code}" data-idx`)}
  </div>`
}

/** Perbarui bagian dinamis kartu item tanpa render ulang penuh (agar fokus input tidak hilang). */
function patchItem(code) {
  const a = curAudit()
  const r = getResult(a, code)
  const it = ITEM_BY_CODE[code]
  document.querySelectorAll(attrSel('data-graderow', code)).forEach((el) => { el.innerHTML = gradeRowHtml(it, r) })
  document.querySelectorAll(attrSel('data-status', code)).forEach((el) => { el.innerHTML = statusChip(r) })
  document.querySelectorAll(attrSel('data-autohint', code)).forEach((el) => { el.innerHTML = autoHintHtml(a, code) })
  document.querySelectorAll(attrSel('data-item', code)).forEach((el) => {
    el.classList.toggle('submitted', !!(r.submittedAt && !r.changedAfterSubmit))
  })
  document.querySelectorAll(attrSel('data-calcout', code)).forEach((el) => {
    if (DENSITY_ITEMS[code]) el.innerHTML = densityOutHtml(a, code)
    else if (code === TERA_ITEM) el.innerHTML = teraOutHtml(a)
    else if (code === TENANT_ITEM) el.innerHTML = tenantOutHtml(a)
  })
  if (code === TERA_ITEM) {
    evalTera(a).rows.forEach((row) => {
      document.querySelectorAll(attrSel('data-terastatus', row.id)).forEach((el) => { el.innerHTML = teraStatusHtml(row) })
    })
  }
  patchProgress()
}

function patchProgress() {
  const el = document.getElementById('progressBox')
  if (el) el.innerHTML = progressHtml()
  const pd = document.getElementById('pinDash')
  if (pd) pd.innerHTML = pinaltiDashHtml()
}

/** Terapkan nilai otomatis (density / tera / tenant) bila hasil perhitungan tersedia. */
function applyAutoGrade(code) {
  const a = curAudit()
  const info = autoGradeInfo(a, code)
  if (info && getResult(a, code).grade !== info.grade) setResult(code, { grade: info.grade })
}

function progressHtml() {
  const a = curAudit()
  const comp = computeAudit(a)
  const pct = comp.totalItems ? (comp.totalSubmitted / comp.totalItems * 100) : 0
  return `
    <div class="row"><span>Item tersubmit <span id="saveState" class="save-state">✓ Tersimpan otomatis</span></span><b>${comp.totalSubmitted}/${comp.totalItems} (${pct.toFixed(0)}%)</b></div>
    <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
    <div class="row" style="margin-top:6px;margin-bottom:0;"><span>Dinilai ${comp.totalGraded} &middot; Estimasi TS</span><b>${comp.ts.toFixed(2)} &middot; ${clsLabel(comp.classification)}</b></div>`
}

function pinaltiStats(a, codes) {
  let graded = 0, fail = 0, submitted = 0
  codes.forEach((c) => {
    const r = getResult(a, c)
    if (r.grade) graded++
    if (r.grade === 'F') fail++
    if (r.submittedAt) submitted++
  })
  return { total: codes.length, graded, fail, submitted }
}

function pinaltiCodes(elCode) {
  return ALL_ITEMS.filter((it) => it.pinalti && (!elCode || elCode === 'all' || it.elCode === elCode)).map((it) => it.code)
}

const EL_SHORT = { 1: '3S', 2: 'Q&Q', 3: 'RFS', 4: 'VFC', 5: 'EPO' }

function pinaltiDashHtml() {
  const a = curAudit()
  const cards = [{ key: 'all', title: 'Semua Pinalti', sub: 'Seluruh kategori' }]
    .concat(CHECKLIST_TREE.filter((el) => pinaltiCodes(el.code).length).map((el) => ({ key: el.code, title: EL_SHORT[el.code] || el.code, sub: el.title })))
  return cards.map((c) => {
    const s = pinaltiStats(a, pinaltiCodes(c.key))
    const tone = s.fail ? 'bad' : s.graded === s.total ? 'ok' : ''
    return `<button class="pin-card ${tone} ${c.key === 'all' ? 'wide' : ''}" data-pinfilter="${c.key}">
      <div class="pin-title">${esc(c.title)}</div>
      <div class="pin-sub">${esc(c.sub)}</div>
      <div class="pin-num"><b>${s.graded}/${s.total}</b> dinilai${s.fail ? ` · <span class="pin-fail">${s.fail} F</span>` : ''}</div>
    </button>`
  }).join('')
}

function pinaltiViewHtml(a) {
  const codes = pinaltiCodes(pinaltiFilter)
  const title = pinaltiFilter === 'all' ? 'Semua Item Pinalti' : `Item Pinalti · ${CHECKLIST_TREE.find((e) => e.code === pinaltiFilter)?.title || ''}`
  const groups = CHECKLIST_TREE.map((el) => {
    const items = codes.map((c) => ITEM_BY_CODE[c]).filter((it) => it.elCode === el.code)
    if (!items.length) return ''
    return `<div class="section-title">${el.code}. ${esc(el.title)}</div>${items.map((it) => itemCardHtml(a, it, { breadcrumb: true })).join('')}`
  }).join('')
  return `
    <div class="card pin-banner">
      <button class="btn-ghost" data-pinfilter="">&#8249; Checklist Lengkap</button>
      <div class="pin-banner-t">${esc(title)}</div>
      <div class="hint">${codes.length} item &middot; item pinalti bernilai F membuat SPBU otomatis tidak lulus.</div>
    </div>
    ${groups}`
}

function searchResultsHtml(a) {
  const results = searchItems(searchQuery)
  if (!results.length) return `<div class="empty-state" style="padding:30px 10px;">Tidak ada item yang cocok dengan “${esc(searchQuery)}”.</div>`
  const cats = [...new Set(results.map((r) => r.elTitle))]
  return `<div class="hint" style="margin:0 4px 10px;">${results.length} item ditemukan di ${cats.length} kategori untuk “<b>${esc(searchQuery)}</b>”.</div>
    ${results.map((it) => `<div class="search-hit">${itemCardHtml(a, it, { breadcrumb: true })}<button class="jump-link" data-jump="${it.code}">Buka di checklist &#8250;</button></div>`).join('')}`
}

function elementsHtml(a) {
  const comp = computeAudit(a)
  return CHECKLIST_TREE.map((el) => {
    const er = comp.elementResults[el.code]
    const band = er.applicable > 0 ? complianceBand(er.pct) : { label: 'Belum dinilai', color: '#727687' }
    const isOpen = currentElementOpen === el.code
    let body = ''
    if (isOpen) {
      body = el.subs.map((sub) => {
        let inner = ''
        if (sub.items.length) {
          inner += `<div class="subgroup-title">${sub.code} ${esc(sub.title)} <span style="color:var(--muted);font-weight:400;">(bobot ${sub.weight})</span></div>`
          inner += sub.items.map((it) => itemCardHtml(a, ITEM_BY_CODE[it.code])).join('')
        }
        sub.subsubs.forEach((ss) => {
          inner += `<div class="subgroup-title">${ss.code} ${esc(ss.title)} <span style="color:var(--muted);font-weight:400;">(bobot ${ss.weight})</span></div>`
          inner += ss.items.map((it) => itemCardHtml(a, ITEM_BY_CODE[it.code])).join('')
        })
        return inner
      }).join('')
    }
    const submitted = ALL_ITEMS.filter((i) => i.elCode === el.code && getResult(a, i.code).submittedAt).length
    return `<div class="card" style="padding:0;overflow:hidden;" id="el-${el.code}">
      <div class="elem-header" data-toggle-el="${el.code}">
        <div class="idx">${el.code}</div>
        <div class="info">
          <div class="t">${esc(el.title)}</div>
          <div class="s">${er.graded}/${er.total} dinilai &middot; ${submitted} submit &middot; bobot ${el.weight}</div>
        </div>
        <span class="compliance-chip" style="background:${band.color}22;color:${band.color};">${er.applicable > 0 ? (er.pct * 100).toFixed(0) + '%' : '-'}</span>
        <span class="chev" style="margin-left:4px;">${isOpen ? '&#9662;' : '&#8250;'}</span>
      </div>
      ${isOpen ? `<div class="elem-body">${body}</div>` : ''}
    </div>`
  }).join('')
}

function checkBodyHtml() {
  const a = curAudit()
  if (searchQuery.trim()) return searchResultsHtml(a)
  if (pinaltiFilter) return pinaltiViewHtml(a)
  return `
    <div class="section-title">Dashboard Item Pinalti</div>
    <div class="pin-grid" id="pinDash">${pinaltiDashHtml()}</div>
    <div class="hint" style="margin:-2px 4px 14px;">Ketuk kartu untuk memeriksa item pinalti per kategori lebih dahulu, atau lanjutkan ke checklist lengkap di bawah.</div>
    <div class="section-title">Checklist Lengkap</div>
    ${elementsHtml(a)}`
}

function viewChecklist() {
  return `
  <div class="search-bar">
    ${iconSearch}
    <input id="searchInput" type="search" autocomplete="off" placeholder="Cari item… cth. APAR, toilet, density" value="${esc(searchQuery)}">
    ${searchQuery ? `<button class="search-clear" data-action="clearsearch" aria-label="Hapus pencarian">&times;</button>` : ''}
  </div>
  <div id="checkBody">${checkBodyHtml()}</div>
  <div class="sticky-progress" id="progressBox">${progressHtml()}</div>`
}

function refreshCheckBody() {
  const body = document.getElementById('checkBody')
  if (body) body.innerHTML = checkBodyHtml()
  patchProgress()
  const clearBtn = document.querySelector('[data-action="clearsearch"]')
  const bar = document.querySelector('.search-bar')
  if (bar && !clearBtn && searchQuery) bar.insertAdjacentHTML('beforeend', `<button class="search-clear" data-action="clearsearch" aria-label="Hapus pencarian">&times;</button>`)
  if (clearBtn && !searchQuery) clearBtn.remove()
}

/* ----- Submit per item ----- */
function validateItem(a, code) {
  const r = getResult(a, code)
  const errs = []
  if (!r.grade) errs.push('Pilih nilai (A–F atau N/A) terlebih dahulu.')
  if (r.grade && r.grade !== 'X') {
    if (DENSITY_ITEMS[code]) {
      const e = evalDensity(r)
      if (e.refD15 === null) errs.push('Isi density & suhu sampel pengiriman terakhir (atau D15 dokumen).')
      if (e.auditD15 === null) errs.push('Isi density & suhu sampel saat audit.')
    }
    if (code === TERA_ITEM) {
      const e = evalTera(a)
      if (!e.rows.length) errs.push('Data nozzle belum diisi di form Data SPBU.')
      else if (!e.testedCount) errs.push('Isi hasil tera minimal satu nozzle.')
      else if (!e.failRows.length && !e.coverageOk) errs.push(`Jumlah nozzle yang diperiksa belum memenuhi target ${e.level === 'excellent' ? '100%' : '50%'} per produk.`)
    }
    if (code === TENANT_ITEM) {
      const e = evalTenants(a)
      if (!e.rows.length) errs.push('Tambahkan minimal 1 tenant beserta izin prinsipnya.')
      e.rows.forEach((t, i) => { if (!t.complete) errs.push(`Tenant ${i + 1}: lengkapi nama, kategori, tanggal berlaku, foto tenant & foto izin.`) })
    }
  }
  return errs
}

async function submitItem(code) {
  const a = curAudit()
  const errs = validateItem(a, code)
  if (errs.length) {
    showModal(`<h3>Item ${esc(code)} belum bisa disubmit</h3><ul class="modal-list">${errs.map((e) => `<li>${esc(e)}</li>`).join('')}</ul><button class="btn-primary" data-close>Oke</button>`)
    return
  }
  setResult(code, { submittedAt: Date.now(), changedAfterSubmit: false })
  try {
    await flushSave(a)
    showToast(`✓ Item ${code} tersimpan`)
  } catch (e) {
    showToast('Gagal menyimpan: ' + e.message)
  }
  patchItem(code)
}

/* ----- Photo ----- */
async function takePhoto(label) {
  const a = curAudit()
  try {
    const shot = await captureStampedPhoto({ label, spbu: a.info.nomorSpbu })
    if (!shot) return null
    a.lokasiTerakhir = { lat: shot.lat, lng: shot.lng, acc: shot.acc, ts: shot.ts }
    return await storeNewPhoto(shot)
  } catch (err) {
    showModal(gpsHelpHtml(err))
    return null
  }
}

/* =========================================================
   VIEW: REPORT
   ========================================================= */
function buildKomentarByElement(a, elCode) {
  const lines = []
  ALL_ITEMS.filter((i) => i.elCode === elCode).forEach((it) => {
    const r = getResult(a, it.code)
    if (r.grade && r.grade !== 'A' && r.grade !== 'X') {
      let line = `${it.code} : ${esc(it.desc)} — nilai <b>${r.grade}</b>`
      if (r.note) line += ` &mdash; ${esc(r.note)}`
      lines.push(line)
    } else if (r.note) {
      lines.push(`${it.code} : ${esc(r.note)}`)
    }
  })
  return lines
}

function viewReport() {
  const a = curAudit()
  const i = a.info
  const comp = computeAudit(a)
  const badge = classificationBadge(comp.classification)
  const level = i.kelasTarget || 'good'
  const reasons = comp.classification === 'gagal' ? reasonsForFail(comp, level) : []

  const indikatorRows = CHECKLIST_TREE.map((el) => {
    const er = comp.elementResults[el.code]
    const band = er.applicable > 0 ? complianceBand(er.pct) : { label: '-', color: '#727687' }
    return `<tr><td>${esc(el.title)}</td><td>${el.weight}</td><td>${(ELEMENT_MIN[level][el.code] * 100).toFixed(0)}%</td>
      <td><span class="chip" style="background:${band.color}">${er.applicable > 0 ? (er.pct * 100).toFixed(2) + '%' : '-'} ${band.label}</span></td></tr>`
  }).join('')

  const subRows = CHECKLIST_TREE.map((el) => {
    const subs = el.subs.map((sub) => {
      const sr = comp.subResults[sub.code]
      const band = sr.applicable > 0 ? complianceBand(sr.pct) : { label: '-', color: '#727687' }
      return `<tr><td>${sub.code} ${esc(sub.title)}</td><td>${sub.weight}</td><td><span class="chip" style="background:${band.color}">${sr.applicable > 0 ? (sr.pct * 100).toFixed(2) + '%' : '-'}</span></td></tr>`
    }).join('')
    return `<div class="section-title">${el.code}. ${esc(el.title)}</div>
    <div class="card"><table class="report-table"><tr><th>Sub Elemen</th><th>Bobot</th><th>Compliance</th></tr>${subs}</table></div>`
  }).join('')

  const komentarHtml = CHECKLIST_TREE.map((el) => {
    const lines = buildKomentarByElement(a, el.code)
    if (!lines.length) return ''
    return `<div style="margin-bottom:10px;"><b style="font-size:13px;">${esc(el.title)}</b><ul class="komentar-list">${lines.map((l) => `<li>${l}</li>`).join('')}</ul></div>`
  }).join('') || '<p style="color:var(--muted);font-size:13px;">Tidak ada temuan minor. Semua item bernilai A.</p>'

  const pinaltiHtml = comp.failedPinalti.length ? `
    <div class="card" style="border:1.5px solid var(--red);">
      <b style="color:var(--red);">&#9888; Item Pinalti Gagal (${comp.failedPinalti.length})</b>
      <ul class="komentar-list">${comp.failedPinalti.map((c) => `<li>${c} — ${esc(PINALTI_META[c].label)}</li>`).join('')}</ul>
      <p style="font-size:12px;color:var(--muted);margin:6px 0 0;">Item pinalti bernilai F menyebabkan SPBU otomatis tidak dapat disertifikasi Pasti Pas, terlepas dari Total Score.</p>
    </div>` : ''

  // Density
  const densRows = Object.entries(DENSITY_ITEMS).map(([code, produk]) => {
    const r = getResult(a, code)
    const e = evalDensity(r)
    if (r.grade === 'X' || (e.refD15 === null && e.auditD15 === null)) return ''
    return `<tr><td>${esc(produk)}</td><td>${formatDensity(e.refD15)}</td><td>${formatDensity(e.auditD15)}</td><td>${formatSigned(e.selisih)}</td>
      <td>${e.ok === null ? '-' : `<span class="chip" style="background:${e.ok ? '#10B981' : '#EF4444'}">${e.ok ? 'OK' : 'Di luar'}</span>`}</td></tr>`
  }).join('')
  const densHtml = densRows ? `<div class="section-title">Pengecekan Density @15°C (toleransi ±0,003)</div>
    <div class="card"><table class="report-table"><tr><th>Produk</th><th>D15 Kirim</th><th>D15 Audit</th><th>Selisih</th><th></th></tr>${densRows}</table></div>` : ''

  // Tera
  const tera = evalTera(a)
  const teraHtml = tera.rows.length ? `<div class="section-title">Tera Bejana Ukur 20 L (batas ${TERA_LIMIT_ML} ml)</div>
    <div class="card"><table class="report-table"><tr><th>Nozzle</th><th>Produk</th><th>Selisih</th><th></th></tr>
    ${tera.rows.map((r) => `<tr><td>${esc(r.nomor)}</td><td>${esc(r.produk)}</td><td>${r.ml === null ? 'tidak diperiksa' : formatNumber(r.ml) + ' ml'}</td>
      <td>${r.ok === null ? '-' : `<span class="chip" style="background:${r.ok ? '#10B981' : '#EF4444'}">${r.ok ? 'OK' : 'Gagal'}</span>`}</td></tr>`).join('')}
    </table>
    <div class="hint" style="margin-top:8px;">${tera.byProduct.map((p) => `${esc(p.produk)}: ${p.tested}/${p.total} diperiksa (min ${p.required})`).join(' &middot; ')}</div></div>` : ''

  // Tenant
  const ten = comp.tenants
  const catLabel = (id) => (TENANT_CATEGORIES.find((c) => c.id === id) || {}).label || '-'
  const tenantHtml = `<div class="section-title">Tenant NFR &amp; Izin Prinsip</div>
    <div class="card">
      ${ten.rows.length ? `<table class="report-table"><tr><th>Tenant</th><th>Kategori</th><th>Berlaku s/d</th><th></th></tr>
      ${ten.rows.map((t) => `<tr><td>${esc(t.nama || '-')}</td><td>${esc(catLabel(t.kategori))}</td><td>${esc(t.berlakuSampai || '-')}</td>
        <td><span class="chip" style="background:${t.valid ? '#10B981' : '#EF4444'}">${t.valid ? 'Berlaku' : 'Tidak berlaku'}</span></td></tr>`).join('')}
      </table>` : '<p class="hint">Belum ada data tenant.</p>'}
      <div class="link-row"><span class="l">Syarat Excellent (1 int'l + 1 nasional)</span><span class="v" style="color:${ten.excellentOk ? 'var(--status-good)' : 'var(--status-warning)'}">${ten.excellentOk ? 'Terpenuhi' : 'Belum terpenuhi'}</span></div>
    </div>`

  const photoItems = []
  ALL_ITEMS.forEach((it) => {
    const r = getResult(a, it.code)
    ;(r.photos || []).forEach((p) => photoItems.push({ p, cap: it.code }))
  })
  ;(getResult(a, TENANT_ITEM).tenants || []).forEach((t) => {
    ;(t.fotoTenant || []).forEach((p) => photoItems.push({ p, cap: `${TENANT_ITEM} ${t.nama || ''} (tenant)` }))
    ;(t.fotoIzin || []).forEach((p) => photoItems.push({ p, cap: `${TENANT_ITEM} ${t.nama || ''} (izin)` }))
  })
  const photoHtml = photoItems.length ? `
    <div class="section-title">Dokumentasi Foto (GPS &amp; timestamp)</div>
    <div class="card"><div class="report-photo-grid">
      ${photoItems.map(({ p, cap }) => `<div><img src="${thumbSrc(p)}" data-full="${esc(p.id || '')}"><div class="cap">${esc(cap)}${p && p.ts ? `<br>${esc(formatStampTime(p.ts))}` : ''}</div></div>`).join('')}
    </div></div>` : ''

  const umkBlock = (i.umkTahunIni || i.upahOperator) ? `
    <div class="link-row"><span class="l">UMK Tahun Ini / Lalu</span><span class="v">Rp ${esc(i.umkTahunIni)} / Rp ${esc(i.umkTahunLalu)}</span></div>
    <div class="link-row"><span class="l">Upah Operator</span><span class="v">Rp ${esc(i.upahOperator)}</span></div>
    <div class="link-row"><span class="l">Hari Kerja/bulan</span><span class="v">${esc(i.hariKerja)}</span></div>
    <div class="link-row"><span class="l">BPJS</span><span class="v">${esc(i.bpjs)}</span></div>` : ''

  const productCount = PRODUCTS.map((p) => [p, i.nozzles.filter((n) => n.produk === p).length]).filter(([, c]) => c)

  return `
  <div id="reportContent">
  <div class="card">
    <div class="link-row"><span class="l">Nomor SPBU</span><span class="v">${esc(i.nomorSpbu) || '-'}</span></div>
    <div class="link-row"><span class="l">Kota / Region</span><span class="v">${esc(i.kota)} / ${esc(i.region)}</span></div>
    <div class="link-row"><span class="l">Alamat</span><span class="v">${esc(i.alamat) || '-'}</span></div>
    <div class="link-row"><span class="l">Tipe Kepemilikan</span><span class="v">${esc(i.tipeKepemilikan)}</span></div>
    <div class="link-row"><span class="l">Area Business Head</span><span class="v">${esc(i.areaBusinessHead) || '-'}</span></div>
    <div class="link-row"><span class="l">Tanggal Audit</span><span class="v">${esc(i.tanggalAudit)}</span></div>
    <div class="link-row"><span class="l">Tipe Audit</span><span class="v">${esc(i.tipeAudit) || '-'}</span></div>
    <div class="link-row"><span class="l">Koordinator</span><span class="v">${esc(i.koordinator) || '-'}</span></div>
    <div class="link-row"><span class="l">Lokasi Audit (GPS)</span><span class="v">${a.lokasiAudit ? esc(formatCoord(a.lokasiAudit)) : '-'}</span></div>
    <div class="link-row"><span class="l">Operator (S1/S2/S3)</span><span class="v">${esc(i.operatorTotal || '-')} (${esc(i.operatorShift1 || '-')}/${esc(i.operatorShift2 || '-')}/${esc(i.operatorShift3 || '-')})</span></div>
    <div class="link-row"><span class="l">Nozzle</span><span class="v">${i.nozzles.length}${productCount.length ? ' · ' + productCount.map(([p, c]) => `${esc(p)} ${c}`).join(', ') : ''}</span></div>
    ${umkBlock}
  </div>

  <div class="score-hero" style="background:${badge.bg};">
    <div class="num">${comp.ts.toFixed(2)}</div>
    <div class="cls">${badge.text}</div>
    <div class="sub">Target kelas: ${level === 'excellent' ? 'Pasti Pas Excellent' : 'Pasti Pas Good'} &middot; Minimum TS ${(TS_MIN[level] * 100).toFixed(0)}% &middot; ${comp.totalSubmitted}/${comp.totalItems} item tersubmit</div>
  </div>

  ${reasons.length ? `<div class="card" style="border:1.5px solid var(--red);">
    <b style="color:var(--red);">Alasan Belum Lulus</b>
    <ul class="komentar-list">${reasons.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
  </div>` : ''}

  ${pinaltiHtml}

  <div class="section-title">Indikator Penilaian</div>
  <div class="card"><table class="report-table">
    <tr><th>Indikator</th><th>Bobot</th><th>Min</th><th>Compliance</th></tr>
    ${indikatorRows}
  </table></div>

  ${subRows}
  ${densHtml}
  ${teraHtml}
  ${tenantHtml}

  <div class="section-title">Komentar Auditor</div>
  <div class="card">${komentarHtml}</div>

  ${photoHtml}
  </div>

  <button class="btn-primary" data-action="finish" style="margin-top:6px;">${a.status === 'selesai' ? 'Audit Ditandai Selesai &#10003;' : 'Tandai Audit Selesai'}</button>
  <div style="height:8px"></div>
  <button class="btn-secondary" data-action="sharetext">Bagikan Ringkasan (Teks)</button>`
}

/** Ganti thumbnail di laporan dengan foto ukuran penuh (dimuat dari IndexedDB). */
function hydrateFullPhotos() {
  const a = curAudit()
  const byId = new Map(photoLists(a).flat().filter((p) => p && p.id).map((p) => [p.id, p]))
  const imgs = [...document.querySelectorAll('#reportContent img[data-full]')]
  return Promise.all(imgs.map(async (img) => {
    const p = byId.get(img.dataset.full)
    if (!p) return
    const url = await fullUrl(p)
    if (url && img.src !== url) {
      await new Promise((res) => { img.onload = res; img.onerror = res; img.src = url })
    }
  }))
}

/* =========================================================
   EXPORT / SHARE
   ========================================================= */
function shareTextSummary() {
  const a = curAudit()
  const comp = computeAudit(a)
  const badge = classificationBadge(comp.classification)
  const lines = [
    'LAPORAN AUDIT PERTAMINA WAY',
    `SPBU ${a.info.nomorSpbu} - ${a.info.kota}`,
    `Tanggal: ${a.info.tanggalAudit}${a.info.areaBusinessHead ? ` | Area Business Head: ${a.info.areaBusinessHead}` : ''}`,
    '',
    `TOTAL SCORE: ${comp.ts.toFixed(2)} - ${badge.text}`,
    '',
  ]
  CHECKLIST_TREE.forEach((el) => {
    const er = comp.elementResults[el.code]
    lines.push(`${el.title}: ${er.applicable > 0 ? (er.pct * 100).toFixed(1) + '%' : '-'}`)
  })
  const text = lines.join('\n')
  if (navigator.share) {
    navigator.share({ title: 'Laporan Audit Pertamina Way', text }).catch(() => {})
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => showToast('Ringkasan disalin ke clipboard'))
  }
}

async function exportPDF() {
  if (currentView !== 'report') { go('report', { auditId: currentAuditId }); await new Promise((r) => setTimeout(r, 150)) }
  showToast('Menyiapkan PDF...')
  const el = document.getElementById('reportContent')
  if (!el) { showToast('Gagal membuat PDF'); return }
  try {
    await hydrateFullPhotos()
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#F5F5F7', useCORS: true })
    const imgData = canvas.toDataURL('image/jpeg', 0.85)
    const pdf = new jsPDF('p', 'pt', 'a4')
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const imgH = canvas.height * pageW / canvas.width
    let heightLeft = imgH
    let position = 0
    pdf.addImage(imgData, 'JPEG', 0, position, pageW, imgH)
    heightLeft -= pageH
    while (heightLeft > 0) {
      position = heightLeft - imgH
      pdf.addPage()
      pdf.addImage(imgData, 'JPEG', 0, position, pageW, imgH)
      heightLeft -= pageH
    }
    pdf.save(`Audit_PertaminaWay_${(curAudit().info.nomorSpbu || 'SPBU').replace(/\s+/g, '_')}.pdf`)
    showToast('PDF berhasil diunduh')
  } catch (e) {
    console.error(e)
    showToast('Gagal membuat PDF: ' + e.message)
  }
}

/* =========================================================
   VIEW: ABOUT / GUIDE
   ========================================================= */
function viewAbout() {
  return `
  <div class="card">
    <b>Cara Menggunakan</b>
    <ol style="font-size:14px;line-height:1.7;padding-left:18px;">
      <li>Tekan <b>+ Mulai Audit SPBU Baru</b>, isi data SPBU, <b>data operator</b> (total &amp; per shift) dan <b>data nozzle</b> (nomor &amp; produk).</li>
      <li>Izinkan akses <b>Lokasi (GPS)</b> dan <b>Kamera</b> saat diminta — checklist tidak bisa dibuka tanpa GPS.</li>
      <li>Periksa <b>Dashboard Item Pinalti</b> lebih dahulu bila perlu, atau langsung buka checklist lengkap.</li>
      <li>Gunakan kolom <b>Cari</b> (cth. “APAR”) untuk menemukan item sesuai area yang sedang diperiksa.</li>
      <li>Beri nilai, ambil foto (kamera langsung, tercap tanggal-jam-GPS), lalu tekan <b>Submit</b> di tiap item.</li>
      <li>Item density (2.2.f–2.2.l) menghitung <b>Density @15°C</b> otomatis dengan Tabel ASTM 53 dan membandingkan dengan pengiriman terakhir (±0,003).</li>
      <li>Item 2.2.m memakai data nozzle untuk <b>tera bejana 20 L</b> (batas −60 ml).</li>
      <li>Item 5.2.f diisi daftar <b>tenant</b> + foto tenant + foto izin prinsip berlaku.</li>
      <li>Buka <b>Laporan</b> untuk hasil akhir, lalu unduh PDF.</li>
    </ol>
  </div>
  <div class="card">
    <b>Logika Penilaian</b>
    <p style="font-size:13px;color:var(--text);line-height:1.6;">
    Nilai A=100%, B=80%, C=60%, D=40%, E=20%, F=0%. Item N/A dikeluarkan dari perhitungan.
    Compliance tiap elemen = (bobot &times; nilai yang tercapai) / (bobot item yang berlaku).
    Total Score = &Sigma; (compliance elemen &times; bobot elemen), dari total bobot 100
    (3S=30, Q&amp;Q=30, RFS=20, VFC=10, EPO=10).
    </p>
  </div>
  <div class="card">
    <b>Item Pinalti</b>
    <p style="font-size:13px;line-height:1.6;">${Object.keys(PINALTI_META).length} item wajib bernilai selain F. Jika salah satu bernilai F, SPBU otomatis <b>tidak lulus Pasti Pas</b> walau Total Score memenuhi minimum.</p>
  </div>
  <div class="card">
    <b>Syarat Tambahan Excellent</b>
    <p style="font-size:13px;line-height:1.6;">Pasti Pas Excellent hanya dapat dicapai bila SPBU memiliki minimal <b>1 tenant internasional</b> dan <b>1 tenant nasional</b> dengan izin prinsip yang masih berlaku (diisi di item 5.2.f).</p>
  </div>
  <div class="card">
    <b>Minimum Kelulusan</b>
    <table class="report-table">
      <tr><th></th><th>Good</th><th>Excellent</th></tr>
      <tr><td>Total Score</td><td>75%</td><td>80%</td></tr>
      <tr><td>3S</td><td>80%</td><td>85%</td></tr>
      <tr><td>Q&amp;Q</td><td>85%</td><td>85%</td></tr>
      <tr><td>RFS</td><td>85%</td><td>85%</td></tr>
      <tr><td>VFC</td><td>15%</td><td>20%</td></tr>
      <tr><td>EPO</td><td>25%</td><td>50%</td></tr>
    </table>
  </div>
  <div class="card" style="text-align:center;color:var(--muted);font-size:12px;">
    Sumber rumus: SIMULASI_AUDIT_TERBARU_INTERTEK.xlsx &amp; Item_Pinalti_Pasti_Pas.pdf &middot; Tabel ASTM 53 dari aplikasi PANTAS<br>Data tersimpan otomatis di perangkat ini.
  </div>`
}

/* =========================================================
   CLOUD SYNC
   ========================================================= */
function needsSync(a) {
  return !a.syncedAt || a.updatedAt > a.syncedAt
}
function pendingCount() {
  return Object.values(AUDITS).filter(needsSync).length
}

function summaryFor(a) {
  const comp = computeAudit(a)
  return {
    ts: Math.round(comp.ts * 100) / 100,
    classification: comp.classification,
    kelasTarget: a.info.kelasTarget,
    totalSubmitted: comp.totalSubmitted,
    totalGraded: comp.totalGraded,
    totalItems: comp.totalItems,
    failedPinalti: comp.failedPinalti,
    areaBusinessHead: a.info.areaBusinessHead || '',
    auditorEmail: cloud.session ? cloud.session.user.email : '',
  }
}

function cloudLineHtml() {
  if (!cloud.enabled) return ''
  if (!cloud.session) return `${iconCloud} Data hanya di perangkat ini &middot; <u>login untuk sinkron cloud</u>`
  if (!cloud.role) return `${iconCloud} Akun belum terdaftar sebagai anggota audit`
  const pend = pendingCount()
  if (cloud.status === 'syncing') return `${iconCloud} Menyinkronkan…`
  if (cloud.status === 'offline') return `${iconCloud} Offline &middot; ${pend} audit menunggu sinkron`
  if (cloud.status === 'error') return `${iconCloud} <span style="color:var(--status-warning)">Gagal sinkron</span> &middot; ${pend} menunggu`
  return `${iconCloud} ${pend ? `${pend} audit menunggu sinkron` : 'Semua audit tersinkron ke cloud'}${cloud.lastSync ? ' &middot; ' + fmtTime(cloud.lastSync) : ''}`
}

function refreshCloudUi() {
  document.querySelectorAll('.cloud-line').forEach((el) => { el.innerHTML = cloudLineHtml() })
  if (currentView === 'cloud') {
    const y = window.scrollY
    render()
    window.scrollTo(0, y)
  }
}

async function initCloud() {
  try {
    cloud.mod = await import('./lib/cloud.js')
  } catch (e) {
    console.warn('Modul cloud gagal dimuat', e)
    return
  }
  cloud.enabled = cloud.mod.cloudEnabled
  if (!cloud.enabled) return
  cloud.session = await cloud.mod.getSession().catch(() => null)
  cloud.mod.onAuthChange((session) => {
    const changed = (session && session.user.id) !== (cloud.session && cloud.session.user.id)
    cloud.session = session
    if (changed) refreshRole()
  })
  await refreshRole()
}

async function refreshRole() {
  cloud.role = null
  cloud.remote = null
  cloud.members = null
  if (cloud.session && navigator.onLine) {
    try { cloud.role = await cloud.mod.claimRole() } catch (e) { cloud.message = e.message }
  }
  refreshCloudUi()
  if (cloud.role) syncNow()
}

let syncTimer = null
let syncRunning = false
function scheduleSync(delay = 4000) {
  if (!cloud.role) return
  clearTimeout(syncTimer)
  syncTimer = setTimeout(() => syncNow(), delay)
}

async function syncNow(manual = false) {
  if (!cloud.role) { if (manual) showToast('Login dulu untuk sinkron'); return }
  if (!navigator.onLine) { cloud.status = 'offline'; refreshCloudUi(); if (manual) showToast('Tidak ada koneksi internet'); return }
  if (syncRunning) { scheduleSync(3000); return }
  syncRunning = true
  cloud.status = 'syncing'
  document.querySelectorAll('.cloud-line').forEach((el) => { el.innerHTML = cloudLineHtml() })
  let count = 0
  try {
    for (const a of Object.values(AUDITS)) {
      if (!needsSync(a)) continue
      const version = a.updatedAt
      await cloud.mod.pushAudit(a, summaryFor(a))
      if (!AUDITS[a.id]) continue
      a.syncedAt = version
      scheduleSave(a, 50)
      count++
    }
    cloud.status = 'idle'
    cloud.lastSync = Date.now()
    cloud.message = ''
    if (count) cloud.remote = null
    if (manual) showToast(count ? `✓ ${count} audit tersinkron ke cloud` : '✓ Semua sudah tersinkron')
  } catch (e) {
    console.error(e)
    cloud.status = navigator.onLine ? 'error' : 'offline'
    cloud.message = e.message
    if (manual) showToast('Gagal sinkron: ' + e.message, 4000)
    scheduleSync(60000)
  } finally {
    syncRunning = false
    refreshCloudUi()
    if (Object.values(AUDITS).some(needsSync) && cloud.status === 'idle') scheduleSync(2000)
  }
}

async function cloudLogin(form) {
  const email = form.email.value
  const password = form.password.value
  const btn = form.querySelector('button')
  btn.disabled = true
  btn.textContent = 'Masuk…'
  try {
    await cloud.mod.signIn(email, password)
    cloud.session = await cloud.mod.getSession()
    await refreshRole()
    showToast(cloud.role ? `Masuk sebagai ${cloud.role}` : 'Login berhasil, tetapi akun belum terdaftar sebagai anggota audit', 3500)
  } catch (e) {
    showToast(e.message, 4000)
    btn.disabled = false
    btn.textContent = 'Masuk'
  }
}

async function cloudLogout() {
  if (pendingCount() && !confirm(`${pendingCount()} audit belum tersinkron. Tetap keluar? (data tetap aman di perangkat ini)`)) return
  await cloud.mod.signOut()
  cloud.session = null
  await refreshRole()
}

async function loadRemote() {
  if (!cloud.role) return
  cloud.remoteLoading = true
  cloud.remoteError = ''
  refreshCloudUi()
  try {
    cloud.remote = await cloud.mod.listRemote()
    if (cloud.role === 'admin') cloud.members = await cloud.mod.listMembers()
  } catch (e) {
    cloud.remoteError = e.message
  }
  cloud.remoteLoading = false
  refreshCloudUi()
}

async function pullFromCloud(id) {
  const local = AUDITS[id]
  if (local && needsSync(local) && !confirm('Audit ini punya perubahan lokal yang belum tersinkron. Timpa dengan versi cloud?')) return
  showToast('Mengunduh audit…', 10000)
  try {
    const audit = normalizeAudit(await cloud.mod.pullAudit(id, (d, t) => showToast(`Mengunduh foto ${d}/${t}…`, 10000)))
    AUDITS[id] = audit
    await flushSave(audit)
    showToast('✓ Audit diunduh ke perangkat')
    refreshCloudUi()
  } catch (e) {
    showToast('Gagal mengunduh: ' + e.message, 4000)
  }
}

async function addMemberFromForm() {
  const email = document.getElementById('mEmail').value
  const nama = document.getElementById('mNama').value
  const role = document.getElementById('mRole').value
  if (!email.trim()) { showToast('Isi email anggota'); return }
  try {
    await cloud.mod.addMember(email, nama, role)
    showToast('✓ Anggota ditambahkan')
    cloud.members = await cloud.mod.listMembers()
    refreshCloudUi()
  } catch (e) {
    showToast(e.message, 4500)
  }
}

async function removeMemberClick(userId) {
  if (!confirm('Hapus anggota ini dari aplikasi audit?')) return
  try {
    await cloud.mod.removeMember(userId)
    cloud.members = await cloud.mod.listMembers()
    refreshCloudUi()
  } catch (e) {
    showToast(e.message, 4000)
  }
}

function remoteListHtml() {
  const q = cloud.remoteFilter.trim().toLowerCase()
  const rows = (cloud.remote || []).filter((r) => !q || [r.nomor_spbu, r.kota, r.summary && r.summary.areaBusinessHead, r.summary && r.summary.auditorEmail].join(' ').toLowerCase().includes(q))
  if (!rows.length) return `<div class="hint" style="padding:10px 4px;">${cloud.remote && cloud.remote.length ? 'Tidak ada yang cocok.' : 'Belum ada audit di cloud.'}</div>`
  return rows.map((r) => {
    const sm = r.summary || {}
    const band = complianceBand((sm.ts || 0) / 100)
    const local = AUDITS[r.id]
    const remoteVer = r.client_updated_at ? new Date(r.client_updated_at).getTime() : 0
    let badge = `<button class="btn-mini" data-pull="${r.id}">Unduh</button>`
    if (local) {
      badge = local.updatedAt >= remoteVer
        ? `<button class="btn-mini ghost" data-open-audit="${r.id}">Buka</button>`
        : `<button class="btn-mini" data-pull="${r.id}">Perbarui</button>`
    }
    return `<div class="remote-row">
      <div class="audit-badge" style="background:${band.color}22;color:${band.color};">${(sm.ts || 0).toFixed(0)}</div>
      <div class="meta">
        <div class="title">${esc(r.nomor_spbu || 'SPBU')} &middot; ${esc(r.kota || '-')}</div>
        <div class="sub">${esc(r.tanggal_audit || '-')} &middot; ${clsLabel(sm.classification)} &middot; ${sm.totalSubmitted || 0}/${sm.totalItems || 125} submit</div>
        <div class="sub">${esc(sm.auditorEmail || '')} <span class="pill ${r.status}">${r.status === 'selesai' ? 'Selesai' : 'Draft'}</span></div>
      </div>
      ${badge}
    </div>`
  }).join('')
}

function viewCloud() {
  if (!cloud.mod) return `<div class="empty-state">Memuat modul cloud…</div>`
  if (!cloud.enabled) return `<div class="card">Sinkronisasi cloud belum dikonfigurasi.</div>`
  if (!cloud.session) {
    return `
    <div class="card">
      <b>Masuk untuk Sinkronisasi Cloud</b>
      <p class="hint">Tanpa login, aplikasi tetap bisa dipakai penuh dan data tersimpan di HP ini. Dengan login, setiap audit otomatis tersimpan ke cloud (termasuk foto) dan bisa direkap oleh Area Business Head.</p>
      <form id="loginForm" autocomplete="on">
        <div class="field"><label>Email</label><input name="email" type="email" autocomplete="username" required></div>
        <div class="field"><label>Password</label><input name="password" type="password" autocomplete="current-password" required></div>
        <button class="btn-primary" type="submit">Masuk</button>
      </form>
      <p class="hint" style="margin-top:10px;">Akun dibuat oleh admin di Supabase Auth (akun yang sama dengan aplikasi PANTAS bisa dipakai), lalu didaftarkan sebagai anggota audit oleh admin.</p>
    </div>`
  }
  const email = esc(cloud.session.user.email)
  if (!cloud.role) {
    return `
    <div class="card">
      <b>${email}</b>
      <p class="hint">Akun ini belum terdaftar sebagai anggota aplikasi audit. Minta admin menambahkan email Anda di menu Cloud &rarr; Anggota.${cloud.message ? `<br><span style="color:var(--status-warning)">${esc(cloud.message)}</span>` : ''}</p>
      <button class="btn-secondary" data-action="logout">Keluar</button>
    </div>`
  }
  if (!cloud.remote && !cloud.remoteLoading && !cloud.remoteError && navigator.onLine) setTimeout(loadRemote, 0)
  const pend = pendingCount()
  const membersHtml = cloud.role === 'admin' ? `
    <div class="section-title">Anggota (admin)</div>
    <div class="card">
      ${(cloud.members || []).map((m) => `<div class="link-row"><span class="l">${esc(m.nama || m.email)}<br><small class="hint">${esc(m.email)}</small></span><span class="v">${m.role}${m.user_id !== cloud.session.user.id ? ` <button class="link-danger" data-rmmember="${m.user_id}">hapus</button>` : ''}</span></div>`).join('') || '<p class="hint">Memuat…</p>'}
      <div class="calc-sec" style="margin-top:12px;">Tambah anggota</div>
      <div class="field"><label>Email akun (sudah dibuat di Supabase Auth)</label><input id="mEmail" type="email"></div>
      <div class="field-row">
        <div class="field"><label>Nama</label><input id="mNama"></div>
        <div class="field"><label>Peran</label><select id="mRole"><option value="auditor">Auditor</option><option value="admin">Admin</option></select></div>
      </div>
      <button class="btn-secondary" data-action="addmember">+ Tambah Anggota</button>
    </div>` : ''
  return `
  <div class="card">
    <div class="link-row"><span class="l">Akun</span><span class="v">${email}</span></div>
    <div class="link-row"><span class="l">Peran</span><span class="v">${cloud.role}</span></div>
    <div class="link-row"><span class="l">Status</span><span class="v">${cloud.status === 'syncing' ? 'Menyinkronkan…' : cloud.status === 'offline' ? 'Offline' : cloud.status === 'error' ? 'Gagal' : 'Siap'}</span></div>
    <div class="link-row"><span class="l">Menunggu sinkron</span><span class="v">${pend} audit</span></div>
    <div class="link-row"><span class="l">Sinkron terakhir</span><span class="v">${cloud.lastSync ? fmtDate(cloud.lastSync) + ' ' + fmtTime(cloud.lastSync) : '-'}</span></div>
    ${cloud.status === 'error' && cloud.message ? `<p class="hint" style="color:var(--status-warning)">${esc(cloud.message)}</p>` : ''}
    <button class="btn-primary" data-action="syncnow" style="margin-top:10px;">Sinkronkan Sekarang</button>
    <div style="height:8px"></div>
    <button class="btn-secondary" data-action="logout">Keluar</button>
  </div>

  <div class="section-title" style="display:flex;justify-content:space-between;align-items:center;">Rekap Audit Semua SPBU <button class="btn-mini ghost" data-action="loadremote">Muat ulang</button></div>
  <div class="card">
    <div class="field" style="margin-bottom:8px;"><input id="remoteFilter" placeholder="Filter SPBU / kota / auditor" value="${esc(cloud.remoteFilter)}"></div>
    ${cloud.remoteLoading ? '<p class="hint">Memuat…</p>' : cloud.remoteError ? `<p class="hint" style="color:var(--status-warning)">${esc(cloud.remoteError)}</p>` : `<div id="remoteList">${remoteListHtml()}</div>`}
  </div>
  ${membersHtml}`
}

/* =========================================================
   EVENT DELEGATION
   ========================================================= */
function onClick(ev) {
  const t = ev.target

  if (t.closest('[data-modal-overlay]') && t === t.closest('[data-modal-overlay]')) { closeModal(); return }

  const tab = t.closest('[data-tab]')
  if (tab) { go(tab.dataset.tab); return }

  const back = t.closest('[data-back]')
  if (back) {
    closeModal()
    const target = back.dataset.back
    if (target === 'home') go('home')
    else if (target === 'form') go('form', { auditId: currentAuditId })
    else if (target === 'checklist') go('checklist', { auditId: currentAuditId })
    return
  }

  const pin = t.closest('[data-pinfilter]')
  if (pin) {
    pinaltiFilter = pin.dataset.pinfilter || null
    searchQuery = ''
    closeModal()
    if (currentView !== 'checklist') go('checklist', { auditId: currentAuditId })
    else { render(); window.scrollTo(0, 0) }
    return
  }

  if (t.closest('[data-close]')) { closeModal() }

  const openAudit = t.closest('[data-open-audit]')
  if (openAudit) {
    pinaltiFilter = null; searchQuery = ''; currentElementOpen = null
    go('form', { auditId: openAudit.dataset.openAudit })
    return
  }

  const action = t.closest('[data-action]')?.dataset.action
  if (action) {
    if (action === 'newaudit') { const id = newAudit(); pinaltiFilter = null; searchQuery = ''; currentElementOpen = null; go('form', { auditId: id }) }
    else if (action === 'tochecklist') enterChecklist()
    else if (action === 'gpsretry') { closeModal(); if (currentView === 'form') enterChecklist(); else requireGps().then(() => showToast('GPS aktif')).catch((e) => showModal(gpsHelpHtml(e))) }
    else if (action === 'deleteaudit') {
      if (confirm('Hapus audit ini beserta seluruh data & foto?')) {
        const id = currentAuditId
        const wasSynced = !!AUDITS[id].syncedAt
        removePhotoFiles(photoLists(AUDITS[id]).flat()).catch(() => {})
        delete AUDITS[id]
        deleteAudit(id).catch(() => {})
        if (wasSynced && cloud.role) {
          cloud.mod.deleteRemote(id).catch((e) => showToast('Audit di cloud tidak terhapus: ' + e.message, 4000))
          cloud.remote = null
        }
        go('home')
      }
    }
    else if (action === 'goreport') go('report', { auditId: currentAuditId })
    else if (action === 'pdf') exportPDF()
    else if (action === 'finish') { curAudit().status = 'selesai'; persist(currentAuditId); showToast('Audit ditandai selesai'); render() }
    else if (action === 'sharetext') shareTextSummary()
    else if (action === 'syncnow') syncNow(true)
    else if (action === 'logout') cloudLogout()
    else if (action === 'loadremote') loadRemote()
    else if (action === 'addmember') addMemberFromForm()
    else if (action === 'clearsearch') {
      searchQuery = ''
      const inp = document.getElementById('searchInput')
      if (inp) inp.value = ''
      refreshCheckBody()
    }
    return
  }

  const pull = t.closest('[data-pull]')
  if (pull) { pullFromCloud(pull.dataset.pull); return }
  const rmMember = t.closest('[data-rmmember]')
  if (rmMember) { removeMemberClick(rmMember.dataset.rmmember); return }

  const toggle = t.closest('[data-toggle-el]')
  if (toggle) {
    const code = toggle.dataset.toggleEl
    currentElementOpen = currentElementOpen === code ? null : code
    render()
    const el = document.getElementById('el-' + code)
    if (el && currentElementOpen) el.scrollIntoView({ block: 'start' })
    return
  }

  const jump = t.closest('[data-jump]')
  if (jump) {
    const it = ITEM_BY_CODE[jump.dataset.jump]
    searchQuery = ''; pinaltiFilter = null; currentElementOpen = it.elCode
    render()
    const card = document.getElementById('item-' + it.code.replace(/\./g, '_'))
    if (card) { card.scrollIntoView({ block: 'center' }); card.classList.add('flash'); setTimeout(() => card.classList.remove('flash'), 1600) }
    return
  }

  const gradeBtn = t.closest('.grade-btn')
  if (gradeBtn) {
    const code = gradeBtn.dataset.code
    const g = gradeBtn.dataset.grade
    const r = getResult(curAudit(), code)
    setResult(code, { grade: r.grade === g ? null : g })
    patchItem(code)
    return
  }

  const submit = t.closest('[data-submit]')
  if (submit) { submitItem(submit.dataset.submit); return }

  const noteT = t.closest('[data-notetoggle]')
  if (noteT) {
    const code = noteT.dataset.notetoggle
    if (noteOpenSet.has(code)) noteOpenSet.delete(code); else noteOpenSet.add(code)
    render()
    return
  }

  const photoBtn = t.closest('[data-photo]')
  if (photoBtn) {
    const code = photoBtn.dataset.photo
    takePhoto(`Item ${code}`).then((photo) => {
      if (!photo) return
      const r = getResult(curAudit(), code)
      setResult(code, { photos: (r.photos || []).concat([photo]) })
      showToast('Foto ditambahkan')
      render()
    })
    return
  }

  const rmPhoto = t.closest('[data-rmphoto]')
  if (rmPhoto) {
    const code = rmPhoto.dataset.rmphoto
    const idx = parseInt(rmPhoto.dataset.idx, 10)
    if (!confirm('Hapus foto ini?')) return
    const r = getResult(curAudit(), code)
    removePhotoFiles([(r.photos || [])[idx]]).catch(() => {})
    setResult(code, { photos: (r.photos || []).filter((_, i) => i !== idx) })
    render()
    return
  }

  if (t.closest('[data-addtenant]')) {
    const r = getResult(curAudit(), TENANT_ITEM)
    const tenants = (r.tenants || []).concat([{ id: uid('t'), nama: '', kategori: '', nomorIzin: '', berlakuSampai: '', fotoTenant: [], fotoIzin: [] }])
    setResult(TENANT_ITEM, { tenants })
    render()
    return
  }

  const rmTenant = t.closest('[data-rmtenant]')
  if (rmTenant) {
    if (!confirm('Hapus tenant ini beserta fotonya?')) return
    const r = getResult(curAudit(), TENANT_ITEM)
    const gone = (r.tenants || []).find((x) => x.id === rmTenant.dataset.rmtenant)
    if (gone) removePhotoFiles([...(gone.fotoTenant || []), ...(gone.fotoIzin || [])]).catch(() => {})
    setResult(TENANT_ITEM, { tenants: (r.tenants || []).filter((x) => x.id !== rmTenant.dataset.rmtenant) })
    applyAutoGrade(TENANT_ITEM)
    render()
    return
  }

  const tPhoto = t.closest('[data-tphoto]')
  if (tPhoto) {
    const [tid, field] = tPhoto.dataset.tphoto.split('|')
    const tenant = (getResult(curAudit(), TENANT_ITEM).tenants || []).find((x) => x.id === tid)
    if (!tenant) return
    takePhoto(`Item ${TENANT_ITEM} · ${field === 'fotoIzin' ? 'Izin Prinsip' : 'Tenant'} ${tenant.nama || ''}`.trim()).then((photo) => {
      if (!photo) return
      tenant[field] = (tenant[field] || []).concat([photo])
      setResult(TENANT_ITEM, { tenants: getResult(curAudit(), TENANT_ITEM).tenants })
      applyAutoGrade(TENANT_ITEM)
      showToast('Foto ditambahkan')
      render()
    })
    return
  }

  const rmTPhoto = t.closest('[data-rmtphoto]')
  if (rmTPhoto) {
    const [tid, field] = rmTPhoto.dataset.rmtphoto.split('|')
    const idx = parseInt(rmTPhoto.dataset.idx, 10)
    if (!confirm('Hapus foto ini?')) return
    const tenants = getResult(curAudit(), TENANT_ITEM).tenants || []
    const tenant = tenants.find((x) => x.id === tid)
    if (!tenant) return
    removePhotoFiles([(tenant[field] || [])[idx]]).catch(() => {})
    tenant[field] = (tenant[field] || []).filter((_, i) => i !== idx)
    setResult(TENANT_ITEM, { tenants })
    applyAutoGrade(TENANT_ITEM)
    render()
  }
}

function onInput(ev) {
  const t = ev.target

  if (t.id === 'remoteFilter') {
    cloud.remoteFilter = t.value
    const box = document.getElementById('remoteList')
    if (box) box.innerHTML = remoteListHtml()
    return
  }

  if (t.id === 'searchInput') {
    searchQuery = t.value
    if (searchQuery.trim()) pinaltiFilter = null
    refreshCheckBody()
    return
  }

  if (t.dataset.info) {
    const a = curAudit()
    a.info[t.dataset.info] = t.value
    persist(a.id)
    if (t.dataset.info.startsWith('operator')) {
      const h = document.getElementById('opHint')
      if (h) h.innerHTML = operatorHint(a.info)
    }
    return
  }

  if (t.dataset.nozzle) {
    const a = curAudit()
    const n = a.info.nozzles.find((x) => x.id === t.dataset.nozzle)
    if (n) { n[t.dataset.nf] = t.value; persist(a.id) }
    return
  }

  if (t.dataset.dens) {
    const code = t.dataset.dens
    const r = getResult(curAudit(), code)
    setResult(code, { density: { ...(r.density || {}), [t.dataset.df]: t.value } })
    applyAutoGrade(code)
    patchItem(code)
    return
  }

  if (t.dataset.tera) {
    const r = getResult(curAudit(), TERA_ITEM)
    setResult(TERA_ITEM, { tera: { ...(r.tera || {}), [t.dataset.tera]: t.value } })
    applyAutoGrade(TERA_ITEM)
    patchItem(TERA_ITEM)
    return
  }

  if (t.dataset.tenant) {
    const tenants = getResult(curAudit(), TENANT_ITEM).tenants || []
    const tenant = tenants.find((x) => x.id === t.dataset.tenant)
    if (!tenant) return
    tenant[t.dataset.tf] = t.value
    setResult(TENANT_ITEM, { tenants })
    applyAutoGrade(TENANT_ITEM)
    patchItem(TENANT_ITEM)
    return
  }

  if (t.dataset.note) {
    setResult(t.dataset.note, { note: t.value })
    patchItem(t.dataset.note)
    return
  }

  if (t.dataset.jumlah) {
    setResult(t.dataset.jumlah, { jumlah: parseInt(t.value, 10) || 0 })
    patchItem(t.dataset.jumlah)
  }
}

function onChange(ev) {
  const t = ev.target
  if (t.dataset.actionChange === 'nozzlecount') {
    resizeNozzles(parseInt(t.value, 10) || 0)
    return
  }
  if (t.dataset.nozzle && t.dataset.nf === 'produk') {
    // Tampilkan ulang ringkasan jumlah nozzle per produk
    render()
    return
  }
  // <select> tidak selalu memicu 'input' di browser lama
  if (t.tagName === 'SELECT' && (t.dataset.info || t.dataset.tenant)) onInput(ev)
}

/* =========================================================
   INIT
   ========================================================= */
async function init() {
  const app = document.getElementById('app')
  app.addEventListener('click', onClick)
  app.addEventListener('input', onInput)
  app.addEventListener('change', onChange)
  document.getElementById('modalRoot').addEventListener('click', onClick)
  app.addEventListener('submit', (ev) => {
    if (ev.target.id === 'loginForm') { ev.preventDefault(); cloudLogin(ev.target) }
  })
  window.addEventListener('online', () => { if (cloud.status === 'offline') cloud.status = 'idle'; syncNow() })

  const flush = () => { flushAll(AUDITS).catch(() => {}) }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush() })
  window.addEventListener('pagehide', flush)

  try {
    AUDITS = await loadAll()
    Object.values(AUDITS).forEach(normalizeAudit)
  } catch (e) {
    console.error(e)
    showToast('Penyimpanan perangkat tidak tersedia: ' + e.message, 5000)
  }
  render()
  migrateOldPhotos().then(initCloud)
}

/** Sekali jalan: pindahkan foto format lama (dataURL di dalam audit) ke store foto terpisah. */
async function migrateOldPhotos() {
  let any = false
  for (const a of Object.values(AUDITS)) {
    try {
      if (await migrateAuditPhotos(a)) { await flushSave(a); any = true }
    } catch (e) {
      console.warn('Migrasi foto gagal', e)
    }
  }
  if (any && !['checklist', 'form'].includes(currentView)) render()
}

init()
