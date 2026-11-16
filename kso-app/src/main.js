import './styles.css';
import { loadState, saveState, flushState, putFile, getFile, deleteFile, allFiles, emptyState } from './lib/store.js';
import { normalizePhone, fillTemplate, waLink, displayPhone, greeting, DEFAULT_TEMPLATES, PLACEHOLDERS } from './lib/wa.js';
import {
  KATEGORI_TL, PRIORITAS, STATUS_TL, SETORAN, KATEGORI_MATERI, todayISO, daysUntil, contractStatus, isOverdue,
  dueLabel, achievement, achievementBand, latestMonitoring, entryTarget, sortFollowups, spbuHealth, openListText, uid, toCsv,
} from './lib/kso.js';
import { fmtDate, fmtPeriode, fmtDateTime, fmtNum, fmtPct, fmtSize, esc } from './lib/format.js';

const app = document.getElementById('app');
let S = emptyState();
const ui = { tlFilter: { status: 'aktif', kategori: '', spbu: '', q: '' }, spbuQ: '', materiKat: '', spbuTab: 'tl' };

const templates = () => S.templates || DEFAULT_TEMPLATES;
const spbuById = id => S.spbu.find(s => s.id === id);
const tlById = id => S.followups.find(f => f.id === id);
const materiById = id => S.materi.find(m => m.id === id);
const persist = () => saveState(S);
const now = () => new Date();

