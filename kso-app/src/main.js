import './styles.css';
import { loadState, saveState, flushState, putFile, getFile, deleteFile, allFiles, emptyState } from './lib/store.js';
import { normalizePhone, fillTemplate, waLink, displayPhone, greeting, DEFAULT_TEMPLATES, PLACEHOLDERS } from './lib/wa.js';
import {
  MILESTONES, STATUS, GRADING, JENIS_AKTIVITAS, KATEGORI_MATERI, todayISO, plusDaysISO, isISODate, daysUntil, fmtNomor, parseNum,
  msFilled, stageIdx, stageLabel, nextMilestone, effectiveStatus, isActive, planOverdue, followupState, relDay, isStagnant,
  summary, sortTargets, uid, toCsv,
} from './lib/pipeline.js';
import { fmtDate, fmtDateTime, fmtNum, fmtSize, esc } from './lib/format.js';

const app = document.getElementById('app');
let S = emptyState();
const ui = { q: '', f: { status: 'aktif', tahap: '', prio: '', kota: '', grading: '' }, sort: 'prioritas', materiKat: '' };

const templates = () => S.templates || DEFAULT_TEMPLATES;
const byId = id => S.targets.find(t => t.id === id);
const materiById = id => S.materi.find(m => m.id === id);
const persist = () => saveState(S);
const now = () => new Date();
const STATUS_ALL = { ...STATUS, golive: { label: 'Go Live', band: 'good' } };

