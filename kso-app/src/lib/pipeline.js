// Logika murni pipeline target kerja sama SPBU DODO → skema KSO TAC (tanpa DOM). Diuji di tests/.
// Struktur mengikuti Excel "Target KSO": tahapan Tanggal Pelaksanaan = 6 milestone.

/** Milestone pelaksanaan (urutan = kolom Excel). Nilai: 'YYYY-MM-DD' | 'done' | teks bebas (mis. "28% PTPR"). */
export const MILESTONES = [
  { key: 'plan', label: 'Plan Sosialisasi & Survey', short: 'Plan', excel: 'Plan Sosialisasi & Survey' },
  { key: 'sosialisasi', label: 'Sosialisasi & Survey', short: 'Sosialisasi', excel: 'Sosialisasi & Survey' },
  { key: 'penawaran', label: 'Penawaran Sharing', short: 'Penawaran', excel: 'Penawaran Sharing', text: true },
  { key: 'negosiasi', label: 'Negosiasi', short: 'Negosiasi', excel: 'Negosiasi' },
  { key: 'bak', label: 'BAK & PKS', short: 'BAK & PKS', excel: 'BAK & PKS' },
  { key: 'golive', label: 'Go Live', short: 'Go Live', excel: 'Go Live' },
];
export const msIndex = key => MILESTONES.findIndex(m => m.key === key);

/** Status minat owner. `golive` diturunkan otomatis dari milestone Go Live. */
export const STATUS = {
  proses: { label: 'Proses', band: 'avg' },
  pertimbangan: { label: 'Owner mempertimbangkan', band: 'good' },
  menunggu: { label: 'Menunggu tanggapan', band: 'poor' },
  belum: { label: 'Belum berminat', band: 'bad' },
  batal: { label: 'Tidak dilanjutkan', band: 'none' },
};
export const GRADING = ['Basic', 'Pasti Pas Good', 'Pasti Pas Excellent', '-'];
export const JENIS_AKTIVITAS = {
  wa: 'WhatsApp', telepon: 'Telepon', kunjungan: 'Kunjungan / survey', rapat: 'Sosialisasi / rapat',
  materi: 'Kirim materi', catatan: 'Catatan', tahap: 'Perubahan tahapan',
};
export const KATEGORI_MATERI = ['Skema KSO TAC', 'Profil Pertamina Retail', 'Simulasi Sharing', 'Legal / BAK & PKS', 'Standar Operasional', 'Lainnya'];
export const STAGNAN_HARI = 30;

const DAY = 86400000;
export function todayISO(now = new Date()) {
  const d = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 10);
}
export function plusDaysISO(n, now = new Date()) { const d = new Date(now); d.setDate(d.getDate() + n); return todayISO(d); }
export const isISODate = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

export function daysUntil(iso, now = new Date()) {
  if (!isISODate(iso)) return null;
  return Math.round((Date.parse(iso + 'T00:00:00') - Date.parse(todayISO(now) + 'T00:00:00')) / DAY);
}

/** Format No. SPBU 7 digit → 54.644.21 */
export function fmtNomor(n) {
  const d = String(n ?? '').replace(/\D/g, '');
  return d.length === 7 ? `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}` : String(n ?? '');
}