// ---------- ikon ----------
const I = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  fuel: '<path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12M14 9h2a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0V8l-3-3M7 7h4"/>',
  task: '<path d="M9 11l2 2 4-4M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5M8 7h7"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  back: '<path d="M15 18l-6-6 6-6"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  file: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8zM14 3v5h5"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.8 7L4 20l1.2-4.6A8 8 0 1 1 21 12z"/>',
};
const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${I[n]}</svg>`;
const WA_SVG = '<svg class="ic wa" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3zM12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.8 9.8 0 1 1 12 21.8zm8.4-18.2A11.8 11.8 0 0 0 1.7 17.8L0 24l6.3-1.7a11.8 11.8 0 0 0 5.7 1.5c6.5 0 11.8-5.3 11.8-11.8 0-3.2-1.2-6.1-3.4-8.4z"/></svg>';

// ---------- router ----------
const route = () => (location.hash.replace(/^#\/?/, '') || 'home').split('/');
const go = h => { location.hash = '#/' + h; };
window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });

// ---------- layout ----------
const TABS = [['home', 'Beranda', 'home'], ['spbu', 'SPBU KSO', 'fuel'], ['tl', 'Tindak Lanjut', 'task'], ['materi', 'Materi', 'book'], ['pengaturan', 'Atur', 'gear']];

function shell(title, sub, body, { back = '', actions = '' } = {}) {
  const r = route()[0];
  return `
  <header class="topbar">
    ${back ? `<a class="icon-btn" href="#/${back}" aria-label="Kembali">${icon('back')}</a>` : `<img class="brand" src="/favicon.svg" alt="">`}
    <div class="tb-text"><h1>${esc(title)}</h1>${sub ? `<p>${esc(sub)}</p>` : ''}</div>
    <div class="tb-act">${actions}</div>
  </header>
  <main class="content">${body}</main>
  <nav class="dock">${TABS.map(([k, l, ic]) => `<a href="#/${k}" class="${r === k || (k === 'spbu' && r === 's') ? 'on' : ''}">${icon(ic)}<span>${l}</span></a>`).join('')}</nav>`;
}

function render() {
  const [r, id] = route();
  let html;
  if (r === 'spbu') html = viewSpbuList();
  else if (r === 's' && spbuById(id)) html = viewSpbuDetail(spbuById(id));
  else if (r === 'tl') html = viewTl();
  else if (r === 'materi') html = viewMateri();
  else if (r === 'pengaturan') html = viewSettings();
  else html = viewHome();
  app.innerHTML = html;
}

// ---------- komponen ----------
const LEVEL = { good: ['Baik', 'good'], warn: ['Perlu dipantau', 'avg'], bad: ['Perlu tindakan', 'bad'] };
const pill = (text, band) => `<span class="pill ${band}">${esc(text)}</span>`;
const statusPill = tl => pill(isOverdue(tl, now()) ? 'Terlambat' : STATUS_TL[tl.status], isOverdue(tl, now()) ? 'bad' : { open: 'poor', proses: 'avg', selesai: 'good' }[tl.status]);
const empty = (t, btn = '') => `<div class="empty"><p>${t}</p>${btn}</div>`;
const waBtn = (attrs, label = 'WA') => `<button class="btn wa-btn" ${attrs}>${WA_SVG}<span>${label}</span></button>`;

function tlRow(tl, showSpbu = true) {
  const s = spbuById(tl.spbuId);
  return `<div class="tl-row ${isOverdue(tl, now()) ? 'late' : ''} ${tl.status === 'selesai' ? 'done' : ''}">
    <button class="tl-main" data-act="tl-open" data-id="${tl.id}">
      <div class="tl-top">${statusPill(tl)}<span class="muted small cat">${esc(tl.kategori || '')}</span>${tl.prioritas === 'tinggi' ? pill('Prioritas tinggi', 'bad soft') : ''}</div>
      <strong>${esc(tl.judul)}</strong>
      <div class="muted small">${showSpbu && s ? `<span class="mono">${esc(s.nomor)}</span> ${esc(s.nama)} · ` : ''}${tl.tenggat ? `Tenggat ${fmtDate(tl.tenggat)} · ` : ''}${dueLabel(tl, now())}</div>
    </button>
    ${tl.status !== 'selesai' ? waBtn(`data-act="wa-tl" data-id="${tl.id}"`) : ''}
  </div>`;
}

function spbuCard(s) {
  const h = spbuHealth(s, S.followups, S.monitoring, now());
  const [lbl, band] = LEVEL[h.level];
  return `<div class="card spbu-card">
    <a class="spbu-main" href="#/s/${s.id}">
      <div class="row-between"><span class="mono code">${esc(s.nomor)}</span>${pill(lbl, band)}</div>
      <h3>${esc(s.nama)}</h3>
      <p class="muted small">${esc(s.mitra || 'Mitra belum diisi')}${s.kota ? ` · ${esc(s.kota)}` : ''}</p>
      <div class="mini-stats">
        <div><b class="mono">${h.open}</b><span>TL terbuka</span></div>
        <div><b class="mono ${h.overdue ? 't-bad' : ''}">${h.overdue}</b><span>Terlambat</span></div>
        <div><b class="mono t-${achievementBand(h.ach)}">${fmtPct(h.ach)}</b><span>Capaian ${h.last ? fmtPeriode(h.last.periode).split(' ')[0] : ''}</span></div>
      </div>
      ${h.flags.length ? `<div class="flags">${h.flags.map(f => `<span>${esc(f)}</span>`).join('')}</div>` : ''}
    </a>
    <div class="card-actions">
      ${waBtn(`data-act="wa-spbu" data-id="${s.id}"`, 'Chat PIC')}
      <button class="btn ghost" data-act="materi-to" data-id="${s.id}">${icon('book')}<span>Kirim materi</span></button>
    </div>
  </div>`;
}

// ---------- Beranda ----------
function viewHome() {
  if (!S.spbu.length) {
    return shell('Monitoring KSO SPBU', 'Tindak lanjut kerja sama operasi', `
      <section class="hero card">
        <h2>Selamat datang</h2>
        <p>Pantau kinerja SPBU KSO, catat tindak lanjut, lalu kirim pengingat & materi langsung ke WhatsApp PIC mitra.</p>
        <div class="steps">
          <div><b>1</b><span>Daftarkan SPBU KSO & nomor WA PIC mitra</span></div>
          <div><b>2</b><span>Catat monitoring bulanan & temuan tindak lanjut</span></div>
          <div><b>3</b><span>Kirim pengingat / materi via WA sekali ketuk</span></div>
        </div>
        <div class="btn-row">
          <button class="btn primary" data-act="spbu-new">${icon('plus')}<span>Tambah SPBU KSO</span></button>
          <button class="btn ghost" data-act="demo">Coba dengan data contoh</button>
        </div>
      </section>`);
  }
  const n = now();
  const open = S.followups.filter(f => f.status !== 'selesai');
  const late = open.filter(f => isOverdue(f, n));
  const soon = open.filter(f => !isOverdue(f, n) && f.tenggat && daysUntil(f.tenggat, n) <= 7);
  const kontrak = S.spbu.filter(s => ['soon', 'expired'].includes(contractStatus(s, n, S.settings.warnDays).key));
  const health = S.spbu.map(s => ({ s, h: spbuHealth(s, S.followups, S.monitoring, n) }));
  const attention = health.filter(x => x.h.level !== 'good').sort((a, b) => (a.h.level === 'bad' ? 0 : 1) - (b.h.level === 'bad' ? 0 : 1) || b.h.overdue - a.h.overdue);
  const achs = health.map(x => x.h.ach).filter(x => x !== null);
  const avgAch = achs.length ? achs.reduce((a, b) => a + b, 0) / achs.length : null;
  const doneMonth = S.followups.filter(f => f.status === 'selesai' && (f.selesaiAt || '').slice(0, 7) === todayISO(n).slice(0, 7)).length;

  return shell('Monitoring KSO SPBU', `${greeting(n)}${S.settings.pengirim ? ', ' + S.settings.pengirim : ''}`, `
    <section class="kpis">
      <a class="kpi" href="#/spbu"><span>SPBU KSO</span><b class="mono">${S.spbu.length}</b><small>Rata-rata capaian ${fmtPct(avgAch)}</small></a>
      <a class="kpi" href="#/tl"><span>TL terbuka</span><b class="mono">${open.length}</b><small>${doneMonth} selesai bulan ini</small></a>
      <a class="kpi ${late.length ? 'bad' : ''}" href="#/tl" data-act="tl-late"><span>Terlambat</span><b class="mono">${late.length}</b><small>${soon.length} jatuh tempo ≤ 7 hari</small></a>
      <a class="kpi ${kontrak.length ? 'poor' : ''}" href="#/spbu"><span>Kontrak</span><b class="mono">${kontrak.length}</b><small>berakhir ≤ ${S.settings.warnDays} hari</small></a>
    </section>

    <section class="card">
      <div class="sec-head"><h2>Tindak lanjut mendesak</h2><a href="#/tl" class="link">Semua</a></div>
      ${[...late, ...soon].length ? sortFollowups([...late, ...soon], n).slice(0, 8).map(t => tlRow(t)).join('') : empty('Tidak ada tindak lanjut terlambat atau jatuh tempo minggu ini.')}
      ${late.length > 1 ? `<button class="btn ghost full" data-act="wa-queue-late">${WA_SVG}<span>Kirim pengingat ke semua yang terlambat (${new Set(late.map(l => l.spbuId)).size} SPBU)</span></button>` : ''}
    </section>

    <section class="card">
      <div class="sec-head"><h2>SPBU perlu perhatian</h2><a href="#/spbu" class="link">Semua SPBU</a></div>
      ${attention.length ? attention.slice(0, 6).map(({ s, h }) => `
        <div class="att-row">
          <a href="#/s/${s.id}" class="att-main"><span class="dot ${LEVEL[h.level][1]}"></span><div><strong><span class="mono">${esc(s.nomor)}</span> ${esc(s.nama)}</strong><div class="muted small">${esc(h.flags.join(' · ') || `${h.open} TL terbuka`)}</div></div></a>
          ${waBtn(`data-act="wa-spbu" data-id="${s.id}"`)}
        </div>`).join('') : empty('Semua SPBU KSO dalam kondisi baik.')}
    </section>

    ${kontrak.length ? `<section class="card"><div class="sec-head"><h2>Masa kontrak KSO</h2></div>
      ${kontrak.map(s => { const c = contractStatus(s, n, S.settings.warnDays); return `<div class="att-row"><a href="#/s/${s.id}" class="att-main"><span class="dot ${c.key === 'expired' ? 'bad' : 'poor'}"></span><div><strong><span class="mono">${esc(s.nomor)}</span> ${esc(s.nama)}</strong><div class="muted small">${fmtDate(s.akhirKontrak)} · ${c.label}</div></div></a>${waBtn(`data-act="wa-spbu" data-id="${s.id}" data-tpl="tpl-kontrak"`)}</div>`; }).join('')}
    </section>` : ''}`,
  { actions: `<button class="icon-btn" data-act="tl-new" aria-label="Tindak lanjut baru">${icon('plus')}</button>` });
}

// ---------- SPBU ----------
function viewSpbuList() {
  const q = ui.spbuQ.toLowerCase();
  const list = S.spbu.filter(s => !q || [s.nomor, s.nama, s.mitra, s.kota, s.picNama].join(' ').toLowerCase().includes(q))
    .sort((a, b) => String(a.nomor).localeCompare(String(b.nomor)));
  return shell('SPBU KSO', `${S.spbu.length} SPBU terdaftar`, `
    <div class="searchbar">${icon('search')}<input type="search" placeholder="Cari nomor, nama, mitra, kota…" value="${esc(ui.spbuQ)}" data-in="spbuQ"></div>
    <div class="grid" id="spbuGrid">${list.map(spbuCard).join('') || empty(S.spbu.length ? 'Tidak ada yang cocok.' : 'Belum ada SPBU KSO.', `<button class="btn primary" data-act="spbu-new">${icon('plus')}<span>Tambah SPBU</span></button>`)}</div>`,
  { actions: `<button class="icon-btn" data-act="spbu-new" aria-label="Tambah SPBU">${icon('plus')}</button>` });
}

function viewSpbuDetail(s) {
  const n = now();
  const h = spbuHealth(s, S.followups, S.monitoring, n);
  const c = contractStatus(s, n, S.settings.warnDays);
  const tls = sortFollowups(S.followups.filter(f => f.spbuId === s.id), n);
  const mon = S.monitoring.filter(m => m.spbuId === s.id).sort((a, b) => b.periode.localeCompare(a.periode));
  const logs = commLog(s.id);
  const tab = ui.spbuTab;
  const tabs = [['tl', `Tindak Lanjut (${h.open})`], ['mon', 'Monitoring'], ['log', `Komunikasi (${logs.length})`]];

  let body = '';
  if (tab === 'tl') {
    body = `<div class="btn-row"><button class="btn primary" data-act="tl-new" data-spbu="${s.id}">${icon('plus')}<span>Tindak lanjut</span></button>
      ${h.open ? waBtn(`data-act="wa-spbu" data-id="${s.id}" data-tpl="tpl-rekap"`, 'Kirim rekap TL') : ''}</div>
      ${tls.map(t => tlRow(t, false)).join('') || empty('Belum ada tindak lanjut untuk SPBU ini.')}`;
  } else if (tab === 'mon') {
    const chart = [...mon].slice(0, 12).reverse();
    body = `<div class="btn-row"><button class="btn primary" data-act="mon-new" data-spbu="${s.id}">${icon('plus')}<span>Data bulanan</span></button>
      ${h.last ? waBtn(`data-act="wa-spbu" data-id="${s.id}" data-tpl="tpl-kinerja"`, 'Kirim info kinerja') : ''}</div>
      ${chart.length ? `<div class="bars">${chart.map(m => { const a = achievement(m.volume, entryTarget(m, s)); return `<div class="bar-col" title="${fmtPeriode(m.periode)}: ${fmtPct(a)}"><div class="bar-track"><div class="bar ${achievementBand(a)}" style="height:${Math.min(100, (a || 0) * 80)}%"></div><div class="bar-target"></div></div><span class="mono">${m.periode.slice(5)}</span></div>`; }).join('')}</div><p class="muted small center">Garis = target 100%</p>` : ''}
      ${mon.length ? `<div class="table-wrap"><table><thead><tr><th>Periode</th><th class="r">Realisasi (KL)</th><th class="r">Target</th><th class="r">Capaian</th><th>Setoran</th><th></th></tr></thead><tbody>
        ${mon.map(m => { const t = entryTarget(m, s); const a = achievement(m.volume, t); return `<tr data-act="mon-edit" data-id="${m.id}"><td>${fmtPeriode(m.periode)}${m.catatan ? `<div class="muted small">${esc(m.catatan)}</div>` : ''}</td><td class="r mono">${fmtNum(m.volume, 1)}</td><td class="r mono">${fmtNum(t, 1)}</td><td class="r mono t-${achievementBand(a)}">${fmtPct(a)}</td><td>${m.setoran ? pill(SETORAN[m.setoran], { lunas: 'good', sebagian: 'poor', belum: 'bad' }[m.setoran]) : '—'}</td><td>${icon('edit', 'muted')}</td></tr>`; }).join('')}
      </tbody></table></div>` : empty('Belum ada data monitoring bulanan.')}`;
  } else {
    body = logs.length ? `<div class="timeline">${logs.map(l => `<div class="tl-item ${l.type}"><span class="mono muted small">${fmtDateTime(l.ts)}</span><div>${l.type === 'wa' ? WA_SVG : icon('edit')} ${esc(l.text)}${l.tlJudul ? `<div class="muted small">TL: ${esc(l.tlJudul)}</div>` : ''}</div></div>`).join('')}</div>` : empty('Belum ada riwayat komunikasi. Pesan WA yang dikirim dari aplikasi tercatat otomatis di sini.');
  }

  return shell(s.nama, `SPBU ${s.nomor}`, `
    <section class="card info-card">
      <div class="row-between"><span class="mono code">${esc(s.nomor)}</span>${pill(LEVEL[h.level][0], LEVEL[h.level][1])}</div>
      <h2>${esc(s.nama)}</h2>
      <dl class="info">
        <div><dt>Mitra KSO</dt><dd>${esc(s.mitra || '—')}</dd></div>
        <div><dt>PIC mitra</dt><dd>${esc(s.picNama || '—')}${s.picJabatan ? ` <span class="muted">(${esc(s.picJabatan)})</span>` : ''}<br>${s.picWa ? `<span class="mono">${esc(displayPhone(s.picWa))}</span>` : '<span class="muted">No. WA belum diisi</span>'}</dd></div>
        <div><dt>Lokasi</dt><dd>${esc([s.alamat, s.kota].filter(Boolean).join(', ') || '—')}</dd></div>
        <div><dt>Kontrak</dt><dd>${fmtDate(s.mulaiKontrak)} – ${fmtDate(s.akhirKontrak)}<br><span class="${c.key === 'expired' ? 't-bad' : c.key === 'soon' ? 't-poor' : 'muted'}">${c.label}</span></dd></div>
        <div><dt>Target volume</dt><dd class="mono">${s.targetVolume ? fmtNum(s.targetVolume, 1) + ' KL/bulan' : '—'}</dd></div>
        ${s.catatan ? `<div><dt>Catatan</dt><dd>${esc(s.catatan)}</dd></div>` : ''}
      </dl>
      <div class="card-actions">
        ${waBtn(`data-act="wa-spbu" data-id="${s.id}"`, 'Chat PIC')}
        <button class="btn ghost" data-act="materi-to" data-id="${s.id}">${icon('book')}<span>Kirim materi</span></button>
        <button class="btn ghost" data-act="spbu-edit" data-id="${s.id}">${icon('edit')}<span>Ubah</span></button>
      </div>
    </section>
    <div class="seg">${tabs.map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="spbu-tab" data-tab="${k}">${l}</button>`).join('')}</div>
    <section class="card">${body}</section>`, { back: 'spbu' });
}

