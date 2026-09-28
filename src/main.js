import './styles.css'
import { CHECKLIST_TREE, PINALTI_META } from './data/checklist.js'
import { GUIDELINE } from './data/guideline.js'
import {
  ALL_ITEMS, TOTAL_ITEM_COUNT, ITEM_BY_CODE, PRODUCTS,
  DENSITY_ITEMS, TERA_ITEM, TERA_LIMIT_ML, TENANT_ITEM, TENANT_CATEGORIES,
  emptyResult, getResult, computeAudit, scaleLabel, evalDensity, evalTera, evalTenants,
  productsFromNozzles, searchItems, gradeFromPct,
  SHIFTS, OPERATOR_ITEMS, operatorTotal, operatorsOnDuty, operatorSampleTotal,
} from './lib/scoring.js'
import { DENSITY_TOLERANCE, METHOD_LABEL } from './lib/density.js'
import { formatDensity, formatSigned, parseAngka } from './lib/format.js'
import { loadAll, scheduleSave, flushSave, flushAll, deleteAudit } from './lib/storage.js'
import { captureStampedPhoto, pickGalleryPhotos, formatStampTime, verifyPhoto } from './lib/camera.js'
import { thumbSrc, fullUrl, storeNewPhoto, removePhotoFiles, migrateAuditPhotos, photoLists, photoBlob } from './lib/photos.js'
import { buildReport, fmtPct, fmtSkor } from './lib/report.js'
import { LOGO_MARK, LOGO_FULL, APP_NAME } from './assets/logo-mark.js'

/* =========================================================
   STATE
   ========================================================= */
let AUDITS = {}
let currentAuditId = null
let currentView = 'home'
let currentElementOpen = null
let noteOpenSet = new Set()
const critOpenSet = new Set()
let searchQuery = ''
let pinaltiFilter = null // null | 'all' | elCode
let nozzleDraft = null // isian "Jumlah Nozzle" sebelum ditekan Submit

/* Cloud (Cloudflare Worker + D1 + R2) — modul dimuat dinamis setelah tampilan pertama. */
const cloud = {
  mod: null, enabled: false, session: null, role: null,
  status: 'idle', // idle | syncing | error | offline
  message: '', lastSync: null, needsSetup: false,
  remote: null, remoteLoading: false, remoteError: '',
  members: null, remoteFilter: '', usage: null,
  ready: false, loadError: '', // ready = status login sudah diperiksa (landing page ditampilkan sampai login)
}

const contentEl = () => document.getElementById('content')

