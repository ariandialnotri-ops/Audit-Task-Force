import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone, fillTemplate, waLink, displayPhone } from '../src/lib/wa.js';
import { fmtNomor, parseNum, stageIdx, nextMilestone, inferStatus, effectiveStatus, planOverdue, followupState, summary, sortTargets, toCsv } from '../src/lib/pipeline.js';
import { rowsToTargets, mergeTargets, exportExcel, phoneFromCell } from '../src/lib/target-io.js';
import { importExcel } from '../src/lib/target-io.js';

const NOW = new Date('2026-11-16T09:00:00');

test('WA: nomor & template', () => {
  assert.equal(normalizePhone('0812-3456-7890'), '6281234567890');
  assert.equal(normalizePhone('+62 812 3456 7890'), '6281234567890');
  assert.equal(normalizePhone('123'), '');
  assert.equal(displayPhone('6281234567890'), '0812-3456-7890');
  assert.equal(fillTemplate('Halo {pic}, {x}\n\n\n\nok', { pic: 'Budi' }), 'Halo Budi,\n\nok');
  assert.equal(waLink('0812345678', 'a b&c'), 'https://wa.me/62812345678?text=a%20b%26c');
  assert.equal(phoneFromCell(81335926034), '081335926034');
});

test('format & parse', () => {
  assert.equal(fmtNomor(5464421), '54.644.21');
  assert.equal(parseNum('16,31'), 16.31);
  assert.equal(parseNum(17.3), 17.3);
  assert.equal(parseNum(''), null);
});

test('tahapan, status & jadwal', () => {
  const t = { ms: { plan: '2026-02-02', sosialisasi: 'done', penawaran: '' } };
  assert.equal(stageIdx(t), 1);
  assert.equal(nextMilestone(t).key, 'penawaran');
  assert.equal(stageIdx({ ms: {} }), -1);
  assert.equal(inferStatus('Owner belum berminat KSO'), 'belum');
  assert.equal(inferStatus('Owner masih mempertimbangkan untuk KSO'), 'pertimbangan');
  assert.equal(inferStatus('Menunggu konfirmasi dari owner'), 'menunggu');
  assert.equal(inferStatus('Owner telah menjual SPBU di akhir tahun 2025'), 'batal');
  assert.equal(effectiveStatus({ status: 'belum', ms: { golive: '2026-10-01' } }), 'golive');
  assert.equal(planOverdue({ status: 'proses', ms: { plan: '2026-11-10' } }, NOW), true);
  assert.equal(planOverdue({ status: 'proses', ms: { plan: '2026-11-10', sosialisasi: 'done' } }, NOW), false);
  assert.equal(planOverdue({ status: 'belum', ms: { plan: '2026-11-10' } }, NOW), false);
  assert.equal(followupState({ status: 'proses', ms: {}, nextDate: '2026-11-15' }, NOW), 'overdue');
  assert.equal(followupState({ status: 'proses', ms: {}, nextDate: '2026-11-17' }, NOW), 'soon');
});

const ROWS = [
  [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 'Tanggal Pelaksanaan', null, null, null, null, 'Keterangan'],
  ['No', 'Region', 'Sales Area', 'No. SPBU', 'Kota/Kab.', 'Provinsi', 'Rata-rata Omzet (Kl/Hari)', 'Grading Pertamina Way', 'SBM', 'Kontak SBM', 'Nama PIC SPBU', 'Nomor PIC SPBU', 'Prioritas', 'PIC Pertare', 'Plan Sosialisasi & Survey', ' Sosialisasi & Survey', 'Penawaran Sharing ', 'Negosiasi ', 'BAK & PKS', 'Go Live', null],
  [10, 'Jatim', 'Kediri', 5464421, 'Kab. Nganjuk', 'Jawa Timur', 16.44, 'Basic', 'SBM A', '081200000001', 'PIC A', '085200000001', 1, 'Rian', 46055, 'done', null, null, null, null, 'Owner belum berminat KSO'],
  [11, 'Jatim', 'Kediri', 5466304, 'Kab. Trenggalek', 'Jawa Timur', '18,7', 'Pasti Pas Good', 'SBM B', '081200000002', 'PIC B', 81300000002, 2, 'Rian', 'done', 45859, '22 % PTPR (3 tahun)', null, null, null, 'Menunggu RUPS'],
  [null, null, null, null, null, null, null, null, null, null, null, null, null, null, 2, 2, 1, 0, 0, 0, null],
];

test('impor baris Excel', () => {
  const ts = rowsToTargets(ROWS, 'Rian');
  assert.equal(ts.length, 2);
  assert.equal(ts[0].nomor, '5464421');
  assert.equal(ts[0].ms.plan, '2026-02-02');
  assert.equal(ts[0].ms.sosialisasi, 'done');
  assert.equal(ts[0].keterangan, 'Owner belum berminat KSO');
  assert.equal(ts[0].status, 'belum');
  assert.equal(ts[1].omzet, 18.7);
  assert.equal(ts[1].picWa, '081300000002');
  assert.equal(ts[1].ms.sosialisasi, '2025-07-21');
  assert.equal(ts[1].ms.penawaran, '22 % PTPR (3 tahun)');
  const s = summary(ts, NOW);
  assert.deepEqual(s.funnel, [2, 2, 1, 0, 0, 0]);
  assert.equal(s.byStatus.belum, 1);
  assert.equal(sortTargets(ts, 'prioritas', NOW)[0].nomor, '5466304'); // yang aktif di depan
});

test('gabung impor berdasarkan No. SPBU', () => {
  const [a, b] = rowsToTargets(ROWS, 'Rian');
  a.log = [{ ts: 1, type: 'wa', text: 'x' }];
  a.nextDate = '2026-12-01';
  const inc = rowsToTargets(ROWS, 'Rian');
  inc[0].ms.penawaran = '30% PTPR';
  inc[0].keterangan = 'Owner mempertimbangkan';
  inc[0].status = 'pertimbangan';
  const r = mergeTargets([a], [inc[0], inc[1]], 5);
  assert.equal(r.added, 1);
  assert.equal(r.updated, 1);
  const m = r.targets[0];
  assert.equal(m.ms.penawaran, '30% PTPR');
  assert.equal(m.status, 'pertimbangan');
  assert.equal(m.nextDate, '2026-12-01');
  assert.equal(m.log.length, 2);
  assert.ok(b);
});

test('ekspor lalu impor ulang (roundtrip XLSX)', async () => {
  const ts = rowsToTargets(ROWS, 'Rian');
  const blob = exportExcel(ts);
  const { targets } = await importExcel(await blob.arrayBuffer());
  assert.equal(targets.length, 2);
  assert.equal(targets[0].ms.plan, '2026-02-02');
  assert.equal(targets[1].ms.penawaran, '22 % PTPR (3 tahun)');
  assert.equal(targets[1].picWa, '081300000002');
  assert.equal(targets[0].keterangan, 'Owner belum berminat KSO');
});

test('toCsv', () => {
  assert.equal(toCsv([['a', 'b,c'], ['"x"', 1]]), '﻿a,"b,c"\r\n"""x""",1');
});