function commLog(spbuId) {
  const out = [];
  const s = spbuById(spbuId);
  for (const l of s?.log || []) out.push(l);
  for (const f of S.followups) if (f.spbuId === spbuId) for (const l of f.log || []) out.push({ ...l, tlJudul: f.judul });
  return out.sort((a, b) => b.ts - a.ts);
}

// ---------- Tindak lanjut ----------
function filteredTl() {
  const f = ui.tlFilter, n = now();
  const q = f.q.toLowerCase();
  return sortFollowups(S.followups.filter(t => {
    if (f.status === 'aktif' && t.status === 'selesai') return false;
    if (f.status === 'late' && !isOverdue(t, n)) return false;
    if (['open', 'proses', 'selesai'].includes(f.status) && t.status !== f.status) return false;
    if (f.kategori && t.kategori !== f.kategori) return false;
    if (f.spbu && t.spbuId !== f.spbu) return false;
    if (q) { const s = spbuById(t.spbuId); if (![t.judul, t.deskripsi, t.pic, s?.nama, s?.nomor].join(' ').toLowerCase().includes(q)) return false; }
    return true;
  }), n);
}

function viewTl() {
  const f = ui.tlFilter;
  const list = filteredTl();
  const sel = (key, opts) => `<select data-tlf="${key}">${opts.map(([v, l]) => `<option value="${esc(v)}" ${f[key] === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  return shell('Tindak Lanjut', `${list.length} item`, `
    <div class="searchbar">${icon('search')}<input type="search" placeholder="Cari tindak lanjut…" value="${esc(f.q)}" data-in="tlQ"></div>
    <div class="filters">
      ${sel('status', [['aktif', 'Belum selesai'], ['late', 'Terlambat'], ['open', STATUS_TL.open], ['proses', STATUS_TL.proses], ['selesai', STATUS_TL.selesai], ['all', 'Semua status']])}
      ${sel('kategori', [['', 'Semua kategori'], ...KATEGORI_TL.map(k => [k, k])])}
      ${sel('spbu', [['', 'Semua SPBU'], ...S.spbu.map(s => [s.id, `${s.nomor} ${s.nama}`])])}
    </div>
    <section class="card" id="tlList">${list.map(t => tlRow(t)).join('') || empty('Tidak ada tindak lanjut.')}</section>
    <button class="btn ghost full" data-act="csv-tl">${icon('download')}<span>Unduh CSV (sesuai filter)</span></button>`,
  { actions: `<button class="icon-btn" data-act="tl-new" aria-label="Tindak lanjut baru">${icon('plus')}</button>` });
}

// ---------- Materi ----------
function viewMateri() {
  const kats = [...new Set(S.materi.map(m => m.kategori))];
  const list = S.materi.filter(m => !ui.materiKat || m.kategori === ui.materiKat).sort((a, b) => b.createdAt - a.createdAt);
  return shell('Materi', 'Bahan sosialisasi & dokumen untuk mitra', `
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
      </div>`).join('') || empty('Belum ada materi. Unggah file (PDF, gambar, dokumen) atau simpan link (Google Drive, YouTube, dll).', `<button class="btn primary" data-act="materi-new">${icon('plus')}<span>Tambah materi</span></button>`)}</div>`,
  { actions: `<button class="icon-btn" data-act="materi-new" aria-label="Tambah materi">${icon('plus')}</button>` });
}

// ---------- Pengaturan ----------
function viewSettings() {
  const st = S.settings;
  return shell('Pengaturan', 'Pengirim, template WA & cadangan data', `
    <section class="card">
      <h2>Identitas pengirim</h2>
      <p class="muted small">Dipakai di tanda tangan pesan WA ({pengirim} / {jabatan}).</p>
      <form data-form="settings" class="form">
        ${field({ k: 'pengirim', l: 'Nama', ph: 'mis. Ariandi' }, st)}
        ${field({ k: 'jabatan', l: 'Jabatan', ph: 'mis. Area Business Head' }, st)}
        ${field({ k: 'warnDays', l: 'Peringatan kontrak berakhir (hari)', t: 'number' }, st)}
        <button class="btn primary">Simpan</button>
      </form>
    </section>
    <section class="card">
      <div class="sec-head"><h2>Template pesan WA</h2><button class="btn ghost sm" data-act="tpl-new">${icon('plus')}<span>Baru</span></button></div>
      ${templates().map(t => `<button class="list-btn" data-act="tpl-edit" data-id="${t.id}"><strong>${esc(t.nama)}</strong><span class="muted small">${esc(t.isi.slice(0, 90))}…</span></button>`).join('')}
      ${S.templates ? `<button class="btn ghost full" data-act="tpl-reset">Kembalikan template bawaan</button>` : ''}
    </section>
    <section class="card">
      <h2>Data</h2>
      <p class="muted small">Data tersimpan di perangkat ini (IndexedDB). Buat cadangan berkala, lalu pulihkan di perangkat lain bila perlu.</p>
      <div class="btn-col">
        <button class="btn ghost" data-act="backup">${icon('download')}<span>Unduh cadangan (.json, termasuk file materi)</span></button>
        <label class="btn ghost">${icon('file')}<span>Pulihkan dari cadangan</span><input type="file" accept="application/json,.json" data-file="restore" hidden></label>
        <button class="btn ghost" data-act="csv-spbu">${icon('download')}<span>Rekap SPBU (CSV)</span></button>
        <button class="btn ghost" data-act="csv-mon">${icon('download')}<span>Data monitoring (CSV)</span></button>
        <button class="btn danger" data-act="wipe">${icon('trash')}<span>Hapus semua data</span></button>
      </div>
    </section>
    <p class="foot muted small center">© Task Force Audit SPBU · Monitoring KSO</p>`);
}

// ---------- form & modal ----------
function field(f, v = {}) {
  const val = v[f.k] ?? f.def ?? '';
  const req = f.req ? 'required' : '';
  let input;
  if (f.t === 'select') input = `<select name="${f.k}" ${req}>${f.opts.map(o => { const [ov, ol] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(ov)}" ${String(val) === String(ov) ? 'selected' : ''}>${esc(ol)}</option>`; }).join('')}</select>`;
  else if (f.t === 'textarea') input = `<textarea name="${f.k}" rows="${f.rows || 3}" placeholder="${esc(f.ph || '')}" ${req}>${esc(val)}</textarea>`;
  else input = `<input name="${f.k}" type="${f.t || 'text'}" value="${esc(val)}" placeholder="${esc(f.ph || '')}" ${f.t === 'number' ? 'step="any" inputmode="decimal"' : ''} ${f.t === 'tel' ? 'inputmode="tel"' : ''} ${req}>`;
  return `<label class="fld ${f.half ? 'half' : ''}"><span>${esc(f.l)}${f.req ? ' *' : ''}</span>${input}${f.hint ? `<small class="muted">${f.hint}</small>` : ''}</label>`;
}
const readForm = form => Object.fromEntries(new FormData(form).entries());

let modalHandler = null;
function modal(title, inner, { onSubmit = null, wide = false } = {}) {
  closeModal();
  const el = document.createElement('div');
  el.className = 'modal-bg';
  el.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true"><div class="modal-head"><h2>${esc(title)}</h2><button class="icon-btn sm" data-act="modal-close" aria-label="Tutup">${icon('x')}</button></div><div class="modal-body">${inner}</div></div>`;
  document.body.appendChild(el);
  document.body.classList.add('modal-open');
  modalHandler = onSubmit;
  el.addEventListener('click', e => { if (e.target === el) closeModal(); });
  el.querySelector('input:not([type=hidden]):not([type=file]),textarea')?.focus({ preventScroll: true });
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
  setTimeout(() => t.classList.add('out'), 2200);
  setTimeout(() => t.remove(), 2600);
}

// SPBU form
const SPBU_FIELDS = [
  { k: 'nomor', l: 'Nomor SPBU', ph: 'mis. 54.641.01', req: true, half: true },
  { k: 'nama', l: 'Nama SPBU', ph: 'mis. SPBU Pare', req: true, half: true },
  { k: 'mitra', l: 'Mitra KSO (perusahaan)', ph: 'mis. PT ...' },
  { k: 'picNama', l: 'Nama PIC mitra', half: true },
  { k: 'picJabatan', l: 'Jabatan PIC', ph: 'Pemilik / Pengawas', half: true },
  { k: 'picWa', l: 'No. WhatsApp PIC', t: 'tel', ph: '08xx-xxxx-xxxx', hint: 'Format 08… atau +62… otomatis dikonversi.' },
  { k: 'kota', l: 'Kota / Kab.', half: true },
  { k: 'targetVolume', l: 'Target volume (KL/bulan)', t: 'number', half: true },
  { k: 'alamat', l: 'Alamat' },
  { k: 'mulaiKontrak', l: 'Mulai kontrak KSO', t: 'date', half: true },
  { k: 'akhirKontrak', l: 'Akhir kontrak KSO', t: 'date', half: true },
  { k: 'catatan', l: 'Catatan', t: 'textarea', rows: 2 },
];
function spbuForm(s = null) {
  modal(s ? 'Ubah SPBU KSO' : 'Tambah SPBU KSO', `<form class="form" data-form="modal">${SPBU_FIELDS.map(f => field(f, s || {})).join('')}
    <div class="btn-row">${s ? `<button type="button" class="btn danger" data-act="spbu-del" data-id="${s.id}">${icon('trash')}<span>Hapus</span></button>` : ''}<button class="btn primary grow">Simpan</button></div></form>`, {
    onSubmit: d => {
      if (d.picWa && !normalizePhone(d.picWa)) { toast('Nomor WA tidak valid'); return false; }
      if (s) Object.assign(s, d);
      else { const n = { id: uid('spbu'), log: [], ...d }; S.spbu.push(n); location.hash = '#/s/' + n.id; }
      persist(); return true;
    },
  });
}

// Tindak lanjut form
function tlForm(tl = null, spbuId = '') {
  const v = tl || { spbuId: spbuId || (route()[0] === 's' ? route()[1] : ''), status: 'open', prioritas: 'sedang', kategori: KATEGORI_TL[0], tenggat: plusDays(14) };
  if (!S.spbu.length) { toast('Tambahkan SPBU KSO terlebih dahulu'); return spbuForm(); }
  modal(tl ? 'Ubah tindak lanjut' : 'Tindak lanjut baru', `<form class="form" data-form="modal">
    ${field({ k: 'spbuId', l: 'SPBU', t: 'select', req: true, opts: S.spbu.map(s => [s.id, `${s.nomor} — ${s.nama}`]) }, v)}
    ${field({ k: 'judul', l: 'Temuan / tindak lanjut', req: true, ph: 'mis. Perbaikan nozzle bocor dispenser 3' }, v)}
    ${field({ k: 'deskripsi', l: 'Detail / langkah yang diminta', t: 'textarea' }, v)}
    ${field({ k: 'kategori', l: 'Kategori', t: 'select', opts: KATEGORI_TL, half: true }, v)}
    ${field({ k: 'prioritas', l: 'Prioritas', t: 'select', opts: Object.entries(PRIORITAS), half: true }, v)}
    ${field({ k: 'tenggat', l: 'Tenggat', t: 'date', half: true }, v)}
    ${field({ k: 'status', l: 'Status', t: 'select', opts: Object.entries(STATUS_TL), half: true }, v)}
    ${field({ k: 'pic', l: 'PIC pelaksana', ph: 'mis. Pengawas SPBU' }, v)}
    ${field({ k: 'sumber', l: 'Sumber temuan', ph: 'mis. Audit Pertamina Way 10 Nov, kunjungan, laporan konsumen' }, v)}
    <div class="btn-row">${tl ? `<button type="button" class="btn danger" data-act="tl-del" data-id="${tl.id}">${icon('trash')}<span>Hapus</span></button>` : ''}<button class="btn primary grow">Simpan</button></div></form>`, {
    onSubmit: d => {
      if (tl) { const prev = tl.status; Object.assign(tl, d); statusChanged(tl, prev); }
      else { const n = { id: uid('tl'), createdAt: Date.now(), log: [{ ts: Date.now(), type: 'note', text: 'Tindak lanjut dibuat' }], ...d }; S.followups.push(n); if (n.status === 'selesai') n.selesaiAt = todayISO(); }
      persist(); return true;
    },
  });
}
function plusDays(n) { const d = new Date(); d.setDate(d.getDate() + n); return todayISO(d); }
function statusChanged(tl, prev) {
  if (prev === tl.status) return;
  tl.log = tl.log || [];
  tl.log.push({ ts: Date.now(), type: 'status', text: `Status: ${STATUS_TL[prev]} → ${STATUS_TL[tl.status]}` });
  tl.selesaiAt = tl.status === 'selesai' ? todayISO() : undefined;
}

function tlDetail(tl) {
  const s = spbuById(tl.spbuId);
  modal('Tindak lanjut', `
    <div class="tl-detail">
      <div class="tl-top">${statusPill(tl)}<span class="muted small cat">${esc(tl.kategori || '')}</span>${pill(`Prioritas ${PRIORITAS[tl.prioritas] || '-'}`, tl.prioritas === 'tinggi' ? 'bad soft' : 'none')}</div>
      <h3>${esc(tl.judul)}</h3>
      ${tl.deskripsi ? `<p>${esc(tl.deskripsi)}</p>` : ''}
      <dl class="info compact">
        <div><dt>SPBU</dt><dd><a href="#/s/${s?.id}" data-act="modal-close">${esc(s ? `${s.nomor} ${s.nama}` : '—')}</a></dd></div>
        <div><dt>Tenggat</dt><dd>${fmtDate(tl.tenggat)} · ${dueLabel(tl, now())}</dd></div>
        ${tl.pic ? `<div><dt>PIC</dt><dd>${esc(tl.pic)}</dd></div>` : ''}
        ${tl.sumber ? `<div><dt>Sumber</dt><dd>${esc(tl.sumber)}</dd></div>` : ''}
      </dl>
      <div class="seg status-seg">${Object.entries(STATUS_TL).map(([k, l]) => `<button class="${tl.status === k ? 'on' : ''}" data-act="tl-status" data-id="${tl.id}" data-s="${k}">${l}</button>`).join('')}</div>
      <div class="btn-row">
        ${waBtn(`data-act="wa-tl" data-id="${tl.id}"`, 'Kirim pengingat WA')}
        <button class="btn ghost" data-act="tl-edit" data-id="${tl.id}">${icon('edit')}<span>Ubah</span></button>
      </div>
      <h4>Riwayat</h4>
      <form class="note-form" data-form="note" data-id="${tl.id}"><input name="text" placeholder="Tambah catatan progres / balasan mitra…" required><button class="btn primary sm">Catat</button></form>
      <div class="timeline">${[...(tl.log || [])].reverse().map(l => `<div class="tl-item ${l.type}"><span class="mono muted small">${fmtDateTime(l.ts)}</span><div>${l.type === 'wa' ? WA_SVG + ' ' : ''}${esc(l.text)}</div></div>`).join('') || '<p class="muted small">Belum ada riwayat.</p>'}</div>
    </div>`);
}

// Monitoring form
function monForm(spbuId, m = null) {
  const s = spbuById(spbuId);
  const d = new Date(); d.setMonth(d.getMonth() - 1);
  const v = m || { periode: todayISO(d).slice(0, 7), target: s.targetVolume || '', setoran: 'lunas' };
  modal(m ? 'Ubah data bulanan' : 'Data monitoring bulanan', `<form class="form" data-form="modal">
    ${field({ k: 'periode', l: 'Periode', t: 'month', req: true, half: true }, v)}
    ${field({ k: 'volume', l: 'Realisasi volume (KL)', t: 'number', req: true, half: true }, v)}
    ${field({ k: 'target', l: 'Target (KL)', t: 'number', half: true, hint: 'Kosong = target SPBU' }, v)}
    ${field({ k: 'setoran', l: 'Setoran / bagi hasil', t: 'select', opts: Object.entries(SETORAN), half: true }, v)}
    ${field({ k: 'nilaiAudit', l: 'Nilai audit / mystery guest (opsional)', ph: 'mis. TS 82% Good' }, v)}
    ${field({ k: 'catatan', l: 'Catatan', t: 'textarea', rows: 2 }, v)}
    <div class="btn-row">${m ? `<button type="button" class="btn danger" data-act="mon-del" data-id="${m.id}">${icon('trash')}<span>Hapus</span></button>` : ''}<button class="btn primary grow">Simpan</button></div></form>`, {
    onSubmit: d2 => {
      const dup = S.monitoring.find(x => x.spbuId === spbuId && x.periode === d2.periode && x !== m);
      if (dup) { toast(`Periode ${fmtPeriode(d2.periode)} sudah ada`); return false; }
      if (m) Object.assign(m, d2); else S.monitoring.push({ id: uid('mon'), spbuId, ...d2 });
      persist(); return true;
    },
  });
}

// Materi form
function materiForm(m = null) {
  modal(m ? 'Ubah materi' : 'Tambah materi', `<form class="form" data-form="modal">
    ${field({ k: 'judul', l: 'Judul materi', req: true }, m || {})}
    ${field({ k: 'kategori', l: 'Kategori', t: 'select', opts: KATEGORI_MATERI }, m || {})}
    ${field({ k: 'deskripsi', l: 'Keterangan singkat', t: 'textarea', rows: 2 }, m || {})}
    ${m?.fileId ? `<p class="muted small">File: <span class="mono">${esc(m.fileName)}</span> (${fmtSize(m.size)})</p>` : ''}
    <label class="fld"><span>${m?.fileId ? 'Ganti file' : 'File'} (PDF, gambar, video, dokumen)</span><input type="file" name="file"></label>
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

// Template form
function tplForm(t = null) {
  modal(t ? 'Ubah template' : 'Template baru', `<form class="form" data-form="modal">
    ${field({ k: 'nama', l: 'Nama template', req: true }, t || {})}
    ${field({ k: 'untuk', l: 'Dipakai untuk', t: 'select', opts: [['spbu', 'Chat SPBU'], ['tindak', 'Pengingat tindak lanjut'], ['materi', 'Kirim materi']] }, t || {})}
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
function varsFor({ spbu, tl, materi }) {
  const n = now();
  const last = spbu ? latestMonitoring(S.monitoring, spbu.id) : null;
  const target = last ? entryTarget(last, spbu) : Number(spbu?.targetVolume) || '';
  return {
    salam: greeting(n), pengirim: S.settings.pengirim, jabatan: S.settings.jabatan,
    pic: spbu?.picNama || '', spbu: spbu?.nama || '', nomor: spbu?.nomor || '', mitra: spbu?.mitra || '',
    akhirKontrak: spbu?.akhirKontrak ? fmtDate(spbu.akhirKontrak) : '-',
    periode: last ? fmtPeriode(last.periode) : '-', volume: last ? fmtNum(last.volume, 1) : '-', target: target ? fmtNum(target, 1) : '-',
    capaian: last ? fmtPct(achievement(last.volume, target)) : '-',
    daftar: spbu ? openListText(S.followups, spbu.id, n, fmtDate) : '',
    judul: tl?.judul || '', detail: tl?.deskripsi || '', tenggat: tl?.tenggat ? `${fmtDate(tl.tenggat)} (${dueLabel(tl, n)})` : '-',
    status: tl ? STATUS_TL[tl.status] : '',
    materi: materi?.judul || '', link: materi?.url || (materi?.fileId ? `(file terlampir: ${materi.fileName})` : ''),
  };
}

/** Composer WA: pilih template → pratinjau bisa diedit → buka WhatsApp; terkirim tercatat di riwayat. */
async function waCompose({ spbu, tl = null, materi = null, tplId = '', onSent = null }) {
  const kind = materi ? 'materi' : tl ? 'tindak' : 'spbu';
  const list = templates();
  const tpl = list.find(t => t.id === tplId) || list.find(t => t.untuk === kind) || list[0];
  const vars = varsFor({ spbu, tl, materi });
  const phone = normalizePhone(spbu?.picWa);
  let fileObj = null;
  if (materi?.fileId) {
    const blob = await getFile(materi.fileId);
    if (blob) fileObj = new File([blob], materi.fileName || 'materi', { type: materi.fileType || blob.type });
  }
  const canShareFile = !!(fileObj && navigator.canShare && navigator.canShare({ files: [fileObj] }));
  const el = modal(`WhatsApp · ${spbu ? spbu.nama : ''}`, `
    <div class="wa-compose">
      <div class="wa-to">${WA_SVG}<div><strong>${esc(spbu?.picNama || 'PIC belum diisi')}</strong>${phone ? `<span class="mono">${esc(displayPhone(phone))}</span>` : '<span>Nomor WA belum diisi — pilih kontak di WhatsApp</span>'}</div></div>
      <label class="fld"><span>Template</span><select data-wa="tpl">${list.map(t => `<option value="${t.id}" ${t.id === tpl.id ? 'selected' : ''}>${esc(t.nama)}</option>`).join('')}</select></label>
      <label class="fld"><span>Pesan (bisa diedit)</span><textarea rows="11" data-wa="text">${esc(fillTemplate(tpl.isi, vars))}</textarea></label>
      ${materi?.fileId ? `<p class="muted small">${canShareFile ? 'File materi akan dibagikan lewat menu Bagikan — pilih WhatsApp lalu kontak/grup tujuan.' : 'Perangkat ini tidak bisa melampirkan file langsung. File diunduh, lalu lampirkan manual di WhatsApp.'}</p>` : ''}
      <div class="btn-col">
        ${materi?.fileId ? `<button class="btn wa-btn big" data-wa="share">${WA_SVG}<span>${canShareFile ? 'Bagikan file + pesan' : 'Unduh file & buka WhatsApp'}</span></button>` : ''}
        <button class="btn ${materi?.fileId ? 'ghost' : 'wa-btn big'}" data-wa="open">${WA_SVG}<span>${phone ? `Buka chat ${esc(displayPhone(phone))}` : 'Buka WhatsApp'}</span></button>
        <div class="btn-row">
          ${phone ? `<button class="btn ghost grow" data-wa="group">${icon('share')}<span>Kirim ke grup/kontak lain</span></button>` : ''}
          <button class="btn ghost grow" data-wa="copy">${icon('copy')}<span>Salin</span></button>
        </div>
      </div>
    </div>`);
  const ta = el.querySelector('[data-wa=text]');
  el.querySelector('[data-wa=tpl]').addEventListener('change', e => { const t = list.find(x => x.id === e.target.value); ta.value = fillTemplate(t.isi, vars); });
  const logIt = how => {
    const tname = list.find(x => x.id === el.querySelector('[data-wa=tpl]').value)?.nama || 'Pesan';
    const entry = { ts: Date.now(), type: 'wa', text: `WA ${how}: ${tname}${materi ? ` — ${materi.judul}` : ''}`, msg: ta.value };
    if (tl) (tl.log = tl.log || []).push(entry);
    else if (spbu) (spbu.log = spbu.log || []).push(entry);
    if (materi) materi.sentCount = (materi.sentCount || 0) + 1;
    persist();
    onSent?.();
  };
  el.addEventListener('click', async e => {
    const b = e.target.closest('[data-wa]');
    if (!b || b.tagName === 'SELECT' || b.tagName === 'TEXTAREA') return;
    const text = ta.value;
    const k = b.dataset.wa;
    if (k === 'open' || k === 'group') {
      window.open(waLink(k === 'open' ? phone : '', text), '_blank', 'noopener');
      logIt(k === 'open' ? `ke ${spbu?.picNama || 'PIC'}` : 'ke grup/kontak lain'); closeModal(); render();
    } else if (k === 'copy') {
      await navigator.clipboard?.writeText(text).catch(() => {}); toast('Pesan disalin');
    } else if (k === 'share') {
      if (canShareFile) {
        try { await navigator.share({ files: [fileObj], text }); logIt('dibagikan'); closeModal(); render(); }
        catch (err) { if (err?.name !== 'AbortError') toast('Gagal membagikan: ' + err.message); }
      } else {
        downloadBlob(fileObj, fileObj.name);
        window.open(waLink(phone, text), '_blank', 'noopener');
        logIt('+ file diunduh'); closeModal(); render();
      }
    }
  });
}

/** Antrian kirim berurutan ke banyak SPBU (wa.me tidak mendukung broadcast). */
function waQueue(title, items) {
  const el = modal(title, `<p class="muted small">WhatsApp tidak mengizinkan kirim massal otomatis. Ketuk tiap SPBU berurutan — pesan sudah disiapkan & ditandai ✓ setelah dibuka.</p>
    <div class="queue">${items.map((it, i) => `<div class="att-row" data-q="${i}"><div class="att-main"><span class="dot ${it.done ? 'good' : 'none'}"></span><div><strong><span class="mono">${esc(it.spbu.nomor)}</span> ${esc(it.spbu.nama)}</strong><div class="muted small">${esc(it.sub || it.spbu.picNama || '')}</div></div></div>${waBtn(`data-qi="${i}"`, 'Kirim')}</div>`).join('')}</div>`, { wide: true });
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-qi]');
    if (!b) return;
    const it = items[+b.dataset.qi];
    closeModal();
    waCompose({ ...it, onSent: () => { it.done = true; setTimeout(() => waQueue(title, items), 50); } });
  });
}

function materiTo(spbu) {
  if (!S.materi.length) { toast('Belum ada materi — tambahkan di tab Materi'); return go('materi'); }
  const el = modal(`Kirim materi ke ${spbu.nama}`, S.materi.map(m => `<button class="list-btn" data-mid="${m.id}"><strong>${icon(m.fileId ? 'file' : 'link')} ${esc(m.judul)}</strong><span class="muted small">${esc(m.kategori)} · dikirim ${m.sentCount || 0}×</span></button>`).join(''));
  el.addEventListener('click', e => { const b = e.target.closest('[data-mid]'); if (b) { closeModal(); waCompose({ spbu, materi: materiById(b.dataset.mid) }); } });
}

function materiSend(m) {
  if (!S.spbu.length) return toast('Belum ada SPBU KSO');
  const el = modal(`Kirim: ${m.judul}`, `<p class="muted small">Pilih SPBU tujuan.</p>
    <div class="check-list">${S.spbu.map(s => `<label><input type="checkbox" value="${s.id}" checked><span><span class="mono">${esc(s.nomor)}</span> ${esc(s.nama)}<small class="muted"> · ${esc(s.picNama || 'PIC -')}</small></span></label>`).join('')}</div>
    <button class="btn primary full" data-act="noop" id="msGo">Lanjut</button>`);
  el.querySelector('#msGo').addEventListener('click', () => {
    const ids = [...el.querySelectorAll('input:checked')].map(i => i.value);
    if (!ids.length) return toast('Pilih minimal satu SPBU');
    closeModal();
    if (ids.length === 1) waCompose({ spbu: spbuById(ids[0]), materi: m });
    else waQueue(`Kirim materi ke ${ids.length} SPBU`, ids.map(id => ({ spbu: spbuById(id), materi: m })));
  });
}

// ---------- ekspor / cadangan ----------
function downloadBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const csvDownload = (rows, name) => downloadBlob(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }), name);
const blobToDataUrl = b => new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); });

