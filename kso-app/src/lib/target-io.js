// Impor/ekspor Excel format "Target KSO" (sheet per PIC Pertare, header baris 2, "Tanggal Pelaksanaan" & "Keterangan" di baris 1).
import { MILESTONES, inferStatus, parseNum, uid, msFilled, isISODate } from './pipeline.js';
import { normalizePhone } from './wa.js';
import { readXlsx, writeXlsx, excelDateToISO } from './xlsx.js';

const norm = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const FIELD_HEADERS = {
  no: ['no'], region: ['region'], salesArea: ['sales area'], nomor: ['no spbu', 'nomor spbu'],
  kota: ['kota kab', 'kota'], provinsi: ['provinsi'], omzet: ['rata rata omzet kl hari', 'omzet'],
  grading: ['grading pertamina way', 'grading'], sbm: ['sbm'], sbmWa: ['kontak sbm'],
  pic: ['nama pic spbu'], picWa: ['nomor pic spbu'], prioritas: ['prioritas'], picPertare: ['pic pertare'],
  keterangan: ['keterangan'],
  ...Object.fromEntries(MILESTONES.map(m => [`ms.${m.key}`, [norm(m.excel)]])),
};

/** Nomor HP dari Excel (bisa number tanpa 0 di depan) → string '08…' */
export function phoneFromCell(v) {
  if (v === null || v === undefined || v === '') return '';
  const s = String(v).trim();
  const n = normalizePhone(s);
  return n ? '0' + n.slice(2) : s;
}

function cellToMs(v) {
  if (v === null || v === undefined || v === '') return '';
  if (typeof v === 'number' && v > 20000 && v < 80000) return excelDateToISO(v);
  const s = String(v).trim();
  if (/^done$/i.test(s)) return 'done';
  const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return s;
}

/** Rows satu sheet → daftar target. Kolom dicari dari nama header (baris berisi "No. SPBU" + baris di atasnya). */
export function rowsToTargets(rows, sheetName = '') {
  const hi = rows.findIndex(r => (r || []).some(c => norm(c) === 'no spbu'));
  if (hi < 0) return [];
  const width = Math.max(...rows.slice(Math.max(0, hi - 1), hi + 1).map(r => (r || []).length));
  const headers = [];
  for (let c = 0; c < width; c++) headers[c] = norm(rows[hi][c] ?? (hi > 0 ? rows[hi - 1][c] : ''));
  const col = {};
  for (const [field, names] of Object.entries(FIELD_HEADERS)) {
    const i = headers.findIndex(h => h && names.includes(h));
    if (i >= 0) col[field] = i;
  }
  if (col.nomor === undefined) return [];
  const out = [];
  for (const r of rows.slice(hi + 1)) {
    const get = f => (col[f] === undefined ? null : r?.[col[f]] ?? null);
    const nomor = String(get('nomor') ?? '').replace(/\D/g, '');
    if (!nomor) continue;
    const t = {
      id: uid('tgt'), nomor, no: get('no') ?? '',
      region: get('region') ?? '', salesArea: get('salesArea') ?? '', kota: get('kota') ?? '', provinsi: get('provinsi') ?? '',
      omzet: parseNum(get('omzet')), grading: get('grading') ?? '',
      sbm: String(get('sbm') ?? '').trim(), sbmWa: phoneFromCell(get('sbmWa')),
      pic: String(get('pic') ?? '').trim(), picWa: phoneFromCell(get('picWa')),
      prioritas: parseNum(get('prioritas')), picPertare: String(get('picPertare') ?? sheetName).trim(),
      keterangan: String(get('keterangan') ?? '').trim(),
      ms: Object.fromEntries(MILESTONES.map(m => [m.key, cellToMs(get(`ms.${m.key}`))])),
      log: [], createdAt: Date.now(),
    };
    t.status = inferStatus(t.keterangan);
    out.push(t);
  }
  return out;
}

