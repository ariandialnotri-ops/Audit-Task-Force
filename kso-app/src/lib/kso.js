// Logika murni monitoring KSO (tanpa DOM) — diuji di tests/.

export const KATEGORI_TL = ['Operasional', 'Pelayanan', 'HSSE', 'Q&Q', 'Keuangan / Bagi Hasil', 'Fasilitas & Peralatan', 'Legal / Kontrak', 'SDM', 'Lainnya'];
export const PRIORITAS = { tinggi: 'Tinggi', sedang: 'Sedang', rendah: 'Rendah' };
export const STATUS_TL = { open: 'Belum Dikerjakan', proses: 'Dalam Proses', selesai: 'Selesai' };
export const SETORAN = { lunas: 'Lunas', sebagian: 'Sebagian', belum: 'Belum' };
export const KATEGORI_MATERI = ['SOP & Standar', 'Kontrak & Legal', 'Pelatihan Operator', 'HSSE', 'Pemasaran & Promo', 'Laporan & Formulir', 'Lainnya'];

const DAY = 86400000;

export function todayISO(now = new Date()) {
  const d = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 10);
}

/** Selisih hari kalender dari `from` ke tanggal ISO `iso` (positif = di masa depan). */
export function daysUntil(iso, now = new Date()) {
  if (!iso) return null;
  const t = Date.parse(iso + 'T00:00:00');
  const n = Date.parse(todayISO(now) + 'T00:00:00');
  if (Number.isNaN(t)) return null;
  return Math.round((t - n) / DAY);
}

/** Status kontrak KSO berdasarkan tanggal berakhir. */
export function contractStatus(spbu, now = new Date(), warnDays = 90) {
  const d = daysUntil(spbu?.akhirKontrak, now);
  if (d === null) return { key: 'unknown', label: 'Tanggal kontrak belum diisi', days: null };
  if (d < 0) return { key: 'expired', label: `Berakhir ${-d} hari lalu`, days: d };
  if (d <= warnDays) return { key: 'soon', label: `Berakhir ${d} hari lagi`, days: d };
  return { key: 'active', label: `Aktif · ${d} hari tersisa`, days: d };
}

export function isOverdue(tl, now = new Date()) {
  if (!tl || tl.status === 'selesai' || !tl.tenggat) return false;
  return daysUntil(tl.tenggat, now) < 0;
}

export function dueLabel(tl, now = new Date()) {
  if (tl.status === 'selesai') return 'Selesai';
  const d = daysUntil(tl.tenggat, now);
  if (d === null) return 'Tanpa tenggat';
  if (d < 0) return `Terlambat ${-d} hari`;
  if (d === 0) return 'Jatuh tempo hari ini';
  return `${d} hari lagi`;
}

/** Capaian volume (0..∞) atau null bila target kosong. */
export function achievement(volume, target) {
  const v = Number(volume), t = Number(target);
  if (!Number.isFinite(v) || !Number.isFinite(t) || t <= 0) return null;
  return v / t;
}

export function achievementBand(ratio) {
  if (ratio === null || ratio === undefined) return 'none';
  if (ratio >= 1) return 'good';
  if (ratio >= 0.9) return 'avg';
  if (ratio >= 0.75) return 'poor';
  return 'bad';
}

/** Entri monitoring terbaru suatu SPBU (berdasarkan periode YYYY-MM). */
export function latestMonitoring(entries, spbuId) {
  let best = null;
  for (const e of entries) {
    if (e.spbuId !== spbuId) continue;
    if (!best || e.periode > best.periode) best = e;
  }
  return best;
}

export function entryTarget(entry, spbu) {
  const t = Number(entry?.target);
  return Number.isFinite(t) && t > 0 ? t : Number(spbu?.targetVolume) || 0;
}

const PRI_ORDER = { tinggi: 0, sedang: 1, rendah: 2 };
/** Urutan: terlambat dulu, lalu tenggat terdekat, lalu prioritas; selesai paling akhir. */
export function sortFollowups(list, now = new Date()) {
  return [...list].sort((a, b) => {
    const sa = a.status === 'selesai' ? 1 : 0, sb = b.status === 'selesai' ? 1 : 0;
    if (sa !== sb) return sa - sb;
    const da = daysUntil(a.tenggat, now), db = daysUntil(b.tenggat, now);
    const xa = da === null ? Infinity : da, xb = db === null ? Infinity : db;
    if (xa !== xb) return xa - xb;
    return (PRI_ORDER[a.prioritas] ?? 1) - (PRI_ORDER[b.prioritas] ?? 1);
  });
}

/** Skor kesehatan sederhana per SPBU untuk peringkat dashboard. */
export function spbuHealth(spbu, followups, entries, now = new Date()) {
  const mine = followups.filter(f => f.spbuId === spbu.id);
  const open = mine.filter(f => f.status !== 'selesai');
  const overdue = open.filter(f => isOverdue(f, now));
  const last = latestMonitoring(entries, spbu.id);
  const ach = last ? achievement(last.volume, entryTarget(last, spbu)) : null;
  const contract = contractStatus(spbu, now);
  const flags = [];
  if (overdue.length) flags.push(`${overdue.length} TL terlambat`);
  if (ach !== null && ach < 0.9) flags.push(`Volume ${Math.round(ach * 100)}%`);
  if (last && last.setoran && last.setoran !== 'lunas') flags.push(`Setoran ${SETORAN[last.setoran].toLowerCase()}`);
  if (contract.key === 'soon' || contract.key === 'expired') flags.push(contract.label);
  let level = 'good';
  if (overdue.length || (ach !== null && ach < 0.75) || contract.key === 'expired' || last?.setoran === 'belum') level = 'bad';
  else if (flags.length || open.length) level = 'warn';
  return { open: open.length, overdue: overdue.length, last, ach, contract, flags, level };
}

/** Daftar bernomor tindak lanjut terbuka untuk isi pesan WA. */
export function openListText(followups, spbuId, now = new Date(), fmtDate = d => d) {
  const open = sortFollowups(followups.filter(f => f.spbuId === spbuId && f.status !== 'selesai'), now);
  if (!open.length) return '(tidak ada tindak lanjut terbuka)';
  return open.map((f, i) => `${i + 1}. ${f.judul}${f.tenggat ? ` — tenggat ${fmtDate(f.tenggat)}` : ''}${isOverdue(f, now) ? ' (TERLAMBAT)' : ''}`).join('\n');
}

export function uid(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** CSV sederhana (RFC 4180) dengan BOM agar Excel membaca UTF-8. */
export function toCsv(rows) {
  const esc = v => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + rows.map(r => r.map(esc).join(',')).join('\r\n');
}