async function backup() {
  const files = await allFiles();
  const enc = {};
  for (const [k, b] of Object.entries(files)) enc[k] = await blobToDataUrl(b);
  const data = { app: 'monitoring-kso', exportedAt: new Date().toISOString(), state: S, files: enc };
  downloadBlob(new Blob([JSON.stringify(data)], { type: 'application/json' }), `cadangan-kso-${todayISO()}.json`);
}
async function restore(file) {
  try {
    const data = JSON.parse(await file.text());
    if (data.app !== 'monitoring-kso' || !data.state) throw new Error('Bukan file cadangan Monitoring KSO');
    if (!confirm(`Pulihkan cadangan ${fmtDateTime(Date.parse(data.exportedAt))}? Data di perangkat ini akan diganti.`)) return;
    for (const [k, u] of Object.entries(data.files || {})) await putFile(k, await (await fetch(u)).blob());
    S = { ...emptyState(), ...data.state };
    await saveState(S, true);
    toast('Cadangan dipulihkan'); render();
  } catch (e) { alert('Gagal memulihkan: ' + e.message); }
}

function loadDemo() {
  const d = n => plusDays(n);
  const ym = k => { const x = new Date(); x.setDate(1); x.setMonth(x.getMonth() - k); return todayISO(x).slice(0, 7); };
  const mk = (nomor, nama, kota, target, akhir) => ({ id: uid('spbu'), nomor, nama, kota, mitra: 'PT Contoh Mitra (data contoh)', picNama: 'Budi (contoh)', picJabatan: 'Pengawas', picWa: '', targetVolume: target, mulaiKontrak: '2022-01-01', akhirKontrak: akhir, alamat: '', catatan: 'Data contoh — ubah atau hapus.', log: [] });
  const a = mk('00.000.01', 'SPBU Contoh A', 'Kediri', 450, d(60));
  const b = mk('00.000.02', 'SPBU Contoh B', 'Nganjuk', 380, '2029-06-30');
  const c = mk('00.000.03', 'SPBU Contoh C', 'Kediri', 300, '2028-12-31');
  S.spbu.push(a, b, c);
  [[a, [470, 455, 430]], [b, [300, 320, 290]], [c, [310, 305, 298]]].forEach(([s, vs]) => vs.forEach((v, i) => S.monitoring.push({ id: uid('mon'), spbuId: s.id, periode: ym(i + 1), volume: v, target: '', setoran: s === b && i === 0 ? 'sebagian' : 'lunas', catatan: '' })));
  const tl = (s, judul, kategori, tenggat, status = 'open', prioritas = 'sedang') => S.followups.push({ id: uid('tl'), spbuId: s.id, judul, kategori, tenggat, status, prioritas, deskripsi: '', pic: 'Pengawas SPBU', sumber: 'Data contoh', createdAt: Date.now(), log: [{ ts: Date.now(), type: 'note', text: 'Tindak lanjut dibuat' }] });
  tl(a, 'Perbaikan nozzle bocor dispenser 2', 'Fasilitas & Peralatan', d(-3), 'proses', 'tinggi');
  tl(a, 'Lengkapi APAR di area pulau pompa', 'HSSE', d(5));
  tl(b, 'Program peningkatan volume (promo & pelayanan)', 'Pelayanan', d(20));
  tl(b, 'Pelunasan kekurangan setoran bagi hasil', 'Keuangan / Bagi Hasil', d(-1), 'open', 'tinggi');
  tl(c, 'Refreshment SOP pelayanan operator', 'SDM', d(-10), 'selesai');
  persist(); render(); toast('Data contoh dimuat');
}