export async function importExcel(buf) {
  const sheets = await readXlsx(buf);
  const targets = [];
  for (const s of sheets) targets.push(...rowsToTargets(s.rows, s.name));
  return { targets, sheets: sheets.map(s => s.name) };
}

const IMPORT_FIELDS = ['no', 'region', 'salesArea', 'kota', 'provinsi', 'omzet', 'grading', 'sbm', 'sbmWa', 'pic', 'picWa', 'prioritas', 'picPertare', 'keterangan'];

/** Gabungkan hasil impor ke data yang ada berdasarkan No. SPBU. Log, jadwal tindak lanjut & status manual dipertahankan kecuali keterangan berubah. */
export function mergeTargets(existing, incoming, now = Date.now()) {
  const byNomor = new Map(existing.map(t => [t.nomor, t]));
  let added = 0, updated = 0;
  const result = existing.map(t => ({ ...t }));
  const idx = new Map(result.map((t, i) => [t.nomor, i]));
  for (const inc of incoming) {
    const cur = byNomor.get(inc.nomor);
    if (!cur) { result.push(inc); added++; continue; }
    const t = result[idx.get(inc.nomor)];
    const changes = [];
    for (const f of IMPORT_FIELDS) if (inc[f] !== null && inc[f] !== '' && String(inc[f]) !== String(t[f] ?? '')) { t[f] = inc[f]; changes.push(f); }
    t.ms = { ...t.ms };
    for (const m of MILESTONES) if (msFilled(inc.ms[m.key]) && inc.ms[m.key] !== t.ms[m.key]) { t.ms[m.key] = inc.ms[m.key]; changes.push(m.short); }
    if (changes.includes('keterangan')) t.status = inc.status;
    if (changes.length) { t.log = [...(t.log || []), { ts: now, type: 'catatan', text: `Diperbarui dari Excel: ${changes.join(', ')}` }]; updated++; }
  }
  return { targets: result, added, updated };
}

/** Ekspor ke XLSX dengan tata letak sama seperti Excel sumber (+ kolom Status & Tindak lanjut). */
export function exportExcel(targets, { sheetName = 'Target KSO' } = {}) {
  const head1 = Array(20).fill(null);
  head1[14] = { v: 'Tanggal Pelaksanaan', bold: true };
  const head2 = ['No', 'Region', 'Sales Area', 'No. SPBU', 'Kota/Kab.', 'Provinsi', 'Rata-rata Omzet (Kl/Hari)', 'Grading Pertamina Way', 'SBM', 'Kontak SBM', 'Nama PIC SPBU', 'Nomor PIC SPBU', 'Prioritas', 'PIC Pertare', ...MILESTONES.map(m => m.excel), 'Keterangan', 'Status', 'Tindak lanjut berikutnya', 'Tanggal tindak lanjut'].map(v => ({ v, bold: true }));
  const msCell = v => (isISODate(v) ? { date: v } : v || null);
  const rows = targets.map((t, i) => [
    t.no || i + 1, t.region, t.salesArea, Number(t.nomor) || t.nomor, t.kota, t.provinsi, t.omzet ?? null, t.grading, t.sbm, t.sbmWa, t.pic, t.picWa, t.prioritas ?? null, t.picPertare,
    ...MILESTONES.map(m => msCell(t.ms?.[m.key])), t.keterangan, t.statusLabel || '', t.nextAction || '', isISODate(t.nextDate) ? { date: t.nextDate } : null,
  ]);
  const total = Array(20).fill(null);
  total[13] = { v: 'Total', bold: true };
  MILESTONES.forEach((m, i) => { total[14 + i] = { v: targets.filter(t => msFilled(t.ms?.[m.key])).length, bold: true }; });
  return writeXlsx([head1, head2, ...rows, total], {
    sheetName, merges: ['O1:T1'], freezeRow: 2,
    widths: [5, 14, 11, 11, 16, 12, 12, 18, 20, 15, 22, 15, 9, 11, 13, 13, 18, 12, 12, 12, 48, 20, 30, 14],
  });
}