function uid(prefix = 'a') {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function defaultInfo() {
  return {
    nomorSpbu: '', region: '', kota: '', alamat: '', namaPemilik: 'PT. PERTAMINA RETAIL', areaBusinessHead: '',
    tipeKepemilikan: 'COCO', tahun: new Date().getFullYear().toString(), telepon: '',
    tanggalAudit: new Date().toISOString().slice(0, 10), tipeAudit: '', kelasTarget: 'good',
    auditors: [''],
    operators: { S1: '', S2: '', S3: '', OFF: '' },
    shiftAudit: [],
    nozzles: [],
    umkTahunIni: '', upahOperator: '', hariKerja: '', bpjs: '',
    komentarManajer: '',
  }
}

/** Lengkapi audit lama (v1) dengan field baru. */
function normalizeAudit(a) {
  a.info = { ...defaultInfo(), ...(a.info || {}) }
  const i = a.info
  if (!i.areaBusinessHead && i.namaManager) i.areaBusinessHead = i.namaManager
  if (!Array.isArray(i.nozzles)) i.nozzles = []
  // v2 → v3: Koordinator → daftar Auditor
  if (!Array.isArray(i.auditors) || !i.auditors.length) i.auditors = [i.koordinator || '']
  delete i.koordinator
  // v2 → v3: operatorShift1..3 → operators per kategori shift
  i.operators = { S1: '', S2: '', S3: '', OFF: '', ...(i.operators || {}) }
  // Kategori NS (Normal Shift) & MD (Middle Shift) dihapus
  delete i.operators.NS
  delete i.operators.MD
  if (Array.isArray(i.shiftAudit)) i.shiftAudit = i.shiftAudit.filter((id) => !['NS', 'MD'].includes(id))
  ;[['operatorShift1', 'S1'], ['operatorShift2', 'S2'], ['operatorShift3', 'S3']].forEach(([old, id]) => {
    if (i[old] !== undefined) { if (!i.operators[id]) i.operators[id] = i[old]; delete i[old] }
  })
  delete i.operatorTotal
  delete i.umkTahunLalu
  if (!Array.isArray(i.shiftAudit)) i.shiftAudit = []
  a.results = a.results || {}
  Object.values(a.results).forEach((r) => { delete r.changedAfterSubmit })
  return a
}

function currentUserName() {
  const u = cloud.session && cloud.session.user
  return u ? (u.nama || u.email || '') : ''
}

function newAudit() {
  const id = uid()
  const info = defaultInfo()
  info.auditors = [currentUserName()]
  AUDITS[id] = { id, version: 3, createdAt: Date.now(), updatedAt: Date.now(), status: 'draft', info, results: {} }
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
  flashSaved._t = setTimeout(() => { el.textContent = '✓ tersimpan' }, 600)
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
const iconUser = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0 1 16 0"/></svg>`
const iconGallery = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="m21 16-5-5-8 8"/></svg>`
const iconCloud = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.1 9.2 4.5 4.5 0 0 0 7 18z"/></svg>`

/* =========================================================
   ROUTER / RENDER
   ========================================================= */
function go(view, params) {
  currentView = view
  if (params && params.auditId) currentAuditId = params.auditId
  render()
  window.scrollTo(0, 0)
  // Animasi masuk bertahap (stagger) tiap pindah halaman
  const c = contentEl()
  c.classList.remove('view-enter')
  void c.offsetWidth
  c.classList.add('view-enter')
  clearTimeout(go._t)
  go._t = setTimeout(() => c.classList.remove('view-enter'), 900)
}

/** Beri indeks urutan ke tiap bagian logo (untuk animasi morph bertahap). */
function indexLogoParts() {
  document.querySelectorAll('.logo-mark').forEach((svg) => {
    // Logo resmi sudah membawa --i per pita; hanya isi bila belum ada
    ;[...svg.children].forEach((el, i) => { if (!el.style.getPropertyValue('--i')) el.style.setProperty('--i', i) })
  })
}

/** Efek pegas singkat pada elemen (nilai dipilih, chip, dsb). */
function springPop(el) {
  el.classList.remove('pop')
  void el.offsetWidth
  el.classList.add('pop')
}

/** Riak (ripple) di titik sentuh untuk tombol-tombol utama. */
const RIPPLE_SEL = '.btn-primary,.btn-secondary,.btn-ghost,.btn-mini,.submit-btn,.photo-btn,.tab,.choice-chip,.submit-data,.report-fab,.cam-btn,.elem-header,.pin-card,.card.tap'
function addRipple(ev) {
  const host = ev.target.closest && ev.target.closest(RIPPLE_SEL)
  if (!host || host.disabled) return
  const r = host.getBoundingClientRect()
  const d = Math.max(r.width, r.height) * 1.2
  const sp = document.createElement('span')
  sp.className = 'ripple'
  sp.style.cssText = `width:${d}px;height:${d}px;left:${ev.clientX - r.left - d / 2}px;top:${ev.clientY - r.top - d / 2}px`
  host.appendChild(sp)
  setTimeout(() => sp.remove(), 600)
}

function render() {
  const c = contentEl()
  const landing = !cloud.ready || !cloud.session
  document.body.classList.toggle('landing-mode', landing)
  if (landing) {
    document.getElementById('tabbar').innerHTML = ''
    document.getElementById('topbar').innerHTML = ''
    c.innerHTML = cloud.ready ? viewLanding() : `<div class="landing-splash"><div class="brand-logo full">${LOGO_FULL}</div><div class="spinner"></div></div>`
    indexLogoParts()
    return
  }
  renderTabbar()
  renderTopbar()
  if (currentView === 'home') { c.innerHTML = viewHome(); indexLogoParts() }
  else if (currentView === 'history') c.innerHTML = viewHistory()
  else if (currentView === 'form') c.innerHTML = viewForm()
  else if (currentView === 'checklist') c.innerHTML = viewChecklist()
  else if (currentView === 'report') { c.innerHTML = viewReport(); hydrateFullPhotos() }
  else if (currentView === 'about') c.innerHTML = viewAbout()
  else if (currentView === 'account') c.innerHTML = viewAccount()
}

function renderTabbar() {
  const tabs = [
    { id: 'home', label: 'Beranda', icon: iconHome },
    { id: 'history', label: 'Riwayat', icon: iconHistory },
    { id: 'account', label: 'Akun', icon: iconUser },
    { id: 'about', label: 'Panduan', icon: iconInfo },
  ]
  document.getElementById('tabbar').innerHTML = tabs.map((t) => `
    <button class="tab ${(currentView === t.id || (t.id === 'home' && ['form', 'checklist', 'report'].includes(currentView))) ? 'active' : ''}" data-tab="${t.id}">
      ${t.icon}<span>${t.label}</span>
    </button>`).join('')
}

function renderTopbar() {
  const tb = document.getElementById('topbar')
  if (currentView === 'home') { tb.innerHTML = `<div class="top-brand">${LOGO_MARK}<h1>${APP_NAME}</h1></div>`; return }
  if (currentView === 'history') { tb.innerHTML = `<h1 style="text-align:left;flex:1;">Riwayat Audit</h1>`; return }
  if (currentView === 'about') { tb.innerHTML = `<h1 style="text-align:left;flex:1;">Panduan</h1>`; return }
  if (currentView === 'account') { tb.innerHTML = `<h1 style="text-align:left;flex:1;">Akun &amp; Rekap</h1>`; return }
  if (currentView === 'form') {
    tb.innerHTML = `<button class="back" data-back="home">&#8249; Kembali</button><h1>Data SPBU</h1><span style="width:70px"></span>`
    return
  }
  if (currentView === 'checklist') {
    const a = curAudit()
    tb.innerHTML = `<button class="back" data-back="form">&#8249;</button><h1>${esc(a.info.nomorSpbu || 'Checklist')}</h1><span id="submitDataSlot">${submitDataBtnHtml()}</span>`
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
  <div class="hero hero-brand">
    <div class="hero-logo">${LOGO_MARK}</div>
    <h1>${APP_NAME}</h1>
  </div>
  <div class="cloud-line" data-tab="account">${cloudLineHtml()}</div>
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

function operatorSummaryHtml(a) {
  const total = operatorTotal(a)
  const duty = operatorsOnDuty(a)
  const dutyLabels = (a.info.shiftAudit || []).map((id) => (SHIFTS.find((x) => x.id === id) || {}).label || id)
  return `<div class="op-sum">
    <div><span>Total operator</span><b>${total}</b></div>
    <div><span>Bertugas saat audit</span><b>${duty}</b></div>
  </div>
  <div class="hint">${dutyLabels.length ? `Sampel item operator otomatis = <b>${duty}</b> operator (${dutyLabels.map(esc).join(' + ')}).` : 'Pilih shift yang sedang bertugas saat audit — jumlahnya otomatis menjadi total sampel di checklist.'}</div>`
}

function viewForm() {
  const a = curAudit()
  const i = a.info
  const nozzles = i.nozzles
  const nozzleCount = nozzles.length
  // Pilihan nomor nozzle: 1..max(jumlah nozzle, nomor terbesar yang sudah dipakai)
  const maxNo = Math.max(nozzleCount, ...nozzles.map((n) => parseInt(n.nomor, 10) || 0))
  const nomorOptions = Array.from({ length: maxNo }, (_, k) => String(k + 1))
  const usedNo = nozzles.map((n) => String(n.nomor || ''))
  const nozzleRows = nozzles.map((n, idx) => {
    const dup = n.nomor && usedNo.filter((x) => x === String(n.nomor)).length > 1
    return `
    <div class="nozzle-row">
      <span class="nozzle-idx">${idx + 1}</span>
      <div class="field"><label>Nomor Nozzle</label>
        <select data-nozzle="${n.id}" data-nf="nomor" class="${dup ? 'dup' : ''}">
          <option value="">— no —</option>
          ${nomorOptions.map((no) => `<option value="${no}" ${String(n.nomor) === no ? 'selected' : ''}>Nozzle ${no}</option>`).join('')}
        </select>
      </div>
      <div class="field"><label>Produk</label>
        <select data-nozzle="${n.id}" data-nf="produk">
          <option value="">— pilih —</option>
          ${PRODUCTS.map((p) => `<option ${n.produk === p ? 'selected' : ''}>${p}</option>`).join('')}
        </select>
      </div>
    </div>`
  }).join('')

  const perProduct = PRODUCTS.map((p) => [p, nozzles.filter((n) => n.produk === p).length]).filter(([, c]) => c > 0)
  const draft = nozzleDraft !== null ? nozzleDraft : (nozzleCount || '')
  const auditors = i.auditors && i.auditors.length ? i.auditors : ['']

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
    ${auditors.map((nm, k) => `
      <div class="auditor-row">
        <div class="field"><label>Auditor ${k + 1}</label><input data-auditor="${k}" value="${esc(nm)}" placeholder="Nama auditor"></div>
        ${auditors.length > 1 ? `<button class="icon-btn danger" data-rmauditor="${k}" aria-label="Hapus auditor ${k + 1}">&times;</button>` : ''}
      </div>`).join('')}
    <button class="btn-ghost small" data-action="addauditor">+ Tambah Auditor</button>
  </div>

  <div class="section-title">Data Operator <span class="req">wajib</span></div>
  <div class="card">
    <div class="shift-grid">
      ${SHIFTS.map((sh) => `<div class="field"><label>${sh.label}</label><input type="number" min="0" inputmode="numeric" data-op="${sh.id}" value="${esc(i.operators[sh.id])}" placeholder="0"></div>`).join('')}
    </div>
    <div class="calc-sec" style="margin-top:4px">Shift bertugas saat audit</div>
    <div class="chip-row">
      ${SHIFTS.filter((sh) => sh.id !== 'OFF').map((sh) => `<button class="choice-chip ${i.shiftAudit.includes(sh.id) ? 'on' : ''}" data-shiftaudit="${sh.id}">${sh.label}</button>`).join('')}
    </div>
    <div id="opSummary">${operatorSummaryHtml(a)}</div>
  </div>

  <div class="section-title">Data Nozzle <span class="req">wajib</span></div>
  <div class="card">
    <div class="nozzle-count">
      <div class="field"><label>Jumlah Nozzle</label><input type="number" min="1" max="80" inputmode="numeric" id="nozzleCount" value="${esc(draft)}" placeholder="cth. 8"></div>
      <button class="btn-mini" data-action="nozzlesubmit">${nozzleCount ? 'Perbarui' : 'Submit'}</button>
    </div>
    ${nozzleCount ? `<div class="calc-sec">Nomor &amp; produk tiap nozzle</div>${nozzleRows}` : '<div class="hint">Isi jumlah nozzle lalu tekan <b>Submit</b> — daftar nozzle dengan pilihan nomor akan muncul.</div>'}
    ${perProduct.length ? `<div class="hint">${perProduct.map(([p, c]) => `${esc(p)}: <b>${c}</b>`).join(' &middot; ')}</div>` : ''}
    <div class="hint">Data nozzle dipakai untuk penilaian tera bejana ukur 20 liter (item 2.2.m, batas −60 ml) dan tabel Pengecekan Q&amp;Q di laporan.</div>
  </div>

  <div class="section-title">Data Ketenagakerjaan (opsional)</div>
  <div class="card">
    ${infoInput('umkTahunIni', 'UMK Tahun Ini (Rp)', { inputmode: 'numeric' })}
    <div class="field-row">${infoInput('upahOperator', 'Upah Operator (Rp)', { inputmode: 'numeric' })}${infoInput('hariKerja', 'Hari Kerja/bulan', { inputmode: 'numeric' })}</div>
    ${infoInput('bpjs', 'Bukti bayar/kepesertaan BPJS', { placeholder: 'Tersedia / Tidak tersedia' })}
  </div>

  <button class="btn-primary" data-action="tochecklist">Lanjut ke Checklist &#8250;</button>
  <div style="height:10px"></div>
  <button class="btn-danger" data-action="deleteaudit" style="width:100%;">Hapus Audit Ini</button>`
}

function formErrors(a) {
  const i = a.info
  const errs = []
  if (!(i.auditors || []).some((x) => String(x || '').trim())) errs.push('Nama auditor belum diisi')
  if (!operatorTotal(a)) errs.push('Jumlah operator per shift belum diisi')
  if (!(i.shiftAudit || []).length) errs.push('Shift yang bertugas saat audit belum dipilih')
  else if (!operatorsOnDuty(a)) errs.push('Jumlah operator pada shift yang bertugas masih 0')
  if (!i.nozzles.length) errs.push('Jumlah nozzle belum di-submit')
  i.nozzles.forEach((n, idx) => {
    if (!String(n.nomor || '').trim()) errs.push(`Nomor nozzle baris ${idx + 1} belum dipilih`)
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
    const res = getResult(a, TERA_ITEM)
    removed.forEach((r) => {
      if (res.tera) delete res.tera[r.id]
      if (res.teraMode) delete res.teraMode[r.id]
    })
  }
  persist(a.id)
  render()
}

function enterChecklist() {
  const a = curAudit()
  const errs = formErrors(a)
  if (errs.length) {
    showModal(`<h3>Lengkapi Data Dulu</h3><p class="modal-p">Data berikut wajib diisi sebelum checklist:</p><ul class="modal-list">${errs.map((e) => `<li>${esc(e)}</li>`).join('')}</ul><button class="btn-primary" data-close>Oke</button>`)
    return
  }
  const first = !a.pinaltiPromptShown
  go('checklist', { auditId: a.id })
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
}

/* =========================================================
   VIEW: CHECKLIST
   ========================================================= */
function statusChip(r) {
  if (r.submittedAt) return `<span class="st-chip ok">✓ Tersubmit ${fmtTime(r.submittedAt)}</span>`
  if (r.grade) return `<span class="st-chip draft">Draft</span>`
  return ''
}

function gradeRowHtml(it, r) {
  // Hanya nilai sesuai skala item (Excel sumber). N/A hanya untuk item berskala "/X";
  // tetap ditampilkan bila data lama sudah terlanjur N/A agar bisa dibatalkan.
  const showNA = it.allowNA || r.grade === 'X'
  const invalid = r.grade && r.grade !== 'X' && !it.allowed.includes(r.grade)
  return it.allowed.map((g) => `<button class="grade-btn g-${g} ${r.grade === g ? 'sel-' + g : ''}" data-grade="${g}" data-code="${it.code}">${g}</button>`).join('')
    + (showNA ? `<button class="grade-btn g-X ${r.grade === 'X' ? 'sel-X' : ''} ${it.allowNA ? '' : 'na-invalid'}" data-grade="X" data-code="${it.code}">N/A</button>` : '')
    + `<span class="scale-tag">Skala ${esc(scaleLabel(it))}</span>`
    + ((r.grade === 'X' && !it.allowNA) || invalid ? `<div class="scale-warn">Nilai ${r.grade === 'X' ? 'N/A' : r.grade} tidak ada di skala item ini — pilih ulang.</div>` : '')
}

function autoGradeInfo(a, code) {
  const r = getResult(a, code)
  if (DENSITY_ITEMS[code]) {
    const e = evalDensity(r)
    if (e.autoGrade) return { grade: e.autoGrade, why: `selisih ${formatSigned(e.selisih)} ${e.ok ? 'dalam' : 'melebihi'} toleransi ±${String(DENSITY_TOLERANCE).replace('.', ',')}` }
  } else if (code === TERA_ITEM) {
    const e = evalTera(a)
    if (e.autoGrade) {
      return { grade: e.autoGrade, why: e.coverageOk
        ? `${e.testedCount} nozzle dicek, ${e.failRows.length} di bawah ${TERA_LIMIT_ML} ml (tabel ketentuan guideline)`
        : `${e.failRows.length} nozzle di bawah ${TERA_LIMIT_ML} ml — tetap F walau semua nozzle dicek` }
    }
  } else if (code === TENANT_ITEM) {
    const e = evalTenants(a)
    if (e.autoGrade === 'A') return { grade: 'A', why: 'semua tenant punya izin prinsip berlaku' }
    if (e.autoGrade === 'F') return { grade: 'F', why: 'ada tenant tanpa izin prinsip berlaku / foto izin' }
  } else if (GUIDELINE[code] && GUIDELINE[code].pct) {
    const { ok, n } = pctValues(a, code)
    const g = gradeFromPct(GUIDELINE[code].pct, ok, n)
    if (g) return { grade: g, why: `${ok} dari ${n} ${OPERATOR_ITEMS[code] ? 'operator ' : ''}sesuai (${Math.round((parseAngka(ok) / n) * 100)}%) — kriteria guideline` }
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
    ['Hasil density pengiriman terakhir', e.refD15 !== null ? `${formatDensity(e.refD15)}${e.refCalc ? ` <small>(${METHOD_LABEL[e.refCalc.method]})</small>` : ' <small>(input langsung)</small>'}` : '—'],
    ['Hasil density sampel audit', e.auditD15 !== null ? `${formatDensity(e.auditD15)} <small>(${METHOD_LABEL[e.auditCalc.method]})</small>` : '—'],
    ['Selisih', formatSigned(e.selisih)],
  ]
  let status = `<span class="res-pill idle">Isi density &amp; suhu (cth. 0,7450 atau 745)</span>`
  if (e.ok === true) status = `<span class="res-pill ok">✓ Dalam toleransi ±0,003</span>`
  if (e.ok === false) status = `<span class="res-pill bad">✕ Melebihi toleransi ±0,003</span>`
  return `${rows.map(([l, v]) => `<div class="out-row"><span>${l}</span><b>${v}</b></div>`).join('')}
    <div style="margin-top:6px">${status}</div>`
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
    ${densityField(it.code, 'refD15Manual', 'Hasil Density', d, { placeholder: 'opsional · bila density @15°C sudah diketahui' })}
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
  return `<div class="out-row"><span>Nozzle dicek / di bawah toleransi</span><b>${e.testedCount} / ${e.failRows.length}${e.provisional ? ` → ${e.coverageOk ? '' : 'sementara '}${e.provisional}` : ''}</b></div>
    <div class="calc-sec" style="margin-top:4px">Cakupan per produk (target ${e.level === 'excellent' ? '100%' : '50%'})</div>
    ${e.byProduct.map((p) => `<div class="out-row"><span>${esc(p.produk)}</span><b>${p.tested}/${p.total} diperiksa · min ${p.required} ${p.coverageOk ? '<span style="color:var(--status-good)">✓</span>' : '<span style="color:var(--status-poor)">kurang</span>'}${p.fail ? ` · <span style="color:var(--status-warning)">${p.fail} gagal</span>` : ''}</b></div>`).join('')}`
}

function teraBlock(a) {
  const e = evalTera(a)
  const tera = getResult(a, TERA_ITEM).tera || {}
  return `<div class="calc">
    <div class="calc-head">Tera Bejana Ukur 20 L per Nozzle <span class="mini-pill">batas ${TERA_LIMIT_ML} ml</span></div>
    <div class="hint">Pilih mode <b>P</b> (Preset) atau <b>M</b> (Manual) lalu isi selisih volume (ml) nozzle yang diperiksa: negatif = kurang, positif = lebih. Kurang dari ${TERA_LIMIT_ML} ml = di bawah toleransi (Red). Kosongkan nozzle yang tidak diperiksa. Nilai A/B/C/F mengikuti tabel ketentuan guideline (jumlah nozzle dicek vs jumlah Red).</div>
    ${!e.rows.length ? `<div class="res-pill warn" style="margin:8px 0">Data nozzle belum diisi.</div><button class="btn-ghost" data-back="form">Isi Data Nozzle</button>` : `
    <div class="table-x"><table class="tera-table">
      <tr><th>Nozzle</th><th>Mode</th><th>Selisih (ml)</th><th></th></tr>
      ${e.rows.map((row) => `<tr>
        <td class="tz-noz"><b class="mono">${esc(row.nomor)}</b><small>${esc(row.produk)}</small></td>
        <td><div class="pm-toggle" role="group" aria-label="Mode tera nozzle ${esc(row.nomor)}">
          <button class="pm ${row.mode === 'P' ? 'on' : ''}" data-teramode="${row.id}|P" title="Preset">P</button><button class="pm ${row.mode === 'M' ? 'on' : ''}" data-teramode="${row.id}|M" title="Manual">M</button>
        </div></td>
        <td><input data-tera="${row.id}" inputmode="numeric" value="${esc(tera[row.id])}" placeholder="—"></td>
        <td data-terastatus="${row.id}">${teraStatusHtml(row)}</td>
      </tr>`).join('')}
    </table></div>`}
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

/** Thumbnail foto. `viewKey` dipakai untuk membuka pratinjau penuh; tombol hapus disembunyikan bila terkunci. */
function thumbsHtml(photos, rmAttr, viewKey, locked = false) {
  if (!photos || !photos.length) return ''
  return `<div class="photo-strip">${photos.map((p, idx) => `
    <div class="photo-thumb"><img src="${thumbSrc(p)}" alt="Foto ${idx + 1}" loading="lazy" data-viewphoto="${viewKey}|${idx}">${p && p.source === 'gallery' ? '<span class="src-tag">GALERI</span>' : ''}${locked ? '' : `<button class="rm" ${rmAttr}="${idx}" aria-label="Hapus foto">&times;</button>`}</div>`).join('')}</div>`
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
            <div class="photo-row"><button class="photo-btn" data-tphoto="${t.id}|fotoTenant">${iconCamera} Foto Tenant (${(t.fotoTenant || []).length})</button><button class="gallery-btn" data-gallery="tenant|${t.id}|fotoTenant">${iconGallery} Galeri</button></div>
            ${thumbsHtml(t.fotoTenant, `data-rmtphoto="${t.id}|fotoTenant" data-idx`, `tenant|${t.id}|fotoTenant`, tenantLocked(a))}
          </div>
          <div>
            <div class="photo-row"><button class="photo-btn" data-tphoto="${t.id}|fotoIzin">${iconCamera} Foto Izin Prinsip (${(t.fotoIzin || []).length})</button><button class="gallery-btn" data-gallery="tenant|${t.id}|fotoIzin">${iconGallery} Galeri</button></div>
            ${thumbsHtml(t.fotoIzin, `data-rmtphoto="${t.id}|fotoIzin" data-idx`, `tenant|${t.id}|fotoIzin`, tenantLocked(a))}
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

const PCT_LABEL = { 'A-F': 'A 100% · B ≥80% · C ≥60% · D ≥40% · E ≥20% · F <20%', ACF: 'A 100% · C ≥60% · F <60%', AF: 'A 100% · F <100%', ABCF: 'A 100% · B ≥80% · C ≥60% · F <60%' }

/** Nilai "sesuai" & total sampel. Item operator: total otomatis dari data operator. */
function pctValues(a, code) {
  const r = getResult(a, code)
  const p = r.pct || {}
  const auto = operatorSampleTotal(a, code)
  const n = auto !== null ? auto : parseAngka(p.n)
  return { ok: p.ok, n, auto: auto !== null }
}

/** Kalkulator "% sesuai" untuk item yang kriteria guideline-nya berbasis persentase. */
function pctBlock(a, it, r) {
  const g = GUIDELINE[it.code]
  if (!g || !g.pct) return ''
  const p = r.pct || {}
  const { ok, n, auto } = pctValues(a, it.code)
  const okNum = parseAngka(ok)
  const kind = OPERATOR_ITEMS[it.code]
  const showNames = kind && okNum !== null && n && okNum < n
  return `<div class="pct-row">
    <span class="pct-label">${kind ? 'Operator sesuai' : 'Hitung dari sampel'}</span>
    <input data-pct="${it.code}" data-pf="ok" inputmode="numeric" value="${esc(p.ok)}" placeholder="sesuai">
    <span>dari</span>
    ${auto
      ? `<span class="pct-auto" title="Otomatis dari Data Operator">${n}</span><span class="pct-src">${kind === 'all' ? 'total operator' : 'operator bertugas'}</span>`
      : `<input data-pct="${it.code}" data-pf="n" inputmode="numeric" value="${esc(p.n)}" placeholder="total">`}
    <div class="pct-rule">${PCT_LABEL[g.pct]}</div>
    ${showNames ? `<div class="field pct-names"><label>Nama operator yang tidak memenuhi (${n - okNum} orang)</label><input data-pct="${it.code}" data-pf="names" value="${esc(p.names)}" placeholder="cth. Budi, Sari"></div>` : ''}
  </div>`
}

/** Kriteria nilai dari Audit Guideline (dapat dibuka/tutup), nilai yang dipilih disorot. */
function criteriaHtml(it, r) {
  const g = GUIDELINE[it.code]
  if (!g) return ''
  const rows = Object.entries(g.crit).map(([k, v]) => `<li class="${r.grade === k ? 'on' : ''}"><b>${k === 'X' ? 'N/A' : k}</b> ${esc(v.replace(/^Jika\s+/i, ''))}</li>`).join('')
  return `<details class="crit"${critOpenSet.has(it.code) ? ' open' : ''} data-critdetails="${it.code}">
    <summary>Kriteria nilai · Guideline ${esc(g.ref)}</summary>
    <ul>${rows}</ul>
  </details>`
}

function itemCardHtml(a, it, opts = {}) {
  const r = getResult(a, it.code)
  const meta = PINALTI_META[it.code]
  const tiered = meta && meta.tiered
  const locked = !!r.submittedAt
  return `
  <div class="item-card ${it.pinalti ? 'pinalti' : ''} ${locked ? 'submitted' : ''}" id="item-${it.code.replace(/\./g, '_')}" data-item="${it.code}" data-crumb="${opts.breadcrumb ? 1 : 0}">
    ${opts.breadcrumb ? `<div class="crumb">${esc(breadcrumb(it))}</div>` : ''}
    <div class="item-head">
      <div class="code">${it.code}${it.pinalti ? '<span class="badge-pinalti">PINALTI</span>' : ''}</div>
      <span data-status="${it.code}">${statusChip(r)}</span>
    </div>
    <div class="desc">${esc(it.desc)}</div>
    <div class="item-body"${locked ? ' inert' : ''}>
      ${specialBlock(a, it)}
      ${pctBlock(a, it, r)}
      <div class="grade-row" data-graderow="${it.code}">${gradeRowHtml(it, r)}</div>
      <div data-autohint="${it.code}">${autoHintHtml(a, it.code)}</div>
      ${tiered ? `<div class="jumlah-row">
        <label>Jumlah ${meta.unit} tersedia</label>
        <input type="number" min="0" max="9" inputmode="numeric" value="${r.jumlah || ''}" data-jumlah="${it.code}">
      </div>` : ''}
      ${(noteOpenSet.has(it.code) || r.note) ? `<div class="item-note field"><textarea placeholder="Catatan temuan auditor..." data-note="${it.code}">${esc(r.note)}</textarea></div>` : ''}
    </div>
    <div data-crit="${it.code}">${criteriaHtml(it, r)}</div>
    <div class="item-toolrow">
      <button class="photo-btn" data-photo="${it.code}" ${locked ? 'disabled' : ''}>${iconCamera} Foto (${(r.photos || []).length})</button>
      <button class="gallery-btn" data-gallery="item|${it.code}" ${locked ? 'disabled' : ''} aria-label="Upload dari galeri">${iconGallery} Galeri</button>
      <button class="note-toggle" data-notetoggle="${it.code}" ${locked ? 'disabled' : ''}>${noteOpenSet.has(it.code) || r.note ? 'Sembunyikan catatan' : '+ Catatan'}</button>
      ${locked
        ? `<button class="submit-btn edit" data-edit="${it.code}">✎ Edit</button>`
        : `<button class="submit-btn" data-submit="${it.code}">Submit</button>`}
    </div>
    ${thumbsHtml(r.photos, `data-rmphoto="${it.code}" data-idx`, `item|${it.code}`, locked)}
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
  document.querySelectorAll(attrSel('data-crit', code)).forEach((el) => {
    el.querySelectorAll('li').forEach((li) => {
      const k = li.querySelector('b').textContent
      li.classList.toggle('on', (k === 'N/A' ? 'X' : k) === r.grade)
    })
  })
  if (GUIDELINE[code] && GUIDELINE[code].pct && OPERATOR_ITEMS[code]) {
    // Tampilkan/sembunyikan isian nama operator tanpa kehilangan fokus input
    const { ok, n } = pctValues(a, code)
    const okNum = parseAngka(ok)
    const need = okNum !== null && n && okNum < n
    document.querySelectorAll(attrSel('data-item', code)).forEach((card) => {
      const row = card.querySelector('.pct-row')
      if (!row) return
      const box = row.querySelector('.pct-names')
      if (need && !box) {
        row.insertAdjacentHTML('beforeend', `<div class="field pct-names"><label>Nama operator yang tidak memenuhi (${n - okNum} orang)</label><input data-pct="${code}" data-pf="names" value="${esc((r.pct || {}).names)}" placeholder="cth. Budi, Sari"></div>`)
      } else if (!need && box) box.remove()
      else if (need && box) box.querySelector('label').textContent = `Nama operator yang tidak memenuhi (${n - okNum} orang)`
    })
  }
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

/** Render ulang seluruh kartu item (mis. setelah Submit/Edit). */
function rerenderCard(code) {
  const a = curAudit()
  const it = ITEM_BY_CODE[code]
  document.querySelectorAll(attrSel('data-item', code)).forEach((el) => {
    el.outerHTML = itemCardHtml(a, it, { breadcrumb: el.dataset.crumb === '1' })
  })
  patchProgress()
}

function isLocked(code) {
  return !!getResult(curAudit(), code).submittedAt
}

function tenantLocked(a) {
  return !!getResult(a, TENANT_ITEM).submittedAt
}

function patchProgress() {
  const el = document.getElementById('progressBox')
  if (el) el.innerHTML = progressHtml()
  const pd = document.getElementById('pinDash')
  if (pd) pd.innerHTML = pinaltiDashHtml()
  const fab = document.getElementById('reportFab')
  if (fab) fab.innerHTML = reportFabHtml()
  const sd = document.getElementById('submitDataSlot')
  if (sd) {
    const prev = sd.firstElementChild && sd.firstElementChild.className
    sd.innerHTML = submitDataBtnHtml()
    if (prev && prev !== sd.firstElementChild.className) sd.firstElementChild.classList.add('pop')
  }
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
    <div class="pg-row"><span><b>${comp.totalSubmitted}/${comp.totalItems}</b> tersubmit <span id="saveState" class="save-state">✓ tersimpan</span></span><span>TS <b>${comp.ts.toFixed(2)}</b> &middot; ${clsLabel(comp.classification)}</span></div>
    <div class="progress-track slim"><div class="progress-fill" style="width:${pct}%"></div></div>`
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
  <div class="search-dock"><div class="search-bar">
    ${iconSearch}
    <input id="searchInput" type="search" autocomplete="off" placeholder="Cari item… cth. APAR, toilet, density" value="${esc(searchQuery)}">
    ${searchQuery ? `<button class="search-clear" data-action="clearsearch" aria-label="Hapus pencarian">&times;</button>` : ''}
  </div><div class="top-progress" id="progressBox">${progressHtml()}</div></div>
  <div id="checkBody">${checkBodyHtml()}</div>
  <div id="reportFab">${reportFabHtml()}</div>`
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
  const it = ITEM_BY_CODE[code]
  if (!r.grade) errs.push(`Pilih nilai (skala ${scaleLabel(it)}) terlebih dahulu.`)
  else if (r.grade === 'X' ? !it.allowNA : !it.allowed.includes(r.grade)) errs.push(`Nilai ${r.grade === 'X' ? 'N/A' : r.grade} tidak sesuai skala item ini (${scaleLabel(it)}).`)
  if (r.grade && r.grade !== 'X') {
    if (DENSITY_ITEMS[code]) {
      const e = evalDensity(r)
      if (e.refD15 === null) errs.push('Isi density & suhu sampel pengiriman terakhir (atau Hasil Density).')
      if (e.auditD15 === null) errs.push('Isi density & suhu sampel saat audit.')
    }
    if (code === TERA_ITEM) {
      const e = evalTera(a)
      if (!e.rows.length) errs.push('Data nozzle belum diisi di form Data SPBU.')
      else if (!e.testedCount) errs.push('Isi hasil tera minimal satu nozzle.')
      else if (!e.coverageOk && e.autoGrade !== 'F') errs.push(`Jumlah nozzle yang diperiksa belum memenuhi target ${e.level === 'excellent' ? '100%' : '50%'} per produk.`)
    }
    if (OPERATOR_ITEMS[code] && GUIDELINE[code] && GUIDELINE[code].pct) {
      const { ok, n } = pctValues(a, code)
      const okNum = parseAngka(ok)
      if (okNum !== null && n && okNum < n && !String((r.pct || {}).names || '').trim()) {
        errs.push(`Isi nama ${n - okNum} operator yang tidak memenuhi kriteria.`)
      }
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
  setResult(code, { submittedAt: Date.now() })
  try {
    await flushSave(a)
    showToast(`✓ Item ${code} tersimpan`)
  } catch (e) {
    showToast('Gagal menyimpan: ' + e.message)
  }
  rerenderCard(code)
}

/** Buka kembali item yang sudah disubmit agar bisa diubah. */
function editItem(code) {
  const a = curAudit()
  if (a.status === 'selesai') {
    if (!confirm('Laporan audit ini sudah disubmit. Mengedit item akan membuka kembali laporan (status kembali Draft). Lanjutkan?')) return
    a.status = 'draft'
  }
  setResult(code, { submittedAt: null })
  rerenderCard(code)
  showToast(`Item ${code} dapat diubah — tekan Submit lagi setelah selesai`, 2600)
}

/* ----- Submit data (laporan) ----- */
const iconFingerprint = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/><path d="M2 12a10 10 0 0 1 18-6"/><path d="M2 16h.01"/><path d="M21.8 16c.2-2 .131-5.354 0-6"/><path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/><path d="M8.65 22c.21-.66.45-1.32.57-2"/><path d="M9 6.8a6 6 0 0 1 9 5.2v2"/></svg>`
const iconUpload = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V4"/><path d="m7 9 5-5 5 5"/><path d="M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3"/></svg>`
const iconCheck = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>`

/** Status tombol Submit Data: 'todo' (masih ada item) | 'ready' (siap kirim) | 'done' (sudah terkirim). */
function submitState(a) {
  const comp = computeAudit(a)
  const left = comp.totalItems - comp.totalSubmitted
  if (left > 0) return { state: 'todo', left }
  return { state: a.status === 'selesai' ? 'done' : 'ready', left: 0 }
}

function submitDataBtnHtml() {
  const a = curAudit()
  if (!a) return ''
  const { state, left } = submitState(a)
  const icon = state === 'done' ? iconCheck : state === 'ready' ? iconFingerprint : iconUpload
  const title = state === 'done' ? 'Data sudah disubmit — lihat laporan' : state === 'ready' ? 'Semua item lengkap — submit data' : `${left} item belum disubmit`
  return `<button class="submit-data ${state}" data-action="submitdata" title="${title}" aria-label="${title}">
    <span class="sd-ico">${icon}</span><span class="sd-label">Submit Data</span>${state === 'todo' ? `<em class="sd-count">${left}</em>` : ''}</button>`
}

function reportFabHtml() {
  const a = curAudit()
  if (!a) return ''
  const { state } = submitState(a)
  if (state === 'todo') return ''
  if (state === 'done') {
    return `<button class="report-fab done" data-action="submitdata"><span class="fab-ico">${iconCheck}</span> Data tersubmit · Lihat Laporan</button>`
  }
  return `<button class="report-fab" data-action="submitdata"><span class="fab-ico">${iconFingerprint}</span> Submit Data</button>`
}

function jumpToItem(code) {
  const it = ITEM_BY_CODE[code]
  if (!it) return
  searchQuery = ''; pinaltiFilter = null; currentElementOpen = it.elCode
  render()
  const card = document.getElementById('item-' + it.code.replace(/\./g, '_'))
  if (card) { card.scrollIntoView({ block: 'center', behavior: 'smooth' }); card.classList.add('flash'); setTimeout(() => card.classList.remove('flash'), 1600) }
}

/** Klik tombol Submit Data: arahkan ke item berikutnya, jalankan submit, atau buka laporan. */
function onSubmitData() {
  const a = curAudit()
  const { state, left } = submitState(a)
  if (state === 'done') { go('report', { auditId: a.id }); return }
  if (state === 'ready') { submitReport(); return }
  const next = ALL_ITEMS.find((it) => !getResult(a, it.code).submittedAt)
  showToast(`Masih ${left} item belum disubmit — menuju ${next.code}`, 2600)
  jumpToItem(next.code)
}

function reportNumber(a) {
  const code = (a.id.replace(/[^a-z0-9]/gi, '').slice(-4) || '0000').toUpperCase()
  return `PW/${a.info.nomorSpbu || 'SPBU'}/${code}`
}

async function submitReport() {
  const a = curAudit()
  const comp = computeAudit(a)
  if (comp.totalSubmitted < comp.totalItems) { showToast('Masih ada item yang belum disubmit'); return }
  const root = document.getElementById('modalRoot')
  const wait = (ms) => new Promise((r) => setTimeout(r, ms))
  const steps = ['Memeriksa 125 item checklist', 'Menghitung Total Score & klasifikasi', 'Memvalidasi item pinalti', cloud.role ? 'Menyimpan & sinkron ke cloud' : 'Menyimpan di perangkat']

  // 1) Verifikasi sidik jari (motion referensi Stitch SPBU)
  root.innerHTML = `<div class="submit-overlay" role="alertdialog" aria-live="polite" aria-label="Submit data">
    <div class="bio-card" data-stage="scan">
      <div class="bio-ring"><span class="rip"></span><span class="rip r2"></span>
        <div class="bio-ico">${iconFingerprint}<span class="scanline"></span></div>
        <div class="bio-ok">${iconCheck}</div>
      </div>
      <div class="bio-title">Verifikasi Auditor</div>
      <div class="bio-sub">${esc(currentUserName() || 'Auditor')} &middot; SPBU ${esc(a.info.nomorSpbu || '-')}</div>
    </div>
  </div>`
  const overlay = root.querySelector('.submit-overlay')
  const bio = overlay.querySelector('.bio-card')
  try {
    await wait(1100)
    bio.dataset.stage = 'ok'
    if (navigator.vibrate) navigator.vibrate(18)
    await wait(650)

    // 2) Pop-up proses data
    bio.outerHTML = `<div class="submit-card">
      <div class="submit-ring"><svg viewBox="0 0 100 100"><circle class="track" cx="50" cy="50" r="44"/><circle class="bar" cx="50" cy="50" r="44"/></svg><div class="submit-check">${iconCheck}</div></div>
      <div class="submit-title">Memproses Data…</div>
      <ul class="submit-steps">${steps.map((t, k) => `<li data-step="${k}"><span class="dot"></span>${esc(t)}</li>`).join('')}</ul>
    </div>`
    const mark = (k, st) => { const li = overlay.querySelector(`[data-step="${k}"]`); if (li) li.className = st }
    mark(0, 'run'); await wait(500); mark(0, 'ok')
    mark(1, 'run'); await wait(500); mark(1, 'ok')
    mark(2, 'run'); await wait(420); mark(2, comp.failedPinalti.length ? 'warn' : 'ok')
    mark(3, 'run')
    a.status = 'selesai'
    a.reportSubmittedAt = Date.now()
    a.reportNo = a.reportNo || reportNumber(a)
    persist(a.id)
    await flushSave(a)
    let synced = false
    if (cloud.role && navigator.onLine) { await syncNow(); synced = !needsSync(a) }
    await wait(350)
    mark(3, synced || !cloud.role ? 'ok' : 'warn')
    overlay.classList.add('done')
    overlay.querySelector('.submit-title').textContent = 'Proses Selesai'
    await wait(900)

    // 3) Pop-up selesai + unduh PDF
    const badge = classificationBadge(comp.classification)
    const card = overlay.querySelector('.submit-card')
    card.outerHTML = `<div class="done-card">
      <div class="done-ico">${iconCheck}</div>
      <h3>Data Tersubmit!</h3>
      <p>Laporan audit SPBU ${esc(a.info.nomorSpbu || '-')} tersimpan${synced ? ' dan tersinkron ke cloud' : cloud.role ? ' di perangkat (sinkron otomatis saat online)' : ''}.</p>
      <div class="done-meta">
        <div><span>NO. REPORT</span><b>${esc(a.reportNo)}</b></div>
        <div><span>TOTAL SCORE</span><b>${comp.ts.toFixed(2)}</b></div>
        <div><span>HASIL</span><b style="color:${{ excellent: '#0050CB', good: '#047857' }[comp.classification] || '#BA1A1A'}">${esc(badge.text)}</b></div>
      </div>
      <button class="btn-primary done-pdf" data-action="donepdf">${iconUpload.replace('M12 15V4', 'M12 4v11').replace('m7 9 5-5 5 5', 'm7 10 5 5 5-5')} Unduh Laporan PDF</button>
      <button class="btn-secondary" data-action="doneview">Lihat Laporan</button>
    </div>`
  } catch (e) {
    closeModal()
    showToast('Gagal submit data: ' + e.message, 4000)
  }
}

/* ----- Photo ----- */
function cameraHelpHtml(err) {
  return `
    <h3>${iconCamera.replace('<svg', '<svg width="20" height="20" style="vertical-align:-4px;color:var(--primary)"')} Kamera tidak dapat dibuka</h3>
    <p class="modal-p">${esc(err && err.message ? err.message : 'Kamera tidak tersedia.')}</p>
    <ol class="modal-list">
      <li>Di browser, ketuk ikon gembok/pengaturan situs di address bar &rarr; <b>Izin</b> &rarr; <b>Kamera</b> &rarr; <b>Izinkan</b>.</li>
      <li>Tutup aplikasi lain yang sedang memakai kamera, lalu coba lagi.</li>
    </ol>
    <button class="btn-secondary" data-close>Tutup</button>`
}

async function takePhoto(label) {
  const a = curAudit()
  try {
    const auditor = currentUserName() || (a.info.auditors || []).find((x) => x) || ''
    const shot = await captureStampedPhoto({ label, spbu: a.info.nomorSpbu, auditor })
    if (!shot) return null
    return await storeNewPhoto(shot)
  } catch (err) {
    showModal(cameraHelpHtml(err))
    return null
  }
}

/** Pratinjau foto penuh + status keabsahan. key = "item|<code>|<idx>" atau "tenant|<id>|<field>|<idx>". */
async function openPhotoViewer(key) {
  const a = curAudit()
  const parts = key.split('|')
  let photo = null
  let caption = ''
  if (parts[0] === 'item') {
    photo = (getResult(a, parts[1]).photos || [])[+parts[2]]
    caption = `Item ${parts[1]}`
  } else if (parts[0] === 'tenant') {
    const tenant = (getResult(a, TENANT_ITEM).tenants || []).find((x) => x.id === parts[1])
    photo = tenant && (tenant[parts[2]] || [])[+parts[3]]
    caption = `${TENANT_ITEM} · ${tenant ? tenant.nama || 'Tenant' : ''} · ${parts[2] === 'fotoIzin' ? 'Izin Prinsip' : 'Tenant'}`
  } else if (parts[0] === 'id') {
    const hit = buildReport(a).photos.find((x) => x.photo && x.photo.id === parts[1])
    if (hit) { photo = hit.photo; caption = hit.caption }
  }
  if (!photo) return
  const root = document.getElementById('modalRoot')
  root.innerHTML = `<div class="viewer" data-viewer data-modal-overlay>
    <button class="viewer-x" data-close aria-label="Tutup">&times;</button>
    <img class="viewer-img" src="${thumbSrc(photo)}" alt="${esc(caption)}">
    <div class="viewer-meta">
      <b>${esc(caption)}</b>
      <span>${photo.source === 'gallery' ? 'Diunggah ' : ''}${photo.ts ? esc(formatStampTime(photo.ts)) : ''}${photo.auditor ? ' · ' + esc(photo.auditor) : ''}</span>
      ${photo.source === 'gallery'
        ? `<span>Dari galeri (tanpa timestamp kamera)${photo.fileDate ? ' · file ' + esc(formatStampTime(photo.fileDate)) : ''} <span class="verify-state" data-verify>memeriksa…</span></span>`
        : `<span>Kode verifikasi: <b class="mono">${esc(photo.code || '—')}</b> <span class="verify-state" data-verify>memeriksa…</span></span>`}
    </div>
  </div>`
  const img = root.querySelector('.viewer-img')
  fullUrl(photo).then((u) => { if (u) img.src = u })
  const blob = await photoBlob(photo).catch(() => null)
  const state = await verifyPhoto(photo, blob)
  const el = root.querySelector('[data-verify]')
  if (el) {
    el.className = 'verify-state ' + state
    el.textContent = state === 'valid' ? '✓ Asli, belum diubah' : state === 'changed' ? '✕ File berubah' : 'Foto lama (tanpa sidik digital)'
  }
}

/* =========================================================
   VIEW: REPORT (pratinjau isi PDF — src/lib/report.js)
   ========================================================= */
const LEVEL_COLOR = { Excellent: '#0066FF', Good: '#10B981', Average: '#00C2B8', Poor: '#F59E0B', Warning: '#EF4444' }

function reportTable(head, rows) {
  return `<div class="table-scroll"><table class="report-table"><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr>${rows.join('')}</table></div>`
}

function viewReport() {
  const a = curAudit()
  const R = buildReport(a)
  const comp = computeAudit(a)
  const badge = classificationBadge(comp.classification)
  const infoRows = (rows) => rows.map((r) => `<div class="kv"><span>${esc(r[0])}</span><b>${esc(r[1])}</b></div>${r[2] ? `<div class="kv"><span>${esc(r[2])}</span><b>${esc(r[3])}</b></div>` : ''}`).join('')

  const indikator = reportTable(['Indikator', 'Bobot', 'Min', 'Compliance', 'Skor'], [
    ...R.indikator.map((x) => `<tr><td>${esc(x.title)}</td><td>${x.weight}</td><td>${Math.round(x.min * 100)}%</td>
      <td><span class="chip" style="background:${LEVEL_COLOR[x.level]}">${fmtPct(x.pct)}</span></td><td>${fmtSkor(x.skor)}</td></tr>`),
    `<tr class="total-row"><td colspan="4">TOTAL SCORE</td><td>${R.totalScore.toFixed(2)}</td></tr>`,
  ])

  const subs = reportTable(['Elemen / Sub Elemen', 'Bobot', 'Compliance', 'Level'], R.subRows.map((row) => row.type === 'el'
    ? `<tr class="el-row"><td colspan="4">${esc(row.title)}</td></tr>`
    : `<tr><td style="padding-left:16px">${esc(row.title)}</td><td>${row.weight}</td><td>${fmtPct(row.pct)}</td>
        <td>${row.level === '-' ? '-' : `<span class="chip" style="background:${LEVEL_COLOR[row.level]}">${row.level}</span>`}</td></tr>`))

  const pinaltiHtml = comp.failedPinalti.length ? `
    <div class="card" style="border:1.5px solid var(--red);">
      <b style="color:var(--red);">&#9888; Item Pinalti Gagal (${comp.failedPinalti.length})</b>
      <ul class="komentar-list">${comp.failedPinalti.map((c) => `<li>${c} — ${esc(PINALTI_META[c].label)}</li>`).join('')}</ul>
    </div>` : ''

  const komentar = R.komentar.map((g) => `<div class="kom-group"><b>${esc(g.element)}</b>
    <ul class="komentar-list">${g.rows.map((r) => `<li><span class="mono">${esc(r[0])}</span> ${esc(r[1])}</li>`).join('')}</ul></div>`).join('')

  const qq = R.qq.length ? reportTable(['Nozzle', 'Produk', 'Mode', 'Tera (ml)', 'Qty Var', 'Obs', 'Temp', 'D15', 'Ref D15', 'Var'],
    R.qq.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`)) : '<p class="hint">Belum ada data nozzle.</p>'

  const photoHtml = R.photos.length ? `
    <div class="section-title">Dokumentasi Foto (${R.photos.length})</div>
    <div class="card"><div class="report-photo-grid">
      ${R.photos.map(({ photo: p, caption }) => `<div data-viewphoto="id|${esc(p.id || '')}"><img src="${thumbSrc(p)}" data-full="${esc(p.id || '')}" alt=""><div class="cap">${esc(caption)}${p && p.source === 'gallery' ? '<br>Galeri' : `${p && p.ts ? `<br>${esc(formatStampTime(p.ts))}` : ''}${p && p.code ? `<br>Kode ${esc(p.code)}` : ''}`}</div></div>`).join('')}
    </div></div>` : ''

  return `
  <div id="reportContent">
  <div class="report-head">
    <div class="rh-title">${esc(R.title)}</div>
    <div class="rh-sub">${esc(R.unit)} &middot; No. Report <span class="mono">${esc(R.reportNo)}</span></div>
  </div>

  <div class="score-hero" style="background:${badge.bg};">
    <div class="num">${comp.ts.toFixed(2)}</div>
    <div class="cls">${esc(R.clsText)}</div>
    <div class="sub">${comp.totalSubmitted}/${comp.totalItems} item tersubmit${a.status === 'selesai' ? ' &middot; laporan terkirim' : ' &middot; draft'}</div>
  </div>

  ${R.reasons.length ? `<div class="card" style="border:1.5px solid var(--red);">
    <b style="color:var(--red);">Alasan Belum Lulus</b>
    <ul class="komentar-list">${R.reasons.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
  </div>` : ''}
  ${pinaltiHtml}

  <div class="section-title">Informasi SPBU</div>
  <div class="card kv-grid">${infoRows(R.infoSpbu)}</div>
  <div class="section-title">Informasi Kegiatan Audit</div>
  <div class="card kv-grid">${infoRows(R.infoAudit.filter((r) => r[0] || r[2]))}</div>

  <div class="section-title">Ringkasan Indikator Penilaian</div>
  <div class="card">${indikator}<p class="hint" style="margin-top:6px">Skor = Bobot Nilai &times; Compliance %.</p></div>

  <div class="section-title">Rincian Sub-Elemen</div>
  <div class="card">${subs}</div>

  <div class="section-title">Pengecekan Q&amp;Q</div>
  <div class="card">${qq}<p class="hint" style="margin-top:6px">Mode P = Preset, M = Manual &middot; batas tera ${TERA_LIMIT_ML} ml/20 L &middot; toleransi density &plusmn;0,003.</p></div>

  <div class="section-title">Komentar Auditor</div>
  <div class="card">${komentar}</div>

  <div class="section-title">Komentar Manajer SPBU</div>
  <div class="card">
    <div class="field" style="margin:0"><textarea data-info="komentarManajer" rows="3" placeholder="Opsional — tanggapan manajer SPBU atas hasil audit">${esc(a.info.komentarManajer || '')}</textarea></div>
  </div>

  ${photoHtml}
  </div>

  <button class="btn-primary pdf-btn" data-action="pdf">Unduh Laporan PDF (A4)</button>
  <p class="hint" style="text-align:center;margin-top:8px;">Format mengikuti laporan Excel: Ringkasan, Detail Checklist, Komentar Auditor, Pengecekan Q&amp;Q, lampiran foto.</p>`
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
   EXPORT PDF (A4, vektor)
   ========================================================= */
/** Muat foto penuh sebagai JPEG dataURL (maks 900 px agar PDF tetap ringan). */
async function loadPhotoForPdf(p) {
  const blob = await photoBlob(p)
  const src = blob ? URL.createObjectURL(blob) : thumbSrc(p)
  try {
    const img = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src })
    const scale = Math.min(1, 900 / Math.max(img.naturalWidth, img.naturalHeight))
    const c = document.createElement('canvas')
    c.width = Math.round(img.naturalWidth * scale)
    c.height = Math.round(img.naturalHeight * scale)
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
    return { data: c.toDataURL('image/jpeg', 0.72), w: c.width, h: c.height }
  } finally {
    if (blob) URL.revokeObjectURL(src)
  }
}

async function exportPDF() {
  const a = curAudit()
  if (!a) return
  showToast('Menyiapkan PDF A4…', 15000)
  try {
    const { createReportPdf } = await import('./lib/pdf.js')
    const R = buildReport(a)
    const doc = await createReportPdf(R, { loadPhoto: loadPhotoForPdf })
    doc.save(R.fileName)
    showToast(`✓ PDF ${doc.getNumberOfPages()} halaman diunduh`)
  } catch (e) {
    console.error(e)
    showToast('Gagal membuat PDF: ' + e.message, 4000)
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
      <li>Tekan <b>+ Mulai Audit SPBU Baru</b>, isi data SPBU, <b>auditor</b> (boleh lebih dari satu), <b>jumlah operator per shift</b> (Shift 1–3 &amp; OFF) dan <b>shift yang bertugas saat audit</b>.</li>
      <li>Isi <b>jumlah nozzle</b> &rarr; tekan <b>Submit</b> &rarr; pilih nomor &amp; produk tiap nozzle.</li>
      <li>Periksa <b>Dashboard Item Pinalti</b> lebih dahulu bila perlu, atau langsung buka checklist lengkap.</li>
      <li>Gunakan kolom <b>Cari</b> (cth. “APAR”) untuk menemukan item sesuai area yang sedang diperiksa.</li>
      <li>Item operator: jumlah sampel terisi otomatis dari operator yang bertugas — cukup isi jumlah yang sesuai (dan nama operator yang tidak sesuai).</li>
      <li>Beri nilai, ambil foto (kamera langsung, pratinjau dulu, tercap tanggal-jam &amp; <b>kode verifikasi</b>), lalu tekan <b>Submit</b>. Item terkunci; tekan <b>Edit</b> untuk mengubah.</li>
      <li>Item density (2.2.f–2.2.l) menghitung <b>Hasil density</b> @15°C otomatis dengan Tabel ASTM 53 dan membandingkan dengan pengiriman terakhir (±0,003).</li>
      <li>Item 2.2.m: tera bejana 20 L per nozzle, mode <b>P</b> (Preset) / <b>M</b> (Manual), batas −60 ml.</li>
      <li>Item 5.2.f diisi daftar <b>tenant</b> + foto tenant + foto izin prinsip berlaku.</li>
      <li>Setelah semua item tersubmit, tekan <b>Submit Laporan</b>.</li>
      <li>Buka <b>Laporan</b> untuk hasil akhir, lalu unduh <b>PDF A4</b>.</li>
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
    Sumber rumus: SIMULASI_AUDIT_TERBARU_INTERTEK.xlsx &amp; Item_Pinalti_Pasti_Pas.pdf &middot; Tabel ASTM 53 dari aplikasi PANTAS<br>Data tersimpan otomatis di perangkat ini dan tersinkron ke cloud tim.
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
  if (!cloud.mod || !cloud.session) return ''
  if (!cloud.role) return `${iconCloud} Tidak dapat memeriksa akun`
  const pend = pendingCount()
  if (cloud.status === 'syncing') return `${iconCloud} Menyinkronkan…`
  if (cloud.status === 'offline') return `${iconCloud} Offline &middot; ${pend} audit menunggu sinkron`
  if (cloud.status === 'error') return `${iconCloud} <span style="color:var(--status-warning)">Gagal sinkron</span> &middot; ${pend} menunggu`
  return `${iconCloud} ${pend ? `${pend} audit menunggu sinkron` : 'Semua audit tersinkron ke cloud'}${cloud.lastSync ? ' &middot; ' + fmtTime(cloud.lastSync) : ''}`
}

function refreshCloudUi() {
  document.querySelectorAll('.cloud-line').forEach((el) => { el.innerHTML = cloudLineHtml() })
  const landingShown = document.body.classList.contains('landing-mode')
  const landingNeeded = !cloud.ready || !cloud.session
  if (landingShown !== landingNeeded) {
    if (!landingNeeded && !['home', 'history', 'about', 'account'].includes(currentView)) currentView = 'home'
    render()
    return
  }
  if (landingNeeded || currentView === 'account') {
    // Pertahankan isian form & fokus saat tab Cloud diperbarui (mis. setelah rekap selesai dimuat)
    const keyOf = (el) => el.id || (el.form && el.form.id && el.name ? `${el.form.id}:${el.name}` : '')
    const saved = new Map()
    document.querySelectorAll('#content input, #content select').forEach((el) => { const k = keyOf(el); if (k && el.type !== 'password') saved.set(k, el.value) })
    const active = document.activeElement && keyOf(document.activeElement)
    const y = window.scrollY
    render()
    document.querySelectorAll('#content input, #content select').forEach((el) => {
      const k = keyOf(el)
      if (k && saved.has(k) && !el.value) el.value = saved.get(k)
      if (k && k === active) el.focus()
    })
    window.scrollTo(0, y)
  }
}

async function initCloud() {
  try {
    cloud.mod = await import('./lib/cloud.js')
  } catch (e) {
    console.warn('Modul cloud gagal dimuat', e)
    cloud.loadError = 'Modul login gagal dimuat. Periksa koneksi lalu muat ulang halaman.'
    cloud.ready = true
    render()
    return
  }
  cloud.mod.onAuthChange((session) => {
    const changed = (session && session.user && session.user.id) !== (cloud.session && cloud.session.user && cloud.session.user.id)
    cloud.session = session
    if (changed) refreshRole()
  })
  await connectCloud()
  cloud.ready = true
  render()
}

/** (Ulang) sambungkan ke API cloud sesuai konfigurasi saat ini. */
async function connectCloud() {
  cloud.message = ''
  cloud.enabled = cloud.mod.isConfigured()
  cloud.session = cloud.enabled ? await cloud.mod.getSession() : null
  cloud.needsSetup = false
  if (cloud.enabled && !cloud.session && navigator.onLine) {
    try { cloud.needsSetup = (await cloud.mod.health()).needsSetup } catch (e) { cloud.message = e.message }
  }
  await refreshRole()
}

async function refreshRole() {
  cloud.role = null
  cloud.remote = null
  cloud.members = null
  if (cloud.session && navigator.onLine) {
    try {
      cloud.role = await cloud.mod.claimRole()
    } catch (e) {
      cloud.message = e.message
      cloud.session = await cloud.mod.getSession()
    }
  } else if (cloud.session) {
    cloud.role = cloud.session.user && cloud.session.user.role // offline: pakai peran tersimpan
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

/** Animasi morphing logo di landing page selama proses login. */
function logoMorph(state) {
  const land = document.querySelector('.landing')
  if (!land) return
  land.classList.remove('morphing', 'morph-out', 'morph-fail')
  if (state) { void land.offsetWidth; land.classList.add(state) }
}

async function cloudLogin(form) {
  const email = form.email.value
  const password = form.password.value
  const btn = form.querySelector('button[type=submit]')
  btn.disabled = true
  btn.textContent = 'Memverifikasi…'
  logoMorph('morphing')
  const started = Date.now()
  try {
    await cloud.mod.signIn(email, password)
    // biarkan morph berjalan minimal satu siklus agar terlihat
    await new Promise((r) => setTimeout(r, Math.max(0, 1300 - (Date.now() - started))))
    logoMorph('morph-out')
    await new Promise((r) => setTimeout(r, 700))
    cloud.session = await cloud.mod.getSession()
    await refreshRole()
    showToast(`Masuk sebagai ${cloud.role || 'anggota'}`, 3000)
  } catch (e) {
    logoMorph('morph-fail')
    showToast(e.message, 4000)
    btn.disabled = false
    btn.textContent = 'Masuk'
  }
}

async function cloudSetup(form) {
  const btn = form.querySelector('button')
  btn.disabled = true
  try {
    await cloud.mod.setupAdmin(form.setupToken.value.trim(), form.email.value, form.nama.value, form.password.value)
    cloud.session = await cloud.mod.getSession()
    cloud.needsSetup = false
    await refreshRole()
    showToast('✓ Admin pertama dibuat', 3000)
  } catch (e) {
    showToast(e.message, 4500)
    btn.disabled = false
  }
}

async function saveApiUrl(form) {
  try {
    cloud.mod.setApiBase(form.apiUrl.value)
    await connectCloud()
    if (cloud.enabled && !cloud.message) showToast('✓ Terhubung ke API cloud')
    else if (cloud.message) showToast(cloud.message, 4500)
  } catch (e) {
    showToast(e.message, 4000)
  }
}

async function changePwFromForm(form) {
  if (form.newPw.value !== form.newPw2.value) { showToast('Konfirmasi password baru tidak sama'); return }
  try {
    await cloud.mod.changePassword(form.oldPw.value, form.newPw.value)
    form.reset()
    showToast('✓ Password diganti')
  } catch (e) {
    showToast(e.message, 4000)
  }
}

async function cloudLogout() {
  if (pendingCount() && !confirm(`${pendingCount()} audit belum tersinkron. Tetap keluar? (data tetap aman di perangkat ini)`)) return
  await cloud.mod.signOut()
  cloud.session = null
  currentView = 'home'
  await refreshRole()
}

async function loadRemote() {
  if (!cloud.role) return
  cloud.remoteLoading = true
  cloud.remoteError = ''
  refreshCloudUi()
  try {
    cloud.remote = await cloud.mod.listRemote()
    if (cloud.role === 'admin') {
      cloud.members = await cloud.mod.listMembers()
      cloud.usage = await cloud.mod.usage().catch(() => null)
    }
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
  const password = document.getElementById('mPass').value
  if (!email.trim()) { showToast('Isi email anggota'); return }
  try {
    await cloud.mod.addMember(email, nama, role, password)
    ;['mPass', 'mEmail', 'mNama'].forEach((k) => { document.getElementById(k).value = '' })
    showToast(password ? '✓ Anggota disimpan. Berikan password awal ke anggota tersebut.' : '✓ Anggota diperbarui', 4000)
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
  const rows = (cloud.remote || []).filter((r) => !q || [r.nomor_spbu, r.kota, r.summary && r.summary.areaBusinessHead, r.summary && r.summary.auditorEmail, r.created_by_email].join(' ').toLowerCase().includes(q))
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
        <div class="sub">${esc(sm.auditorEmail || r.created_by_email || '')} <span class="pill ${r.status}">${r.status === 'selesai' ? 'Selesai' : 'Draft'}</span></div>
      </div>
      ${badge}
    </div>`
  }).join('')
}

/* ----- Landing page login (aplikasi hanya bisa dipakai setelah login) ----- */
function viewLanding() {
  const apiEditable = cloud.mod && !cloud.mod.apiFromEnv()
  const serverBox = cloud.mod ? `
    <details class="landing-server">
      <summary>Pengaturan server</summary>
      <form id="apiForm">
        <div class="field"><label>Alamat API</label><input name="apiUrl" type="url" inputmode="url" value="${esc(cloud.mod.apiBase())}" placeholder="https://…workers.dev" required ${apiEditable ? '' : 'disabled'}></div>
        ${apiEditable ? '<button class="btn-secondary" type="submit">Simpan Alamat</button>' : '<p class="hint">Alamat API diatur oleh aplikasi.</p>'}
      </form>
    </details>` : ''
  const msg = cloud.loadError || cloud.message
  let form
  if (cloud.needsSetup) {
    form = `
      <h2>Buat Admin Pertama</h2>
      <p class="landing-p">Server masih kosong. Isi <b>kode setup</b> = nilai rahasia <code>SETUP_TOKEN</code> di Worker Cloudflare.</p>
      <form id="setupForm" autocomplete="on">
        <div class="field"><label>Kode setup</label><input name="setupToken" required autocomplete="off"></div>
        <div class="field"><label>Nama</label><input name="nama" autocomplete="name"></div>
        <div class="field"><label>Email</label><input name="email" type="email" autocomplete="username" required></div>
        <div class="field"><label>Password (min. 8 karakter)</label><input name="password" type="password" autocomplete="new-password" minlength="8" required></div>
        <button class="btn-primary" type="submit">Buat Admin &amp; Masuk</button>
      </form>`
  } else {
    form = `
      <h2>Masuk</h2>
      <p class="landing-p">Gunakan akun yang dibuat admin audit.</p>
      <form id="loginForm" autocomplete="on">
        <div class="field"><label>Email</label><input name="email" type="email" autocomplete="username" required></div>
        <div class="field pw-field"><label>Password</label><input name="password" type="password" autocomplete="current-password" required><button type="button" class="pw-eye" data-action="togglepw" aria-label="Tampilkan password">Lihat</button></div>
        <button class="btn-primary" type="submit">Masuk</button>
      </form>
      ${navigator.onLine ? '' : '<p class="landing-warn">Tidak ada koneksi internet. Login pertama kali memerlukan internet; setelah itu aplikasi bisa dipakai offline.</p>'}`
  }
  return `
  <div class="landing">
    <div class="landing-hero">
      <div class="brand-logo full">${LOGO_FULL}</div>
      <p>Region VI Jatimbalinus &middot; Pertamina Way</p>
    </div>
    <div class="landing-card">
      ${form}
      ${msg ? `<p class="landing-warn">${esc(msg)}</p>` : ''}
      ${serverBox}
    </div>
    <p class="landing-foot">Akses khusus tim audit &middot; data tersimpan di perangkat &amp; cloud tim</p>
    <p class="landing-copy">&copy; ${new Date().getFullYear()} ${APP_NAME} &middot; Created by <b>Ariandi Alnotri</b></p>
  </div>`
}

/* ----- Tab Akun: status sinkron, rekap, anggota, password ----- */
function viewAccount() {
  const email = esc(cloud.session.user && cloud.session.user.email)
  const nama = esc(currentUserName() || '')
  if (!cloud.role) {
    return `
    <div class="card">
      <b>${nama || email}</b>
      <p class="hint">Tidak dapat memeriksa akun.${cloud.message ? `<br><span style="color:var(--status-warning)">${esc(cloud.message)}</span>` : ''}</p>
      <button class="btn-secondary" data-action="logout">Keluar</button>
    </div>`
  }
  if (!cloud.remote && !cloud.remoteLoading && !cloud.remoteError && navigator.onLine) setTimeout(loadRemote, 0)
  const pend = pendingCount()
  const u = cloud.usage
  const usageHtml = cloud.role === 'admin' && u ? (() => {
    const pct = Math.min(100, (u.photos.bytes / u.limitBytes) * 100)
    const mb = (b) => (b / 1024 / 1024).toLocaleString('id-ID', { maximumFractionDigits: 1 })
    return `<div class="section-title">Kapasitas Penyimpanan (admin)</div>
    <div class="card">
      <div class="link-row"><span class="l">Penyimpanan foto</span><span class="v">${u.storage === 'r2' ? 'R2' : 'D1 (tanpa R2)'}</span></div>
      <div class="link-row"><span class="l">Foto tersimpan</span><span class="v">${u.photos.count} · ${mb(u.photos.bytes)} MB</span></div>
      <div class="link-row"><span class="l">Audit · Anggota</span><span class="v">${u.audits} · ${u.users}</span></div>
      <div class="progress-track" style="margin-top:8px"><div class="progress-fill" style="width:${pct}%;${pct > 80 ? 'background:var(--status-warning)' : ''}"></div></div>
      <p class="hint" style="margin-top:6px">${pct.toFixed(1)}% dari kuota gratis ±${u.storage === 'r2' ? '10 GB' : '500 MB'}${pct > 80 ? ' — hampir penuh: hapus audit lama yang sudah selesai (sudah ada di PDF) atau aktifkan R2.' : ''}</p>
    </div>`
  })() : ''
  const membersHtml = cloud.role === 'admin' ? `
    <div class="section-title">Anggota (admin)</div>
    <div class="card">
      ${(cloud.members || []).map((m) => `<div class="link-row"><span class="l">${esc(m.nama || m.email)}<br><small class="hint">${esc(m.email)}</small></span><span class="v">${m.role}${m.user_id !== cloud.session.user.id ? ` <button class="link-danger" data-rmmember="${m.user_id}">hapus</button>` : ''}</span></div>`).join('') || '<p class="hint">Memuat…</p>'}
      <div class="calc-sec" style="margin-top:12px;">Tambah anggota</div>
      <div class="field"><label>Email</label><input id="mEmail" type="email"></div>
      <div class="field-row">
        <div class="field"><label>Nama</label><input id="mNama"></div>
        <div class="field"><label>Peran</label><select id="mRole"><option value="auditor">Auditor</option><option value="admin">Admin</option></select></div>
      </div>
      <div class="field"><label>Password awal (min. 8) — isi juga untuk reset password</label><input id="mPass" type="text" autocomplete="off"></div>
      <button class="btn-secondary" data-action="addmember">Simpan Anggota</button>
      <p class="hint" style="margin-top:8px;">Email yang sudah terdaftar akan diperbarui (nama/peran); bila password diisi, password direset dan akun dibuka dari kunci.</p>
    </div>` : ''
  return `
  <div class="card account-card">
    <div class="account-head">
      <div class="avatar">${esc(((currentUserName() || cloud.session.user.email || '?').trim()[0] || '?').toUpperCase())}</div>
      <div><b>${nama || email}</b><div class="hint">${email} &middot; ${cloud.role === 'admin' ? 'Admin' : 'Auditor'}</div></div>
    </div>
    <div class="link-row"><span class="l">Status sinkron</span><span class="v">${cloud.status === 'syncing' ? 'Menyinkronkan…' : cloud.status === 'offline' ? 'Offline' : cloud.status === 'error' ? 'Gagal' : 'Siap'}</span></div>
    <div class="link-row"><span class="l">Menunggu sinkron</span><span class="v">${pend} audit</span></div>
    <div class="link-row"><span class="l">Sinkron terakhir</span><span class="v">${cloud.lastSync ? fmtDate(cloud.lastSync) + ' ' + fmtTime(cloud.lastSync) : '-'}</span></div>
    ${cloud.status === 'error' && cloud.message ? `<p class="hint" style="color:var(--status-warning)">${esc(cloud.message)}</p>` : ''}
    <button class="btn-primary" data-action="syncnow" style="margin-top:10px;">Sinkronkan Sekarang</button>
    <div style="height:8px"></div>
    <button class="btn-secondary" data-action="logout">Keluar</button>
    <details class="crit" style="margin-top:12px;"><summary>Ganti password</summary>
      <form id="pwForm" style="margin-top:8px;">
        <div class="field"><label>Password lama</label><input name="oldPw" type="password" autocomplete="current-password" required></div>
        <div class="field"><label>Password baru (min. 8)</label><input name="newPw" type="password" autocomplete="new-password" minlength="8" required></div>
        <div class="field"><label>Ulangi password baru</label><input name="newPw2" type="password" autocomplete="new-password" required></div>
        <button class="btn-secondary" type="submit">Simpan Password</button>
      </form>
    </details>
  </div>

  <div class="section-title" style="display:flex;justify-content:space-between;align-items:center;">Rekap Audit Semua SPBU <button class="btn-mini ghost" data-action="loadremote">Muat ulang</button></div>
  <div class="card">
    <div class="field" style="margin-bottom:8px;"><input id="remoteFilter" placeholder="Filter SPBU / kota / auditor" value="${esc(cloud.remoteFilter)}"></div>
    ${cloud.remoteLoading ? '<p class="hint">Memuat…</p>' : cloud.remoteError ? `<p class="hint" style="color:var(--status-warning)">${esc(cloud.remoteError)}</p>` : `<div id="remoteList">${remoteListHtml()}</div>`}
  </div>
  ${usageHtml}
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
    else if (action === 'addauditor') {
      const a = curAudit()
      a.info.auditors = (a.info.auditors || []).concat([''])
      persist(a.id)
      render()
      const inputs = document.querySelectorAll('[data-auditor]')
      if (inputs.length) inputs[inputs.length - 1].focus()
    }
    else if (action === 'nozzlesubmit') {
      const inp = document.getElementById('nozzleCount')
      const n = parseInt(inp && inp.value, 10)
      if (!n || n < 1) { showToast('Isi jumlah nozzle (minimal 1)'); return }
      const a = curAudit()
      if (n < a.info.nozzles.length && !confirm(`Kurangi nozzle dari ${a.info.nozzles.length} menjadi ${n}? Data tera nozzle yang dihapus ikut hilang.`)) return
      nozzleDraft = null
      resizeNozzles(n)
      showToast(`✓ ${n} nozzle — pilih nomor & produk tiap nozzle`)
    }
    else if (action === 'submitdata') onSubmitData()
    else if (action === 'donepdf') { closeModal(); go('report', { auditId: currentAuditId }); exportPDF() }
    else if (action === 'doneview') { closeModal(); go('report', { auditId: currentAuditId }) }
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
    else if (action === 'syncnow') syncNow(true)
    else if (action === 'togglepw') {
      const inp = t.closest('.pw-field').querySelector('input')
      inp.type = inp.type === 'password' ? 'text' : 'password'
      t.closest('[data-action]').textContent = inp.type === 'password' ? 'Lihat' : 'Tutup'
    }
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
  if (jump) { jumpToItem(jump.dataset.jump); return }

  const viewPhoto = t.closest('[data-viewphoto]')
  if (viewPhoto) { openPhotoViewer(viewPhoto.dataset.viewphoto); return }

  const rmAuditor = t.closest('[data-rmauditor]')
  if (rmAuditor) {
    const a = curAudit()
    a.info.auditors.splice(+rmAuditor.dataset.rmauditor, 1)
    persist(a.id)
    render()
    return
  }

  const shiftChip = t.closest('[data-shiftaudit]')
  if (shiftChip) {
    const a = curAudit()
    const id = shiftChip.dataset.shiftaudit
    const list = a.info.shiftAudit || (a.info.shiftAudit = [])
    const k = list.indexOf(id)
    if (k >= 0) list.splice(k, 1); else list.push(id)
    persist(a.id)
    shiftChip.classList.toggle('on', k < 0)
    springPop(shiftChip)
    const sum = document.getElementById('opSummary')
    if (sum) sum.innerHTML = operatorSummaryHtml(a)
    return
  }

  const teraMode = t.closest('[data-teramode]')
  if (teraMode) {
    if (isLocked(TERA_ITEM)) return
    const [nid, mode] = teraMode.dataset.teramode.split('|')
    const r = getResult(curAudit(), TERA_ITEM)
    setResult(TERA_ITEM, { teraMode: { ...(r.teraMode || {}), [nid]: mode } })
    teraMode.parentElement.querySelectorAll('.pm').forEach((b) => b.classList.toggle('on', b === teraMode))
    return
  }

  const editBtn = t.closest('[data-edit]')
  if (editBtn) { editItem(editBtn.dataset.edit); return }

  const gradeBtn = t.closest('.grade-btn')
  if (gradeBtn) {
    const code = gradeBtn.dataset.code
    if (isLocked(code)) return
    const g = gradeBtn.dataset.grade
    const r = getResult(curAudit(), code)
    setResult(code, { grade: r.grade === g ? null : g })
    patchItem(code)
    const sel = document.querySelector(`[data-code="${code}"][data-grade="${g}"]`)
    if (sel && r.grade !== g) springPop(sel)
    return
  }

  const submit = t.closest('[data-submit]')
  if (submit) { submitItem(submit.dataset.submit); return }

  const noteT = t.closest('[data-notetoggle]')
  if (noteT) {
    const code = noteT.dataset.notetoggle
    if (isLocked(code)) return
    if (noteOpenSet.has(code)) noteOpenSet.delete(code); else noteOpenSet.add(code)
    render()
    return
  }

  const galBtn = t.closest('[data-gallery]')
  if (galBtn) {
    const parts = galBtn.dataset.gallery.split('|')
    const a = curAudit()
    if (parts[0] === 'item' && isLocked(parts[1])) return
    if (parts[0] === 'tenant' && tenantLocked(a)) return
    const auditor = currentUserName() || (a.info.auditors || []).find((x) => x) || ''
    // pemilih file harus dibuka langsung di handler klik
    pickGalleryPhotos({ auditor }).then(async (shots) => {
      if (!shots.length) return
      const photos = []
      for (const shot of shots) photos.push(await storeNewPhoto(shot))
      if (parts[0] === 'item') {
        const r = getResult(curAudit(), parts[1])
        setResult(parts[1], { photos: (r.photos || []).concat(photos) })
      } else {
        const tenant = (getResult(curAudit(), TENANT_ITEM).tenants || []).find((x) => x.id === parts[1])
        if (!tenant) return
        tenant[parts[2]] = (tenant[parts[2]] || []).concat(photos)
        setResult(TENANT_ITEM, { tenants: getResult(curAudit(), TENANT_ITEM).tenants })
        applyAutoGrade(TENANT_ITEM)
      }
      showToast(`${photos.length} foto galeri ditambahkan`)
      render()
    })
    return
  }

  const photoBtn = t.closest('[data-photo]')
  if (photoBtn) {
    const code = photoBtn.dataset.photo
    if (isLocked(code)) return
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
    if (isLocked(code)) return
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
    return
  }

  if (t.dataset.auditor !== undefined) {
    const a = curAudit()
    a.info.auditors[+t.dataset.auditor] = t.value
    persist(a.id)
    return
  }

  if (t.dataset.op) {
    const a = curAudit()
    a.info.operators[t.dataset.op] = t.value
    persist(a.id)
    const sum = document.getElementById('opSummary')
    if (sum) sum.innerHTML = operatorSummaryHtml(a)
    return
  }

  if (t.id === 'nozzleCount') {
    nozzleDraft = t.value
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

  if (t.dataset.pct) {
    const code = t.dataset.pct
    const r = getResult(curAudit(), code)
    setResult(code, { pct: { ...(r.pct || {}), [t.dataset.pf]: t.value } })
    applyAutoGrade(code)
    patchItem(code)
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
  app.addEventListener('toggle', (ev) => {
    const d = ev.target
    if (d.dataset && d.dataset.critdetails) {
      if (d.open) critOpenSet.add(d.dataset.critdetails); else critOpenSet.delete(d.dataset.critdetails)
    }
  }, true)
  document.getElementById('modalRoot').addEventListener('click', onClick)
  document.addEventListener('pointerdown', addRipple, { passive: true })
  app.addEventListener('submit', (ev) => {
    const id = ev.target.id
    if (['loginForm', 'setupForm', 'apiForm', 'pwForm'].includes(id)) ev.preventDefault()
    if (id === 'loginForm') cloudLogin(ev.target)
    if (id === 'setupForm') cloudSetup(ev.target)
    if (id === 'apiForm') saveApiUrl(ev.target)
    if (id === 'pwForm') changePwFromForm(ev.target)
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
  initCloud()
  migrateOldPhotos()
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