// ---------- event delegation ----------
app.addEventListener('input', e => {
  const k = e.target.dataset.in;
  if (k === 'spbuQ') { ui.spbuQ = e.target.value; const g = document.getElementById('spbuGrid'); if (g) { const pos = e.target.selectionStart; render(); const inp = app.querySelector('[data-in=spbuQ]'); inp.focus(); inp.setSelectionRange(pos, pos); } }
  if (k === 'tlQ') { ui.tlFilter.q = e.target.value; const pos = e.target.selectionStart; render(); const inp = app.querySelector('[data-in=tlQ]'); inp.focus(); inp.setSelectionRange(pos, pos); }
});
app.addEventListener('change', e => {
  if (e.target.dataset.tlf) { ui.tlFilter[e.target.dataset.tlf] = e.target.value; render(); }
  if (e.target.dataset.file === 'restore' && e.target.files[0]) restore(e.target.files[0]);
});

document.addEventListener('submit', async e => {
  const form = e.target;
  const kind = form.dataset.form;
  if (!kind) return;
  e.preventDefault();
  if (kind === 'modal' && modalHandler) {
    const btn = form.querySelector('button.primary'); if (btn) btn.disabled = true;
    const ok = await modalHandler(readForm(form), form);
    if (btn) btn.disabled = false;
    if (ok) { closeModal(); render(); toast('Tersimpan'); }
  } else if (kind === 'settings') {
    const d = readForm(form);
    Object.assign(S.settings, d, { warnDays: Number(d.warnDays) || 90 });
    persist(); toast('Pengaturan disimpan'); render();
  } else if (kind === 'note') {
    const tl = tlById(form.dataset.id);
    (tl.log = tl.log || []).push({ ts: Date.now(), type: 'note', text: readForm(form).text });
    persist(); tlDetail(tl); render();
  }
});

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const { act, id } = b.dataset;
  switch (act) {
    case 'modal-close': closeModal(); break;
    case 'demo': loadDemo(); break;
    case 'spbu-new': spbuForm(); break;
    case 'spbu-edit': spbuForm(spbuById(id)); break;
    case 'spbu-del': {
      const s = spbuById(id);
      if (!confirm(`Hapus ${s.nama} beserta semua tindak lanjut & data monitoringnya?`)) return;
      S.spbu = S.spbu.filter(x => x.id !== id);
      S.followups = S.followups.filter(x => x.spbuId !== id);
      S.monitoring = S.monitoring.filter(x => x.spbuId !== id);
      persist(); closeModal(); go('spbu'); break;
    }
    case 'spbu-tab': ui.spbuTab = b.dataset.tab; render(); break;
    case 'tl-new': e.preventDefault(); tlForm(null, b.dataset.spbu); break;
    case 'tl-late': e.preventDefault(); ui.tlFilter = { status: 'late', kategori: '', spbu: '', q: '' }; go('tl'); break;
    case 'tl-open': tlDetail(tlById(id)); break;
    case 'tl-edit': tlForm(tlById(id)); break;
    case 'tl-del': if (confirm('Hapus tindak lanjut ini?')) { S.followups = S.followups.filter(x => x.id !== id); persist(); closeModal(); render(); } break;
    case 'tl-status': { const tl = tlById(id); const prev = tl.status; tl.status = b.dataset.s; statusChanged(tl, prev); persist(); tlDetail(tl); render(); break; }
    case 'mon-new': monForm(b.dataset.spbu); break;
    case 'mon-edit': { const m = S.monitoring.find(x => x.id === id); monForm(m.spbuId, m); break; }
    case 'mon-del': if (confirm('Hapus data bulan ini?')) { S.monitoring = S.monitoring.filter(x => x.id !== id); persist(); closeModal(); render(); } break;
    case 'wa-spbu': waCompose({ spbu: spbuById(id), tplId: b.dataset.tpl }); break;
    case 'wa-tl': { const tl = tlById(id); waCompose({ spbu: spbuById(tl.spbuId), tl }); break; }
    case 'wa-queue-late': {
      const late = S.followups.filter(f => isOverdue(f, now()));
      const ids = [...new Set(late.map(f => f.spbuId))];
      waQueue('Pengingat tindak lanjut terlambat', ids.map(sid => ({ spbu: spbuById(sid), tplId: 'tpl-rekap', sub: `${late.filter(f => f.spbuId === sid).length} TL terlambat` })));
      break;
    }
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
      if (m.fileId) { const blob = await getFile(m.fileId); if (!blob) return toast('File tidak ditemukan'); const url = URL.createObjectURL(blob); window.open(url, '_blank') || downloadBlob(blob, m.fileName); setTimeout(() => URL.revokeObjectURL(url), 60000); }
      else if (m.url) window.open(m.url, '_blank', 'noopener');
      break;
    }
    case 'materi-send': materiSend(materiById(id)); break;
    case 'materi-to': materiTo(spbuById(id)); break;
    case 'tpl-new': tplForm(); break;
    case 'tpl-edit': tplForm(templates().find(t => t.id === id)); break;
    case 'tpl-del': if (confirm('Hapus template ini?')) { if (!S.templates) S.templates = DEFAULT_TEMPLATES.map(x => ({ ...x })); S.templates = S.templates.filter(t => t.id !== id); persist(); closeModal(); render(); } break;
    case 'tpl-reset': if (confirm('Kembalikan semua template ke bawaan?')) { S.templates = null; persist(); render(); } break;
    case 'ph-insert': {
      const ta = b.closest('form').querySelector('textarea[name=isi]');
      const p = ta.selectionStart ?? ta.value.length;
      ta.value = ta.value.slice(0, p) + `{${b.dataset.ph}}` + ta.value.slice(ta.selectionEnd ?? p);
      ta.focus(); break;
    }
    case 'backup': backup(); break;
    case 'csv-tl': csvDownload([['Nomor SPBU', 'Nama SPBU', 'Tindak lanjut', 'Detail', 'Kategori', 'Prioritas', 'Tenggat', 'Status', 'Keterangan', 'PIC', 'Sumber', 'Jumlah WA'],
      ...filteredTl().map(t => { const s = spbuById(t.spbuId); return [s?.nomor, s?.nama, t.judul, t.deskripsi, t.kategori, PRIORITAS[t.prioritas], t.tenggat, STATUS_TL[t.status], dueLabel(t, now()), t.pic, t.sumber, (t.log || []).filter(l => l.type === 'wa').length]; })], `tindak-lanjut-kso-${todayISO()}.csv`); break;
    case 'csv-spbu': csvDownload([['Nomor', 'Nama', 'Mitra', 'Kota', 'PIC', 'WA', 'Mulai kontrak', 'Akhir kontrak', 'Status kontrak', 'Target KL', 'Periode terakhir', 'Realisasi KL', 'Capaian', 'TL terbuka', 'TL terlambat'],
      ...S.spbu.map(s => { const h = spbuHealth(s, S.followups, S.monitoring, now()); return [s.nomor, s.nama, s.mitra, s.kota, s.picNama, displayPhone(s.picWa), s.mulaiKontrak, s.akhirKontrak, h.contract.label, s.targetVolume, h.last?.periode, h.last?.volume, h.ach === null ? '' : (h.ach * 100).toFixed(1) + '%', h.open, h.overdue]; })], `rekap-spbu-kso-${todayISO()}.csv`); break;
    case 'csv-mon': csvDownload([['Nomor SPBU', 'Nama SPBU', 'Periode', 'Realisasi KL', 'Target KL', 'Capaian', 'Setoran', 'Nilai audit', 'Catatan'],
      ...S.monitoring.map(m => { const s = spbuById(m.spbuId); const t = entryTarget(m, s); const a = achievement(m.volume, t); return [s?.nomor, s?.nama, m.periode, m.volume, t, a === null ? '' : (a * 100).toFixed(1) + '%', SETORAN[m.setoran] || '', m.nilaiAudit, m.catatan]; })], `monitoring-kso-${todayISO()}.csv`); break;
    case 'wipe':
      if (!confirm('Hapus SEMUA data di perangkat ini? Unduh cadangan dulu bila perlu.')) return;
      for (const m of S.materi) if (m.fileId) await deleteFile(m.fileId);
      S = emptyState(); await saveState(S, true); go('home'); render(); break;
  }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
window.addEventListener('pagehide', flushState);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushState(); });

// ---------- start ----------
loadState().then(s => { S = s; render(); }).catch(err => { app.innerHTML = `<p class="empty">Gagal membuka penyimpanan: ${esc(err.message)}</p>`; });