// ---------- ikon ----------
const I = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5M8 7h7"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  back: '<path d="M15 18l-6-6 6-6"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  file: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8zM14 3v5h5"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
  share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
  check: '<path d="M5 12l5 5L20 7"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
};
const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${I[n]}</svg>`;
const WA_SVG = '<svg class="ic wa" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3zM12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.8 9.8 0 1 1 12 21.8zm8.4-18.2A11.8 11.8 0 0 0 1.7 17.8L0 24l6.3-1.7a11.8 11.8 0 0 0 5.7 1.5c6.5 0 11.8-5.3 11.8-11.8 0-3.2-1.2-6.1-3.4-8.4z"/></svg>';

// ---------- router ----------
const route = () => (location.hash.replace(/^#\/?/, '') || 'home').split('/');
const go = h => { location.hash = '#/' + h; };
window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });

const TABS = [['home', 'Beranda', 'home'], ['target', 'Target', 'target'], ['materi', 'Materi', 'book'], ['atur', 'Atur', 'gear']];
function shell(title, sub, body, { back = '', actions = '' } = {}) {
  const r = route()[0];
  return `
  <header class="topbar">
    ${back ? `<a class="icon-btn" href="#/${back}" aria-label="Kembali">${icon('back')}</a>` : '<img class="brand" src="/favicon.svg" alt="">'}
    <div class="tb-text"><h1>${esc(title)}</h1>${sub ? `<p>${esc(sub)}</p>` : ''}</div>
    <div class="tb-act">${actions}</div>
  </header>
  <main class="content">${body}</main>
  <nav class="dock">${TABS.map(([k, l, ic]) => `<a href="#/${k}" class="${r === k || (k === 'target' && r === 't') ? 'on' : ''}">${icon(ic)}<span>${l}</span></a>`).join('')}</nav>`;
}

function render() {
  const [r, id] = route();
  if (r === 'target') app.innerHTML = viewList();
  else if (r === 't' && byId(id)) app.innerHTML = viewDetail(byId(id));
  else if (r === 'materi') app.innerHTML = viewMateri();
  else if (r === 'atur') app.innerHTML = viewSettings();
  else app.innerHTML = viewHome();
}

// ---------- komponen ----------
const pill = (text, band) => `<span class="pill ${band}">${esc(text)}</span>`;
const statusPill = t => { const s = STATUS_ALL[effectiveStatus(t)]; return pill(s.label, s.band); };
const empty = (t, btn = '') => `<div class="empty"><p>${t}</p>${btn}</div>`;
const waBtn = (attrs, label = 'WA', cls = '') => `<button class="btn wa-btn ${cls}" ${attrs}>${WA_SVG}<span>${label}</span></button>`;
const msText = v => (isISODate(v) ? fmtDate(v) : v === 'done' ? 'Selesai' : v || '');
const prioTag = t => (t.prioritas ? `<span class="prio p${Math.min(5, t.prioritas)}">P${t.prioritas}</span>` : '');
const title = t => `SPBU ${fmtNomor(t.nomor)}`;

function steps(t, interactive = false) {
  const idx = stageIdx(t);
  return `<div class="steps-bar ${interactive ? 'big' : ''}">${MILESTONES.map((m, i) => {
    const v = t.ms?.[m.key];
    const done = msFilled(v);
    const planned = m.key === 'plan' && isISODate(v) && daysUntil(v, now()) >= 0 && !msFilled(t.ms?.sosialisasi);
    const cls = done ? (planned ? 'planned' : 'done') : i === idx + 1 && isActive(t) ? 'next' : '';
    const inner = `<span class="st-dot">${done && !planned ? icon('check') : i + 1}</span><span class="st-lbl">${m.short}</span>${interactive && done ? `<span class="st-val">${esc(msText(v))}</span>` : ''}`;
    return interactive ? `<button class="st ${cls}" data-act="ms-edit" data-id="${t.id}" data-k="${m.key}">${inner}</button>` : `<span class="st ${cls}" title="${esc(m.label)}${done ? ': ' + esc(msText(v)) : ''}">${inner}</span>`;
  }).join('')}</div>`;
}

function targetCard(t) {
  const fu = followupState(t, now());
  const po = planOverdue(t, now());
  return `<div class="card t-card ${isActive(t) ? '' : 'inactive'}">
    <a class="t-main" href="#/t/${t.id}">
      <div class="row-between"><span class="code mono">${fmtNomor(t.nomor)}</span><span class="tags">${prioTag(t)}${statusPill(t)}</span></div>
      <h3>${esc(t.kota || '—')}</h3>
      <p class="muted small">${esc(t.grading || '')}${t.omzet ? ` · <span class="mono">${fmtNum(t.omzet, 2)}</span> KL/hari` : ''}${t.pic ? ` · PIC ${esc(t.pic)}` : ''}</p>
      ${steps(t)}
      ${t.keterangan ? `<p class="ket">${esc(t.keterangan)}</p>` : ''}
      ${t.nextDate || po ? `<div class="fu ${fu === 'overdue' || (po && !t.nextDate) ? 'bad' : fu === 'today' ? 'poor' : ''}">${icon('cal')}<span>${t.nextDate ? `${esc(t.nextAction || 'Tindak lanjut')} · ${fmtDate(t.nextDate)} (${relDay(t.nextDate, now())})` : `Plan sosialisasi ${fmtDate(t.ms.plan)} sudah lewat`}</span></div>` : ''}
    </a>
    <div class="card-actions">
      ${waBtn(`data-act="wa" data-id="${t.id}" data-to="pic"`, 'PIC SPBU')}
      ${t.sbmWa ? waBtn(`data-act="wa" data-id="${t.id}" data-to="sbm"`, 'SBM', 'alt') : ''}
      <button class="icon-btn sm" data-act="act-new" data-id="${t.id}" aria-label="Catat aktivitas">${icon('plus')}</button>
    </div>
  </div>`;
}

function miniRow(t, sub, toAttr = 'pic') {
  return `<div class="att-row"><a href="#/t/${t.id}" class="att-main"><span class="dot ${STATUS_ALL[effectiveStatus(t)].band}"></span><div><strong><span class="mono">${fmtNomor(t.nomor)}</span> ${esc(t.kota)} ${prioTag(t)}</strong><div class="muted small">${sub}</div></div></a>${waBtn(`data-act="wa" data-id="${t.id}" data-to="${toAttr}"`)}</div>`;
}

// ---------- Beranda ----------
function viewHome() {
  if (!S.targets.length) {
    return shell('Target KSO TAC', 'Kerja sama SPBU DODO', `
      <section class="hero card">
        <h2>Pipeline kerja sama KSO TAC</h2>
        <p>Pantau target SPBU DODO dari plan sosialisasi sampai Go Live, lalu hubungi PIC SPBU & SBM langsung lewat WhatsApp dan kirim materi skema KSO TAC.</p>
        <div class="steps">
          <div><b>1</b><span>Impor Excel target (format "Target KSO") atau tambah manual</span></div>
          <div><b>2</b><span>Perbarui tahapan: Plan → Sosialisasi → Penawaran → Negosiasi → BAK & PKS → Go Live</span></div>
          <div><b>3</b><span>WA PIC/SBM & kirim materi sekali ketuk; riwayat tercatat otomatis</span></div>
        </div>
        <div class="btn-col">
          <label class="btn primary">${icon('upload')}<span>Impor Excel target</span><input type="file" accept=".xlsx" data-file="excel" hidden></label>
          <button class="btn ghost" data-act="t-new">${icon('plus')}<span>Tambah target manual</span></button>
        </div>
      </section>`);
  }
  const n = now();
  const s = summary(S.targets, n);
  const max = Math.max(1, s.total);
  const urgent = sortTargets([...s.overdue, ...s.today, ...s.soon], 'tindak', n);
  const kota = Object.entries(s.byKota).sort((a, b) => b[1].total - a[1].total);
  const goal = Number(S.settings.targetGoLive) || 0;
  return shell('Target KSO TAC', `${greeting(n)}${S.settings.pengirim ? ', ' + S.settings.pengirim : ''}`, `
    <section class="kpis">
      <a class="kpi" href="#/target" data-act="filter" data-k="status" data-v=""><span>Target SPBU</span><b class="mono">${s.total}</b><small>${s.active} masih diproses</small></a>
      <a class="kpi" href="#/target" data-act="filter" data-k="tahap" data-v="sosialisasi"><span>Sudah sosialisasi</span><b class="mono">${s.funnel[1]}</b><small>${Math.round(s.funnel[1] / max * 100)}% dari target</small></a>
      <a class="kpi" href="#/target" data-act="filter" data-k="tahap" data-v="penawaran"><span>Penawaran sharing</span><b class="mono">${s.funnel[2]}</b><small>negosiasi ${s.funnel[3]} · BAK ${s.funnel[4]}</small></a>
      <a class="kpi good" href="#/target" data-act="filter" data-k="status" data-v="golive"><span>Go Live</span><b class="mono">${s.funnel[5]}</b><small>${goal ? `target ${goal} SPBU` : 'atur target di menu Atur'}</small></a>
    </section>

    <section class="card">
      <div class="sec-head"><h2>Tahapan pelaksanaan</h2><span class="muted small">jumlah SPBU</span></div>
      <div class="funnel">${MILESTONES.map((m, i) => `<button class="fn-row" data-act="filter" data-k="tahap" data-v="${m.key}"><span class="fn-lbl">${m.label}</span><span class="fn-bar"><span style="width:${(s.funnel[i] / max) * 100}%"></span></span><b class="mono">${s.funnel[i]}</b></button>`).join('')}</div>
    </section>

    <section class="card">
      <div class="sec-head"><h2>Status owner</h2></div>
      <div class="status-grid">${Object.entries(STATUS_ALL).map(([k, v]) => `<button class="st-box ${v.band}" data-act="filter" data-k="status" data-v="${k}"><b class="mono">${s.byStatus[k] || 0}</b><span>${v.label}</span></button>`).join('')}</div>
    </section>

    <section class="card">
      <div class="sec-head"><h2>Perlu ditindaklanjuti</h2><a href="#/target" class="link" data-act="sort" data-v="tindak">Semua</a></div>
      ${urgent.length ? urgent.slice(0, 8).map(t => miniRow(t, `${esc(t.nextAction || 'Tindak lanjut')} · <b class="${followupState(t, n) === 'overdue' ? 't-bad' : ''}">${fmtDate(t.nextDate)} (${relDay(t.nextDate, n)})</b>`)).join('') : '<p class="muted small">Tidak ada jadwal tindak lanjut yang terlambat atau dalam 3 hari ke depan.</p>'}
      ${s.planOverdue.length ? `<h4>Plan sosialisasi lewat, belum terlaksana (${s.planOverdue.length})</h4>${sortTargets(s.planOverdue, 'prioritas', n).slice(0, 6).map(t => miniRow(t, `Plan ${fmtDate(t.ms.plan)} · ${esc(t.keterangan || 'tanpa keterangan')}`)).join('')}` : ''}
      ${s.unscheduled.length ? `<h4>Belum dijadwalkan (${s.unscheduled.length})</h4>${sortTargets(s.unscheduled, 'prioritas', n).slice(0, 5).map(t => miniRow(t, `${fmtNum(t.omzet, 2)} KL/hari · PIC ${esc(t.pic || '-')}`)).join('')}
        ${s.unscheduled.length > 5 ? `<button class="btn ghost full" data-act="filter" data-k="tahap" data-v="none">Lihat ${s.unscheduled.length} target belum dijadwalkan</button>` : ''}` : ''}
    </section>

    <section class="card">
      <div class="sec-head"><h2>Per kota / kabupaten</h2></div>
      <div class="table-wrap"><table><thead><tr><th>Kota/Kab.</th><th class="r">Target</th><th class="r">Sosialisasi</th><th class="r">Penawaran</th><th class="r">Go Live</th><th class="r">Aktif</th></tr></thead><tbody>
        ${kota.map(([k, r]) => `<tr data-act="filter" data-k="kota" data-v="${esc(k)}"><td>${esc(k)}</td><td class="r mono">${r.total}</td><td class="r mono">${r.sosialisasi}</td><td class="r mono">${r.penawaran}</td><td class="r mono">${r.golive}</td><td class="r mono">${r.aktif}</td></tr>`).join('')}
      </tbody></table></div>
    </section>`,
  { actions: `<button class="icon-btn" data-act="t-new" aria-label="Tambah target">${icon('plus')}</button>` });
}

// ---------- Daftar target ----------
function filtered() {
  const f = ui.f, q = ui.q.toLowerCase().trim();
  return sortTargets(S.targets.filter(t => {
    const st = effectiveStatus(t);
    if (f.status === 'aktif' && !isActive(t)) return false;
    if (f.status && f.status !== 'aktif' && st !== f.status) return false;
    if (f.tahap === 'none' && stageIdx(t) >= 0) return false;
    if (f.tahap && f.tahap !== 'none' && !msFilled(t.ms?.[f.tahap])) return false;
    if (f.prio && String(t.prioritas) !== f.prio) return false;
    if (f.kota && t.kota !== f.kota) return false;
    if (f.grading && t.grading !== f.grading) return false;
    if (q && ![t.nomor, fmtNomor(t.nomor), t.kota, t.pic, t.sbm, t.keterangan, t.grading].join(' ').toLowerCase().includes(q)) return false;
    return true;
  }), ui.sort, now());
}

function viewList() {
  const list = filtered();
  const f = ui.f;
  const uniq = k => [...new Set(S.targets.map(t => t[k]).filter(v => v !== null && v !== undefined && v !== ''))].sort((a, b) => String(a).localeCompare(String(b), 'id', { numeric: true }));
  const sel = (k, opts) => `<select data-f="${k}">${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(f[k]) === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  return shell('Target SPBU DODO', `${list.length} dari ${S.targets.length} target`, `
    <div class="searchbar">${icon('search')}<input type="search" placeholder="Cari No. SPBU, kota, PIC, keterangan…" value="${esc(ui.q)}" data-in="q"></div>
    <div class="filters">
      ${sel('status', [['aktif', 'Masih diproses'], ['', 'Semua status'], ...Object.entries(STATUS_ALL).map(([k, v]) => [k, v.label])])}
      ${sel('tahap', [['', 'Semua tahapan'], ['none', 'Belum dijadwalkan'], ...MILESTONES.map(m => [m.key, `Sudah ${m.short}`])])}
      ${sel('prio', [['', 'Semua prioritas'], ...uniq('prioritas').map(p => [String(p), `Prioritas ${p}`])])}
      ${sel('kota', [['', 'Semua kota/kab.'], ...uniq('kota').map(k => [k, k])])}
      ${sel('grading', [['', 'Semua grading'], ...uniq('grading').map(k => [k, k])])}
      <select data-sort>${[['prioritas', 'Urut: prioritas'], ['tindak', 'Urut: jadwal tindak lanjut'], ['omzet', 'Urut: omzet tertinggi'], ['tahap', 'Urut: tahapan terjauh'], ['nomor', 'Urut: No. SPBU']].map(([v, l]) => `<option value="${v}" ${ui.sort === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
    </div>
    ${list.length > 1 ? `<div class="btn-row"><button class="btn ghost sm" data-act="wa-queue">${WA_SVG}<span>WA berurutan ke ${list.length} PIC</span></button><button class="btn ghost sm" data-act="export-xlsx" data-scope="filtered">${icon('download')}<span>Excel (hasil filter)</span></button></div>` : ''}
    <div class="grid" id="list">${list.map(targetCard).join('') || empty('Tidak ada target yang cocok dengan filter.')}</div>`,
  { actions: `<button class="icon-btn" data-act="t-new" aria-label="Tambah target">${icon('plus')}</button>` });
}

// ---------- Detail ----------
function viewDetail(t) {
  const n = now();
  const nx = nextMilestone(t);
  const fu = followupState(t, n);
  const logs = [...(t.log || [])].sort((a, b) => b.ts - a.ts);
  return shell(title(t), `${t.kota || ''}${t.picPertare ? ' · PIC Pertare ' + t.picPertare : ''}`, `
    <section class="card info-card">
      <div class="row-between"><span class="code mono">${fmtNomor(t.nomor)}</span><span class="tags">${prioTag(t)}${statusPill(t)}</span></div>
      <h2>${esc(t.kota || title(t))}</h2>
      <p class="muted small">${esc([t.region, t.salesArea, t.provinsi].filter(Boolean).join(' · '))}</p>
      <dl class="info">
        <div><dt>Rata-rata omzet</dt><dd class="mono">${t.omzet ? fmtNum(t.omzet, 2) + ' KL/hari' : '—'}</dd></div>
        <div><dt>Grading Pertamina Way</dt><dd>${esc(t.grading || '—')}</dd></div>
        <div><dt>PIC SPBU</dt><dd>${esc(t.pic || '—')}<br>${t.picWa ? `<span class="mono">${esc(displayPhone(t.picWa))}</span>` : '<span class="muted">No. WA belum diisi</span>'}</dd></div>
        <div><dt>SBM</dt><dd>${esc(t.sbm || '—')}<br>${t.sbmWa ? `<span class="mono">${esc(displayPhone(t.sbmWa))}</span>` : '<span class="muted">—</span>'}</dd></div>
      </dl>
      <div class="card-actions">
        ${waBtn(`data-act="wa" data-id="${t.id}" data-to="pic"`, 'WA PIC SPBU')}
        ${t.sbmWa ? waBtn(`data-act="wa" data-id="${t.id}" data-to="sbm"`, 'WA SBM', 'alt') : ''}
      </div>
      <div class="card-actions">
        ${t.picWa ? `<a class="btn ghost" href="tel:${esc(t.picWa)}" data-act="call" data-id="${t.id}">${icon('phone')}<span>Telepon PIC</span></a>` : ''}
        <button class="btn ghost" data-act="materi-to" data-id="${t.id}">${icon('book')}<span>Kirim materi</span></button>
        <button class="icon-btn sm" data-act="t-edit" data-id="${t.id}" aria-label="Ubah data">${icon('edit')}</button>
      </div>
    </section>

    <section class="card">
      <div class="sec-head"><h2>Tanggal pelaksanaan</h2><span class="muted small">ketuk untuk isi/ubah</span></div>
      ${steps(t, true)}
      ${nx && isActive(t) ? `<button class="btn primary full" data-act="ms-edit" data-id="${t.id}" data-k="${nx.key}">${icon('check')}<span>Isi ${nx.label}</span></button>` : ''}
    </section>

    <section class="card">
      <div class="sec-head"><h2>Status & keterangan</h2><button class="btn ghost sm" data-act="ket-edit" data-id="${t.id}">${icon('edit')}<span>Ubah</span></button></div>
      <p>${statusPill(t)}</p>
      <p class="ket big">${esc(t.keterangan || 'Belum ada keterangan.')}</p>
    </section>

    <section class="card">
      <div class="sec-head"><h2>Tindak lanjut berikutnya</h2><button class="btn ghost sm" data-act="next-edit" data-id="${t.id}">${icon('cal')}<span>${t.nextDate ? 'Ubah' : 'Jadwalkan'}</span></button></div>
      ${t.nextDate ? `<div class="fu big ${fu === 'overdue' ? 'bad' : fu === 'today' ? 'poor' : ''}">${icon('cal')}<div><strong>${esc(t.nextAction || 'Tindak lanjut')}</strong><span>${fmtDate(t.nextDate)} · ${relDay(t.nextDate, n)}</span></div></div>
        <div class="btn-row">${waBtn(`data-act="wa" data-id="${t.id}" data-to="pic" data-tpl="tpl-fu"`, 'Ingatkan PIC')}<button class="btn ghost" data-act="next-done" data-id="${t.id}">${icon('check')}<span>Sudah dilakukan</span></button></div>`
        : `<p class="muted small">Belum ada jadwal. ${isStagnant(t, n) && isActive(t) ? 'Tidak ada aktivitas tercatat dalam 30 hari terakhir.' : ''}</p>`}
    </section>

    <section class="card">
      <div class="sec-head"><h2>Riwayat aktivitas</h2><button class="btn primary sm" data-act="act-new" data-id="${t.id}">${icon('plus')}<span>Catat</span></button></div>
      ${logs.length ? `<div class="timeline">${logs.map(l => `<div class="tl-item ${l.type}"><span class="mono muted small">${fmtDateTime(l.ts)}</span><div><b>${l.type === 'wa' ? WA_SVG + ' ' : ''}${esc(JENIS_AKTIVITAS[l.type] || l.type)}</b> ${esc(l.text)}</div></div>`).join('')}</div>` : '<p class="muted small">Belum ada aktivitas. Pesan WA yang dikirim dari aplikasi tercatat otomatis di sini.</p>'}
    </section>
    <button class="btn danger full" data-act="t-del" data-id="${t.id}">${icon('trash')}<span>Hapus target</span></button>`,
  { back: 'target' });
}

// ---------- Materi ----------
function viewMateri() {
  const kats = [...new Set(S.materi.map(m => m.kategori))];
  const list = S.materi.filter(m => !ui.materiKat || m.kategori === ui.materiKat).sort((a, b) => b.createdAt - a.createdAt);
  return shell('Materi', 'Bahan sosialisasi skema KSO TAC', `
    ${kats.length > 1 ? `<div class="chips"><button class="${!ui.materiKat ? 'on' : ''}" data-act="materi-kat" data-k="">Semua</button>${kats.map(k => `<button class="${ui.materiKat === k ? 'on' : ''}" data-act="materi-kat" data-k="${esc(k)}">${esc(k)}</button>`).join('')}</div>` : ''}
    <div class="grid">${list.map(m => `
      <div class="card materi-card">
        <div class="materi-ic">${icon(m.fileId ? 'file' : 'link')}</div>
        <div class="materi-body">
          <span class="muted small">${esc(m.kategori)}</span>
          <h3>${esc(m.judul)}</h3>
          ${m.deskripsi ? `<p class="muted small">${esc(m.deskripsi)}</p>` : ''}
          <p class="mono muted small">${m.fileId ? `${esc(m.fileName)} · ${fmtSize(m.size)}` : esc(m.url || '')}</p>
          <span class="muted small">Dikirim ${m.sentCount || 0}×</span>
        </div>
        <div class="card-actions">
          ${waBtn(`data-act="materi-send" data-id="${m.id}"`, 'Kirim ke SPBU')}
          <button class="btn ghost" data-act="materi-open" data-id="${m.id}">${icon(m.fileId ? 'download' : 'link')}<span>Buka</span></button>
          <button class="icon-btn sm" data-act="materi-edit" data-id="${m.id}" aria-label="Ubah">${icon('edit')}</button>
        </div>
      </div>`).join('') || empty('Belum ada materi. Unggah presentasi skema KSO TAC, simulasi sharing, contoh BAK/PKS (PDF, gambar, video) atau simpan link Google Drive.', `<button class="btn primary" data-act="materi-new">${icon('plus')}<span>Tambah materi</span></button>`)}</div>`,
  { actions: `<button class="icon-btn" data-act="materi-new" aria-label="Tambah materi">${icon('plus')}</button>` });
}

// ---------- Pengaturan ----------
function viewSettings() {
  const st = S.settings;
  return shell('Pengaturan', 'Impor/ekspor, pengirim & template WA', `
    <section class="card">
      <h2>Data target (Excel)</h2>
      <p class="muted small">Impor file Excel format "Target KSO" (kolom No. SPBU, PIC, SBM, Prioritas, Tanggal Pelaksanaan, Keterangan). Target dengan No. SPBU yang sama akan diperbarui; riwayat & jadwal tindak lanjut tetap tersimpan.</p>
      <div class="btn-col">
        <label class="btn primary">${icon('upload')}<span>Impor Excel (.xlsx)</span><input type="file" accept=".xlsx" data-file="excel" hidden></label>
        <button class="btn ghost" data-act="export-xlsx">${icon('download')}<span>Ekspor Excel (format sama + status & tindak lanjut)</span></button>
        <button class="btn ghost" data-act="export-csv">${icon('download')}<span>Ekspor riwayat aktivitas (CSV)</span></button>
      </div>
    </section>
    <section class="card">
      <h2>Identitas pengirim</h2>
      <p class="muted small">Tanda tangan pesan WA ({pengirim}, {jabatan}, {perusahaan}).</p>
      <form data-form="settings" class="form">
        ${field({ k: 'pengirim', l: 'Nama', ph: 'mis. Rian', half: true }, st)}
        ${field({ k: 'jabatan', l: 'Jabatan', ph: 'mis. Business Development', half: true }, st)}
        ${field({ k: 'perusahaan', l: 'Perusahaan', half: true }, st)}
        ${field({ k: 'targetGoLive', l: 'Target Go Live (SPBU)', t: 'number', half: true }, st)}
        <button class="btn primary">Simpan</button>
      </form>
    </section>
    <section class="card">
      <div class="sec-head"><h2>Template pesan WA</h2><button class="btn ghost sm" data-act="tpl-new">${icon('plus')}<span>Baru</span></button></div>
      ${templates().map(t => `<button class="list-btn" data-act="tpl-edit" data-id="${t.id}"><strong>${esc(t.nama)} <span class="pill none">${{ pic: 'PIC SPBU', sbm: 'SBM', materi: 'Materi' }[t.untuk] || ''}</span></strong><span class="muted small">${esc(t.isi.slice(0, 90))}…</span></button>`).join('')}
      ${S.templates ? '<button class="btn ghost full" data-act="tpl-reset">Kembalikan template bawaan</button>' : ''}
    </section>
    <section class="card">
      <h2>Cadangan</h2>
      <p class="muted small">Data tersimpan di perangkat ini. Unduh cadangan berkala (termasuk file materi) untuk dipindah ke perangkat lain.</p>
      <div class="btn-col">
        <button class="btn ghost" data-act="backup">${icon('download')}<span>Unduh cadangan (.json)</span></button>
        <label class="btn ghost">${icon('upload')}<span>Pulihkan dari cadangan</span><input type="file" accept="application/json,.json" data-file="restore" hidden></label>
        <button class="btn danger" data-act="wipe">${icon('trash')}<span>Hapus semua data</span></button>
      </div>
    </section>
    <p class="foot muted small center">© Task Force Audit SPBU · Target KSO TAC</p>`);
}

// ---------- form & modal ----------
function field(f, v = {}) {
  const val = v[f.k] ?? f.def ?? '';
  const req = f.req ? 'required' : '';
  let input;
  if (f.t === 'select') input = `<select name="${f.k}" ${req}>${f.opts.map(o => { const [ov, ol] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(ov)}" ${String(val) === String(ov) ? 'selected' : ''}>${esc(ol)}</option>`; }).join('')}</select>`;
  else if (f.t === 'textarea') input = `<textarea name="${f.k}" rows="${f.rows || 3}" placeholder="${esc(f.ph || '')}" ${req}>${esc(val)}</textarea>`;
  else input = `<input name="${f.k}" type="${f.t || 'text'}" value="${esc(val)}" placeholder="${esc(f.ph || '')}" ${f.t === 'number' ? 'step="any" inputmode="decimal"' : ''} ${f.t === 'tel' ? 'inputmode="tel"' : ''} ${f.list ? `list="${f.list}"` : ''} ${req}>`;
  return `<label class="fld ${f.half ? 'half' : ''}"><span>${esc(f.l)}${f.req ? ' *' : ''}</span>${input}${f.hint ? `<small class="muted">${f.hint}</small>` : ''}</label>`;
}
const readForm = form => Object.fromEntries(new FormData(form).entries());

let modalHandler = null;
function modal(ttl, inner, { onSubmit = null, wide = false } = {}) {
  closeModal();
  const el = document.createElement('div');
  el.className = 'modal-bg';
  el.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true"><div class="modal-head"><h2>${esc(ttl)}</h2><button class="icon-btn sm" data-act="modal-close" aria-label="Tutup">${icon('x')}</button></div><div class="modal-body">${inner}</div></div>`;
  document.body.appendChild(el);
  document.body.classList.add('modal-open');
  modalHandler = onSubmit;
  el.addEventListener('click', e => { if (e.target === el) closeModal(); });
  return el;
}
function closeModal() {
  document.querySelector('.modal-bg')?.remove();
  document.body.classList.remove('modal-open');
  modalHandler = null;
}
function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('out'), 2400);
  setTimeout(() => t.remove(), 2800);
}
const addLog = (t, type, text, extra = {}) => { (t.log = t.log || []).push({ ts: Date.now(), type, text, ...extra }); };

// Target form
function targetForm(t = null) {
  const v = t ? { ...t, nomor: fmtNomor(t.nomor) } : { picPertare: S.settings.pengirim, region: S.targets[0]?.region || '', salesArea: S.targets[0]?.salesArea || '', provinsi: S.targets[0]?.provinsi || '' };
  const kotaList = [...new Set(S.targets.map(x => x.kota).filter(Boolean))];
  modal(t ? 'Ubah data target' : 'Tambah target SPBU', `<form class="form" data-form="modal">
    <datalist id="dl-kota">${kotaList.map(k => `<option value="${esc(k)}">`).join('')}</datalist>
    ${field({ k: 'nomor', l: 'No. SPBU', req: true, ph: '54.644.21', half: true }, v)}
    ${field({ k: 'prioritas', l: 'Prioritas', t: 'number', ph: '1–5', half: true }, v)}
    ${field({ k: 'kota', l: 'Kota/Kab.', list: 'dl-kota', half: true }, v)}
    ${field({ k: 'omzet', l: 'Rata-rata omzet (KL/hari)', t: 'number', half: true }, v)}
    ${field({ k: 'grading', l: 'Grading Pertamina Way', t: 'select', opts: ['', ...GRADING], half: true }, v)}
    ${field({ k: 'picPertare', l: 'PIC Pertare', half: true }, v)}
    ${field({ k: 'pic', l: 'Nama PIC SPBU', half: true }, v)}
    ${field({ k: 'picWa', l: 'Nomor PIC SPBU (WA)', t: 'tel', half: true }, v)}
    ${field({ k: 'sbm', l: 'SBM', half: true }, v)}
    ${field({ k: 'sbmWa', l: 'Kontak SBM (WA)', t: 'tel', half: true }, v)}
    ${field({ k: 'region', l: 'Region', half: true }, v)}
    ${field({ k: 'salesArea', l: 'Sales Area', half: true }, v)}
    ${field({ k: 'provinsi', l: 'Provinsi' }, v)}
    <button class="btn primary">Simpan</button></form>`, {
    onSubmit: d => {
      d.nomor = d.nomor.replace(/\D/g, '');
      if (!d.nomor) { toast('No. SPBU wajib diisi'); return false; }
      if (S.targets.some(x => x.nomor === d.nomor && x !== t)) { toast(`SPBU ${fmtNomor(d.nomor)} sudah ada`); return false; }
      for (const k of ['picWa', 'sbmWa']) if (d[k] && !normalizePhone(d[k])) { toast('Nomor WA tidak valid'); return false; }
      d.omzet = parseNum(d.omzet); d.prioritas = parseNum(d.prioritas);
      if (t) Object.assign(t, d);
      else { const n = { id: uid('tgt'), ms: {}, log: [], createdAt: Date.now(), status: 'proses', keterangan: '', ...d }; addLog(n, 'catatan', 'Target ditambahkan'); S.targets.push(n); location.hash = '#/t/' + n.id; }
      persist(); return true;
    },
  });
}

// Milestone editor
function msForm(t, key) {
  const m = MILESTONES.find(x => x.key === key);
  const v = t.ms?.[key] || '';
  const mode = isISODate(v) ? 'date' : v === 'done' ? 'done' : v ? 'text' : m.text ? 'text' : 'date';
  const el = modal(m.label, `<form class="form" data-form="modal">
    <p class="muted small">${title(t)} · ${esc(t.kota || '')}</p>
    <div class="seg ms-mode">${[['date', 'Tanggal'], ['done', 'Selesai'], ['text', m.text ? 'Isi penawaran' : 'Catatan']].map(([k, l]) => `<label class="${mode === k ? 'on' : ''}"><input type="radio" name="mode" value="${k}" ${mode === k ? 'checked' : ''} hidden>${l}</label>`).join('')}</div>
    <label class="fld ms-in" data-mode="date"><span>Tanggal</span><input type="date" name="date" value="${isISODate(v) ? v : todayISO()}"></label>
    <label class="fld ms-in" data-mode="text"><span>${m.text ? 'Penawaran sharing (mis. 28% PTPR, 3 tahun)' : 'Keterangan'}</span><input name="text" value="${esc(mode === 'text' ? v : '')}"></label>
    ${field({ k: 'note', l: 'Catatan aktivitas (opsional)', ph: 'mis. Owner hadir, minta simulasi sharing' })}
    <div class="btn-row">${v ? '<button type="button" class="btn danger" data-ms-clear>Kosongkan</button>' : ''}<button class="btn primary grow">Simpan</button></div></form>`, {
    onSubmit: d => {
      const val = d.mode === 'date' ? d.date : d.mode === 'done' ? 'done' : d.text.trim();
      if (!val) { toast('Isi nilai terlebih dahulu'); return false; }
      setMs(t, key, val, d.note);
      return true;
    },
  });
  const sync = () => {
    const md = el.querySelector('input[name=mode]:checked').value;
    el.querySelectorAll('.ms-in').forEach(x => { x.hidden = x.dataset.mode !== md; });
    el.querySelectorAll('.ms-mode label').forEach(l => l.classList.toggle('on', l.querySelector('input').checked));
  };
  el.addEventListener('change', sync); sync();
  el.querySelector('[data-ms-clear]')?.addEventListener('click', () => { setMs(t, key, '', ''); closeModal(); render(); });
}
function setMs(t, key, val, note = '') {
  const m = MILESTONES.find(x => x.key === key);
  const prev = t.ms?.[key] || '';
  t.ms = { ...(t.ms || {}), [key]: val };
  addLog(t, 'tahap', `${m.label}: ${prev ? msText(prev) + ' → ' : ''}${val ? msText(val) : '(dikosongkan)'}${note ? ' — ' + note : ''}`);
  persist();
}

function ketForm(t) {
  modal('Status & keterangan', `<form class="form" data-form="modal">
    ${field({ k: 'status', l: 'Status owner', t: 'select', opts: Object.entries(STATUS).map(([k, v]) => [k, v.label]) }, t)}
    ${field({ k: 'keterangan', l: 'Keterangan', t: 'textarea', rows: 4, ph: 'mis. Menunggu konfirmasi owner untuk bertemu langsung di SPBU' }, t)}
    <button class="btn primary">Simpan</button></form>`, {
    onSubmit: d => {
      const changes = [];
      if (d.status !== t.status) changes.push(`status ${STATUS[t.status]?.label || '-'} → ${STATUS[d.status].label}`);
      if (d.keterangan !== (t.keterangan || '')) changes.push(`keterangan: ${d.keterangan}`);
      Object.assign(t, d);
      if (changes.length) addLog(t, 'catatan', changes.join('; '));
      persist(); return true;
    },
  });
}

const AKSI = ['Hubungi PIC via WA', 'Telepon owner', 'Sosialisasi & survey ke owner', 'Kirim penawaran sharing', 'Rapat negosiasi', 'Penandatanganan BAK & PKS', 'Minta bantuan SBM'];
function nextForm(t) {
  const el = modal('Tindak lanjut berikutnya', `<form class="form" data-form="modal">
    <datalist id="dl-aksi">${AKSI.map(a => `<option value="${a}">`).join('')}</datalist>
    ${field({ k: 'nextAction', l: 'Rencana', req: true, ph: 'mis. Sosialisasi & survey ke owner', list: 'dl-aksi' }, t)}
    ${field({ k: 'nextDate', l: 'Tanggal', t: 'date', req: true, def: plusDaysISO(3) }, t)}
    <div class="btn-row">${t.nextDate ? '<button type="button" class="btn danger" data-next-clear>Hapus jadwal</button>' : ''}<button class="btn primary grow">Simpan</button></div></form>`, {
    onSubmit: d => { Object.assign(t, d); addLog(t, 'catatan', `Jadwal: ${d.nextAction} (${fmtDate(d.nextDate)})`); persist(); return true; },
  });
  el.querySelector('[data-next-clear]')?.addEventListener('click', () => { t.nextAction = ''; t.nextDate = ''; persist(); closeModal(); render(); });
}

function activityForm(t, preset = {}) {
  modal(`Catat aktivitas · ${title(t)}`, `<form class="form" data-form="modal">
    <datalist id="dl-aksi">${AKSI.map(a => `<option value="${a}">`).join('')}</datalist>
    ${field({ k: 'type', l: 'Jenis', t: 'select', opts: Object.entries(JENIS_AKTIVITAS).filter(([k]) => k !== 'tahap'), half: true, def: 'telepon' }, preset)}
    ${field({ k: 'tgl', l: 'Tanggal', t: 'date', half: true, def: todayISO() }, preset)}
    ${field({ k: 'text', l: 'Hasil / catatan', t: 'textarea', req: true, ph: 'mis. Owner minta jadwal ulang minggu depan' }, preset)}
    ${field({ k: 'keterangan', l: 'Perbarui keterangan (kolom Excel)', t: 'textarea', rows: 2, hint: 'Kosongkan bila tidak berubah' }, {})}
    <label class="fld half"><span>Status owner</span><select name="status">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${t.status === k ? 'selected' : ''}>${v.label}</option>`).join('')}</select></label>
    <label class="fld half"><span>Tindak lanjut berikutnya</span><input type="date" name="nextDate" value="${esc(preset.nextDate ?? t.nextDate ?? '')}"></label>
    ${field({ k: 'nextAction', l: 'Rencana tindak lanjut', ph: 'mis. Sosialisasi & survey', list: 'dl-aksi' }, preset.nextDate === '' ? {} : t)}
    <button class="btn primary">Simpan</button></form>`, {
    onSubmit: d => {
      const ts = d.tgl && d.tgl !== todayISO() ? Date.parse(d.tgl + 'T12:00:00') : Date.now();
      (t.log = t.log || []).push({ ts, type: d.type, text: d.text });
      if (d.keterangan.trim()) t.keterangan = d.keterangan.trim();
      if (d.status !== t.status) { addLog(t, 'catatan', `Status → ${STATUS[d.status].label}`); t.status = d.status; }
      t.nextDate = d.nextDate; t.nextAction = d.nextDate ? (d.nextAction || 'Tindak lanjut') : '';
      persist(); return true;
    },
  });
}

// Materi form
function materiForm(m = null) {
  modal(m ? 'Ubah materi' : 'Tambah materi', `<form class="form" data-form="modal">
    ${field({ k: 'judul', l: 'Judul materi', req: true, ph: 'mis. Presentasi Skema KSO TAC' }, m || {})}
    ${field({ k: 'kategori', l: 'Kategori', t: 'select', opts: KATEGORI_MATERI }, m || {})}
    ${field({ k: 'deskripsi', l: 'Keterangan singkat', t: 'textarea', rows: 2 }, m || {})}
    ${m?.fileId ? `<p class="muted small">File: <span class="mono">${esc(m.fileName)}</span> (${fmtSize(m.size)})</p>` : ''}
    <label class="fld"><span>${m?.fileId ? 'Ganti file' : 'File'} (PDF, PPT, gambar, video)</span><input type="file" name="file"></label>
    ${field({ k: 'url', l: 'atau Link', t: 'url', ph: 'https://drive.google.com/…', hint: 'Link ikut dikirim di pesan WA. File dibagikan lewat menu Bagikan di HP.' }, m || {})}
    <div class="btn-row">${m ? `<button type="button" class="btn danger" data-act="materi-del" data-id="${m.id}">${icon('trash')}<span>Hapus</span></button>` : ''}<button class="btn primary grow">Simpan</button></div></form>`, {
    onSubmit: async (d, form) => {
      const file = form.querySelector('input[type=file]').files[0];
      if (!file && !d.url && !m?.fileId) { toast('Pilih file atau isi link'); return false; }
      const rec = m || { id: uid('mat'), createdAt: Date.now(), sentCount: 0 };
      Object.assign(rec, { judul: d.judul, kategori: d.kategori, deskripsi: d.deskripsi, url: d.url });
      if (file) {
        if (rec.fileId) await deleteFile(rec.fileId);
        rec.fileId = uid('file');
        await putFile(rec.fileId, file);
        Object.assign(rec, { fileName: file.name, fileType: file.type, size: file.size });
      }
      if (!m) S.materi.push(rec);
      persist(); return true;
    },
  });
}

function tplForm(t = null) {
  modal(t ? 'Ubah template' : 'Template baru', `<form class="form" data-form="modal">
    ${field({ k: 'nama', l: 'Nama template', req: true }, t || {})}
    ${field({ k: 'untuk', l: 'Penerima', t: 'select', opts: [['pic', 'PIC SPBU'], ['sbm', 'SBM'], ['materi', 'Kirim materi (PIC)']] }, t || {})}
    ${field({ k: 'isi', l: 'Isi pesan', t: 'textarea', rows: 9, req: true }, t || {})}
    <details class="ph-help"><summary>Kode isian yang tersedia</summary><div>${PLACEHOLDERS.map(([k, l]) => `<button type="button" class="chip-btn" data-act="ph-insert" data-ph="${k}"><span class="mono">{${k}}</span> ${esc(l)}</button>`).join('')}</div></details>
    <p class="muted small">Format WA: *tebal*, _miring_, ~coret~.</p>
    <div class="btn-row">${t ? `<button type="button" class="btn danger" data-act="tpl-del" data-id="${t.id}">${icon('trash')}<span>Hapus</span></button>` : ''}<button class="btn primary grow">Simpan</button></div></form>`, {
    onSubmit: d => {
      if (!S.templates) S.templates = DEFAULT_TEMPLATES.map(x => ({ ...x }));
      const cur = t && S.templates.find(x => x.id === t.id);
      if (cur) Object.assign(cur, d); else S.templates.push({ id: uid('tpl'), ...d });
      persist(); return true;
    },
  });
}

// ---------- WhatsApp ----------
function varsFor(t, materi) {
  const idx = stageIdx(t);
  const nx = nextMilestone(t);
  return {
    salam: greeting(now()), pengirim: S.settings.pengirim, jabatan: S.settings.jabatan, perusahaan: S.settings.perusahaan,
    pic: t.pic || '', sbm: (t.sbm || '').replace(/^pjs\.?\s*/i, ''), nomor: fmtNomor(t.nomor), kota: t.kota || '',
    tahap: idx < 0 ? 'belum dijadwalkan' : MILESTONES[idx].label, berikutnya: nx?.label || '-',
    plan: isISODate(t.ms?.plan) ? fmtDate(t.ms.plan) : '(tanggal menyusul)', penawaran: t.ms?.penawaran || '-',
    keterangan: t.keterangan || '-', aksi: t.nextAction || nx?.label || 'tindak lanjut', jadwal: isISODate(t.nextDate) ? ` pada ${fmtDate(t.nextDate)}` : '',
    materi: materi?.judul || '', link: materi?.url || (materi?.fileId ? `(file terlampir: ${materi.fileName})` : ''),
  };
}

async function waCompose({ t, to = 'pic', materi = null, tplId = '', onSent = null }) {
  const list = templates();
  const kind = materi ? 'materi' : to;
  const tpl = list.find(x => x.id === tplId) || list.find(x => x.untuk === kind) || list[0];
  const vars = varsFor(t, materi);
  const name = to === 'sbm' ? t.sbm : t.pic;
  const phone = normalizePhone(to === 'sbm' ? t.sbmWa : t.picWa);
  let fileObj = null;
  if (materi?.fileId) { const blob = await getFile(materi.fileId); if (blob) fileObj = new File([blob], materi.fileName || 'materi', { type: materi.fileType || blob.type }); }
  const canShareFile = !!(fileObj && navigator.canShare && navigator.canShare({ files: [fileObj] }));
  const opts = [...list.filter(x => x.untuk === kind), ...list.filter(x => x.untuk !== kind)];
  const el = modal(`WhatsApp ${to === 'sbm' ? 'SBM' : 'PIC'} · ${fmtNomor(t.nomor)}`, `
    <div class="wa-compose">
      <div class="wa-to">${WA_SVG}<div><strong>${esc(name || (to === 'sbm' ? 'SBM' : 'PIC SPBU'))} <span class="muted small">${to === 'sbm' ? 'SBM' : 'PIC SPBU'}</span></strong>${phone ? `<span class="mono">${esc(displayPhone(phone))}</span>` : '<span>Nomor WA belum diisi — pilih kontak di WhatsApp</span>'}</div></div>
      <label class="fld"><span>Template</span><select data-wa="tpl">${opts.map(x => `<option value="${x.id}" ${x.id === tpl.id ? 'selected' : ''}>${esc(x.nama)}</option>`).join('')}</select></label>
      <label class="fld"><span>Pesan (bisa diedit)</span><textarea rows="11" data-wa="text">${esc(fillTemplate(tpl.isi, vars))}</textarea></label>
      ${materi?.fileId ? `<p class="muted small">${canShareFile ? 'File dibagikan lewat menu Bagikan — pilih WhatsApp lalu kontak tujuan.' : 'Perangkat ini tidak bisa melampirkan file langsung: file diunduh, lalu lampirkan di WhatsApp.'}</p>` : ''}
      <div class="btn-col">
        ${materi?.fileId ? `<button class="btn wa-btn big" data-wa="share">${WA_SVG}<span>${canShareFile ? 'Bagikan file + pesan' : 'Unduh file & buka WhatsApp'}</span></button>` : ''}
        <button class="btn ${materi?.fileId ? 'ghost' : 'wa-btn big'}" data-wa="open">${WA_SVG}<span>${phone ? `Kirim ke ${esc(displayPhone(phone))}` : 'Buka WhatsApp'}</span></button>
        <div class="btn-row">
          ${phone ? `<button class="btn ghost grow" data-wa="group">${icon('share')}<span>Kirim ke grup/kontak lain</span></button>` : ''}
          <button class="btn ghost grow" data-wa="copy">${icon('copy')}<span>Salin</span></button>
        </div>
      </div>
    </div>`);
  const ta = el.querySelector('[data-wa=text]');
  const sel = el.querySelector('[data-wa=tpl]');
  sel.addEventListener('change', () => { ta.value = fillTemplate(list.find(x => x.id === sel.value).isi, vars); });
  const logIt = how => {
    const tname = list.find(x => x.id === sel.value)?.nama || 'Pesan';
    addLog(t, materi ? 'materi' : 'wa', `${how}: ${tname}${materi ? ` — ${materi.judul}` : ''}`, { msg: ta.value });
    if (materi) materi.sentCount = (materi.sentCount || 0) + 1;
    persist(); onSent?.();
  };
  el.addEventListener('click', async e => {
    const b = e.target.closest('[data-wa]');
    if (!b || b.tagName === 'SELECT' || b.tagName === 'TEXTAREA') return;
    const text = ta.value, k = b.dataset.wa;
    if (k === 'open' || k === 'group') {
      window.open(waLink(k === 'open' ? phone : '', text), '_blank', 'noopener');
      logIt(k === 'open' ? `WA ke ${name || to.toUpperCase()}` : 'WA ke grup/kontak lain'); closeModal(); render();
    } else if (k === 'copy') {
      await navigator.clipboard?.writeText(text).catch(() => {}); toast('Pesan disalin');
    } else if (k === 'share') {
      if (canShareFile) {
        try { await navigator.share({ files: [fileObj], text }); logIt('Dibagikan'); closeModal(); render(); }
        catch (err) { if (err?.name !== 'AbortError') toast('Gagal membagikan: ' + err.message); }
      } else { downloadBlob(fileObj, fileObj.name); window.open(waLink(phone, text), '_blank', 'noopener'); logIt('WA + file diunduh'); closeModal(); render(); }
    }
  });
}

/** Antrian kirim berurutan (WhatsApp tidak mendukung broadcast otomatis). */
function waQueue(ttl, items) {
  const el = modal(ttl, `<p class="muted small">WhatsApp tidak mengizinkan kirim massal otomatis. Ketuk berurutan — pesan sudah disiapkan & ditandai ✓ setelah dikirim.</p>
    <div class="queue">${items.map((it, i) => `<div class="att-row"><div class="att-main"><span class="dot ${it.done ? 'good' : 'none'}"></span><div><strong><span class="mono">${fmtNomor(it.t.nomor)}</span> ${esc(it.t.kota)}</strong><div class="muted small">${esc(it.t.pic || '-')} ${it.t.picWa ? '· ' + esc(displayPhone(it.t.picWa)) : ''}</div></div></div>${waBtn(`data-qi="${i}"`, it.done ? 'Lagi' : 'Kirim')}</div>`).join('')}</div>`, { wide: true });
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-qi]');
    if (!b) return;
    const it = items[+b.dataset.qi];
    closeModal();
    waCompose({ ...it, onSent: () => { it.done = true; setTimeout(() => waQueue(ttl, items), 60); } });
  });
}

function materiTo(t) {
  if (!S.materi.length) { toast('Belum ada materi — tambahkan di tab Materi'); return go('materi'); }
  const el = modal(`Kirim materi ke ${fmtNomor(t.nomor)}`, S.materi.map(m => `<button class="list-btn" data-mid="${m.id}"><strong>${icon(m.fileId ? 'file' : 'link')} ${esc(m.judul)}</strong><span class="muted small">${esc(m.kategori)} · dikirim ${m.sentCount || 0}×</span></button>`).join(''));
  el.addEventListener('click', e => { const b = e.target.closest('[data-mid]'); if (b) { closeModal(); waCompose({ t, materi: materiById(b.dataset.mid) }); } });
}

function materiSend(m) {
  const list = sortTargets(S.targets.filter(isActive), 'prioritas', now());
  if (!list.length) return toast('Belum ada target aktif');
  const el = modal(`Kirim: ${m.judul}`, `<p class="muted small">Pilih SPBU tujuan (target yang masih diproses).</p>
    <div class="row-between"><button class="btn ghost sm" data-ms="all">Pilih semua</button><button class="btn ghost sm" data-ms="none">Kosongkan</button></div>
    <div class="check-list">${list.map(t => `<label><input type="checkbox" value="${t.id}"><span><span class="mono">${fmtNomor(t.nomor)}</span> ${esc(t.kota)} ${prioTag(t)}<small class="muted"> · ${esc(t.pic || 'PIC -')} · ${esc(stageLabel(t))}</small></span></label>`).join('')}</div>
    <button class="btn primary full" id="msGo">Lanjut</button>`);
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-ms]');
    if (b) el.querySelectorAll('.check-list input').forEach(i => { i.checked = b.dataset.ms === 'all'; });
    if (e.target.closest('#msGo')) {
      const ids = [...el.querySelectorAll('input:checked')].map(i => i.value);
      if (!ids.length) return toast('Pilih minimal satu SPBU');
      closeModal();
      if (ids.length === 1) waCompose({ t: byId(ids[0]), materi: m });
      else waQueue(`Kirim materi ke ${ids.length} SPBU`, ids.map(id => ({ t: byId(id), materi: m })));
    }
  });
}

// ---------- impor / ekspor ----------
function downloadBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const blobToDataUrl = b => new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); });

async function importFile(file) {
  try {
    const io = await import('./lib/target-io.js');
    const { targets, sheets } = await io.importExcel(await file.arrayBuffer());
    if (!targets.length) throw new Error('Tidak ditemukan baris target. Pastikan ada kolom "No. SPBU".');
    const existing = S.targets.length;
    const r = io.mergeTargets(S.targets, targets);
    const ok = !existing || confirm(`File berisi ${targets.length} target (sheet: ${sheets.join(', ')}).\n\n${r.added} target baru, ${r.updated} target diperbarui berdasarkan No. SPBU.\nRiwayat & jadwal tindak lanjut tetap tersimpan. Lanjutkan?`);
    if (!ok) return;
    for (const t of r.targets) if (!t.log?.length) t.log = [{ ts: Date.now(), type: 'catatan', text: `Diimpor dari ${file.name}` }];
    S.targets = r.targets;
    await saveState(S, true);
    toast(`${r.added} target baru, ${r.updated} diperbarui`);
    if (route()[0] === 'home') render(); else go('home');
  } catch (e) { alert('Gagal impor Excel: ' + e.message); }
}

async function exportXlsx(scope) {
  const io = await import('./lib/target-io.js');
  const list = (scope === 'filtered' ? filtered() : sortTargets(S.targets, 'prioritas', now())).map(t => ({ ...t, statusLabel: STATUS_ALL[effectiveStatus(t)].label }));
  downloadBlob(io.exportExcel(list, { sheetName: S.settings.pengirim || 'Target KSO' }), `Target_KSO_${todayISO()}.xlsx`);
}

function exportCsv() {
  const rows = [['Tanggal', 'No. SPBU', 'Kota/Kab.', 'PIC SPBU', 'Jenis', 'Catatan', 'Isi pesan']];
  for (const t of S.targets) for (const l of t.log || []) rows.push([fmtDateTime(l.ts), fmtNomor(t.nomor), t.kota, t.pic, JENIS_AKTIVITAS[l.type] || l.type, l.text, l.msg || '']);
  downloadBlob(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }), `Aktivitas_KSO_${todayISO()}.csv`);
}

async function backup() {
  const files = await allFiles();
  const enc = {};
  for (const [k, b] of Object.entries(files)) enc[k] = await blobToDataUrl(b);
  downloadBlob(new Blob([JSON.stringify({ app: 'kso-tac-target', exportedAt: new Date().toISOString(), state: S, files: enc })], { type: 'application/json' }), `cadangan-kso-tac-${todayISO()}.json`);
}
async function restore(file) {
  try {
    const data = JSON.parse(await file.text());
    if (data.app !== 'kso-tac-target' || !data.state) throw new Error('Bukan file cadangan aplikasi ini');
    if (!confirm(`Pulihkan cadangan ${fmtDateTime(Date.parse(data.exportedAt))}? Data di perangkat ini akan diganti.`)) return;
    for (const [k, u] of Object.entries(data.files || {})) await putFile(k, await (await fetch(u)).blob());
    S = { ...emptyState(), ...data.state };
    await saveState(S, true);
    toast('Cadangan dipulihkan'); render();
  } catch (e) { alert('Gagal memulihkan: ' + e.message); }
}

// ---------- event ----------
app.addEventListener('input', e => {
  if (e.target.dataset.in !== 'q') return;
  ui.q = e.target.value;
  const pos = e.target.selectionStart;
  render();
  const n = app.querySelector('[data-in=q]');
  if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch { /* type=search */ } }
});
document.addEventListener('change', e => {
  const d = e.target.dataset;
  if (d.f !== undefined) { ui.f[d.f] = e.target.value; render(); }
  if (d.sort !== undefined) { ui.sort = e.target.value; render(); }
  if (d.file === 'excel' && e.target.files[0]) { importFile(e.target.files[0]); e.target.value = ''; }
  if (d.file === 'restore' && e.target.files[0]) { restore(e.target.files[0]); e.target.value = ''; }
});

document.addEventListener('submit', async e => {
  const form = e.target, kind = form.dataset.form;
  if (!kind) return;
  e.preventDefault();
  if (kind === 'modal' && modalHandler) {
    const btn = form.querySelector('button.primary'); if (btn) btn.disabled = true;
    const ok = await modalHandler(readForm(form), form);
    if (btn) btn.disabled = false;
    if (ok) { closeModal(); render(); toast('Tersimpan'); }
  } else if (kind === 'settings') {
    Object.assign(S.settings, readForm(form)); persist(); toast('Pengaturan disimpan'); render();
  }
});

const RESET_F = () => ({ status: '', tahap: '', prio: '', kota: '', grading: '' });
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const { act, id } = b.dataset;
  const t = id ? byId(id) : null;
  switch (act) {
    case 'modal-close': closeModal(); break;
    case 'filter': e.preventDefault(); ui.f = RESET_F(); ui.q = ''; ui.f[b.dataset.k] = b.dataset.v; ui.sort = 'prioritas'; if (route()[0] === 'target') render(); else go('target'); break;
    case 'sort': e.preventDefault(); ui.f = { ...RESET_F(), status: 'aktif' }; ui.sort = b.dataset.v; go('target'); break;
    case 't-new': targetForm(); break;
    case 't-edit': targetForm(t); break;
    case 't-del': if (confirm(`Hapus target ${title(t)} beserta riwayatnya?`)) { S.targets = S.targets.filter(x => x.id !== id); persist(); go('target'); } break;
    case 'ms-edit': msForm(t, b.dataset.k); break;
    case 'ket-edit': ketForm(t); break;
    case 'next-edit': nextForm(t); break;
    case 'next-done': activityForm(t, { type: /telepon/i.test(t.nextAction) ? 'telepon' : /sosialisasi|survey|kunjung/i.test(t.nextAction) ? 'kunjungan' : 'catatan', text: `${t.nextAction || 'Tindak lanjut'} sudah dilakukan`, nextDate: '' }); break;
    case 'act-new': activityForm(t); break;
    case 'call': addLog(t, 'telepon', `Menelepon ${t.pic || 'PIC'}`); persist(); break;
    case 'wa': waCompose({ t, to: b.dataset.to, tplId: b.dataset.tpl }); break;
    case 'wa-queue': { const l = filtered(); waQueue(`WA berurutan ke ${l.length} PIC SPBU`, l.map(x => ({ t: x, to: 'pic' }))); break; }
    case 'materi-new': materiForm(); break;
    case 'materi-edit': materiForm(materiById(id)); break;
    case 'materi-del': {
      const m = materiById(id);
      if (!confirm(`Hapus materi "${m.judul}"?`)) return;
      if (m.fileId) await deleteFile(m.fileId);
      S.materi = S.materi.filter(x => x.id !== id); persist(); closeModal(); render(); break;
    }
    case 'materi-kat': ui.materiKat = b.dataset.k; render(); break;
    case 'materi-open': {
      const m = materiById(id);
      if (m.fileId) { const blob = await getFile(m.fileId); if (!blob) return toast('File tidak ditemukan'); const url = URL.createObjectURL(blob); if (!window.open(url, '_blank')) downloadBlob(blob, m.fileName); setTimeout(() => URL.revokeObjectURL(url), 60000); }
      else if (m.url) window.open(m.url, '_blank', 'noopener');
      break;
    }
    case 'materi-send': materiSend(materiById(id)); break;
    case 'materi-to': materiTo(t); break;
    case 'tpl-new': tplForm(); break;
    case 'tpl-edit': tplForm(templates().find(x => x.id === id)); break;
    case 'tpl-del': if (confirm('Hapus template ini?')) { if (!S.templates) S.templates = DEFAULT_TEMPLATES.map(x => ({ ...x })); S.templates = S.templates.filter(x => x.id !== id); persist(); closeModal(); render(); } break;
    case 'tpl-reset': if (confirm('Kembalikan semua template ke bawaan?')) { S.templates = null; persist(); render(); } break;
    case 'ph-insert': {
      const ta = b.closest('form').querySelector('textarea[name=isi]');
      const p = ta.selectionStart ?? ta.value.length;
      ta.value = ta.value.slice(0, p) + `{${b.dataset.ph}}` + ta.value.slice(ta.selectionEnd ?? p);
      ta.focus(); break;
    }
    case 'export-xlsx': exportXlsx(b.dataset.scope); break;
    case 'export-csv': exportCsv(); break;
    case 'backup': backup(); break;
    case 'wipe':
      if (!confirm('Hapus SEMUA data di perangkat ini? Unduh cadangan dulu bila perlu.')) return;
      for (const m of S.materi) if (m.fileId) await deleteFile(m.fileId);
      S = emptyState(); await saveState(S, true); go('home'); render(); break;
  }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
window.addEventListener('pagehide', flushState);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushState(); });

loadState().then(s => { S = s; render(); }).catch(err => { app.innerHTML = `<p class="empty">Gagal membuka penyimpanan: ${esc(err.message)}</p>`; });