/** Angka gaya Indonesia ('16,31') atau number → number | null */
export function parseNum(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const n = Number(String(v).trim().replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Milestone dianggap tercapai bila terisi. Tanggal di masa depan pada Plan = masih rencana (tetap tercatat). */
export const msFilled = v => v !== null && v !== undefined && String(v).trim() !== '';

/** Tahap tercapai terakhir (indeks milestone) atau -1. */
export function stageIdx(t) {
  let idx = -1;
  MILESTONES.forEach((m, i) => { if (msFilled(t.ms?.[m.key])) idx = i; });
  return idx;
}
export function stageLabel(t) {
  const i = stageIdx(t);
  return i < 0 ? 'Belum dijadwalkan' : MILESTONES[i].label;
}
/** Milestone berikutnya yang belum terisi setelah tahap terakhir. */
export function nextMilestone(t) {
  const i = stageIdx(t);
  return i + 1 < MILESTONES.length ? MILESTONES[i + 1] : null;
}

export function effectiveStatus(t) {
  return msFilled(t.ms?.golive) ? 'golive' : (STATUS[t.status] ? t.status : 'proses');
}
export const isActive = t => ['proses', 'pertimbangan', 'menunggu'].includes(effectiveStatus(t));

/** Tebak status dari kolom Keterangan Excel. */
export function inferStatus(ket = '') {
  const k = String(ket).toLowerCase();
  if (/telah menjual|sudah dijual|dijual|batal|tidak dilanjut/.test(k)) return 'batal';
  if (/belum berminat|tidak berminat/.test(k)) return 'belum';
  if (/mempertimbangkan|berminat/.test(k)) return 'pertimbangan';
  if (/menunggu|tidak ada tanggapan|belum ada tanggapan|konfirmasi/.test(k)) return 'menunggu';
  return 'proses';
}

/** Plan sosialisasi sudah lewat tapi sosialisasi belum terlaksana. */
export function planOverdue(t, now = new Date()) {
  const p = t.ms?.plan;
  return isActive(t) && isISODate(p) && !msFilled(t.ms?.sosialisasi) && daysUntil(p, now) < 0;
}

/** Status tindak lanjut berikutnya: overdue / today / soon (≤3 hari) / later / none. */
export function followupState(t, now = new Date()) {
  if (!isActive(t) || !isISODate(t.nextDate)) return 'none';
  const d = daysUntil(t.nextDate, now);
  if (d < 0) return 'overdue';
  if (d === 0) return 'today';
  if (d <= 3) return 'soon';
  return 'later';
}
export function relDay(iso, now = new Date()) {
  const d = daysUntil(iso, now);
  if (d === null) return '';
  if (d < 0) return `${-d} hari lalu`;
  if (d === 0) return 'hari ini';
  if (d === 1) return 'besok';
  return `${d} hari lagi`;
}

export function lastActivityTs(t) {
  let ts = 0;
  for (const a of t.log || []) if (a.ts > ts) ts = a.ts;
  return ts;
}
export function isStagnant(t, now = new Date(), limit = STAGNAN_HARI) {
  if (!isActive(t)) return false;
  const ts = lastActivityTs(t);
  return !ts || (now.getTime() - ts) / DAY > limit;
}

/** Rekap untuk dashboard — `funnel` = jumlah terisi per kolom (sama seperti baris total di Excel). */
export function summary(targets, now = new Date()) {
  const funnel = MILESTONES.map(m => targets.filter(t => msFilled(t.ms?.[m.key])).length);
  const byStatus = { golive: 0 };
  for (const k of Object.keys(STATUS)) byStatus[k] = 0;
  for (const t of targets) byStatus[effectiveStatus(t)]++;
  const byPrio = {};
  for (const t of targets) { const p = t.prioritas ?? '-'; byPrio[p] = (byPrio[p] || 0) + 1; }
  const byKota = {};
  for (const t of targets) {
    const k = t.kota || '-';
    const r = byKota[k] || (byKota[k] = { total: 0, sosialisasi: 0, penawaran: 0, golive: 0, aktif: 0, omzet: 0 });
    r.total++; r.omzet += parseNum(t.omzet) || 0;
    if (msFilled(t.ms?.sosialisasi)) r.sosialisasi++;
    if (msFilled(t.ms?.penawaran)) r.penawaran++;
    if (msFilled(t.ms?.golive)) r.golive++;
    if (isActive(t)) r.aktif++;
  }
  const active = targets.filter(isActive);
  return {
    total: targets.length, funnel, byStatus, byPrio, byKota,
    active: active.length,
    activeOmzet: active.reduce((a, t) => a + (parseNum(t.omzet) || 0), 0),
    overdue: targets.filter(t => followupState(t, now) === 'overdue'),
    today: targets.filter(t => followupState(t, now) === 'today'),
    soon: targets.filter(t => followupState(t, now) === 'soon'),
    planOverdue: targets.filter(t => planOverdue(t, now)),
    unscheduled: active.filter(t => stageIdx(t) < 0),
  };
}

const FU_ORDER = { overdue: 0, today: 1, soon: 2, later: 3, none: 4 };
export function sortTargets(list, by = 'prioritas', now = new Date()) {
  const prio = t => Number(t.prioritas) || 99;
  const cmp = {
    prioritas: (a, b) => prio(a) - prio(b) || (parseNum(b.omzet) || 0) - (parseNum(a.omzet) || 0),
    omzet: (a, b) => (parseNum(b.omzet) || 0) - (parseNum(a.omzet) || 0),
    tahap: (a, b) => stageIdx(b) - stageIdx(a) || prio(a) - prio(b),
    tindak: (a, b) => FU_ORDER[followupState(a, now)] - FU_ORDER[followupState(b, now)] || String(a.nextDate || '9').localeCompare(String(b.nextDate || '9')) || prio(a) - prio(b),
    nomor: (a, b) => String(a.nomor).localeCompare(String(b.nomor)),
  }[by] || (() => 0);
  const activeFirst = (a, b) => (isActive(a) ? 0 : 1) - (isActive(b) ? 0 : 1);
  return [...list].sort((a, b) => activeFirst(a, b) || cmp(a, b));
}

export function uid(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function toCsv(rows) {
  const esc = v => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + rows.map(r => r.map(esc).join(',')).join('\r\n');
}
