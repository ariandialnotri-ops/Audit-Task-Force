import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone, fillTemplate, waLink, displayPhone } from '../src/lib/wa.js';
import { daysUntil, contractStatus, isOverdue, achievement, achievementBand, latestMonitoring, sortFollowups, spbuHealth, openListText, toCsv } from '../src/lib/kso.js';

const NOW = new Date('2026-11-16T09:00:00');

test('normalizePhone format Indonesia', () => {
  assert.equal(normalizePhone('0812-3456-7890'), '6281234567890');
  assert.equal(normalizePhone('+62 812 3456 7890'), '6281234567890');
  assert.equal(normalizePhone('81234567890'), '6281234567890');
  assert.equal(normalizePhone('6281234567890'), '6281234567890');
  assert.equal(normalizePhone('123'), '');
  assert.equal(normalizePhone(''), '');
  assert.equal(displayPhone('6281234567890'), '0812-3456-7890');
});

test('fillTemplate & waLink', () => {
  assert.equal(fillTemplate('Halo {pic}, {x}\n\n\n\nok', { pic: 'Budi' }), 'Halo Budi,\n\nok');
  assert.equal(waLink('0812345678', 'a b&c'), 'https://wa.me/62812345678?text=a%20b%26c');
  assert.equal(waLink('', ''), 'https://wa.me/');
});

test('tanggal, kontrak & keterlambatan', () => {
  assert.equal(daysUntil('2026-11-20', NOW), 4);
  assert.equal(daysUntil('2026-11-10', NOW), -6);
  assert.equal(contractStatus({ akhirKontrak: '2027-01-01' }, NOW).key, 'soon');
  assert.equal(contractStatus({ akhirKontrak: '2028-01-01' }, NOW).key, 'active');
  assert.equal(contractStatus({ akhirKontrak: '2026-01-01' }, NOW).key, 'expired');
  assert.equal(contractStatus({}, NOW).key, 'unknown');
  assert.equal(isOverdue({ status: 'open', tenggat: '2026-11-15' }, NOW), true);
  assert.equal(isOverdue({ status: 'selesai', tenggat: '2026-11-15' }, NOW), false);
  assert.equal(isOverdue({ status: 'proses', tenggat: '2026-11-16' }, NOW), false);
});

test('capaian volume', () => {
  assert.equal(achievement(90, 100), 0.9);
  assert.equal(achievement(90, 0), null);
  assert.equal(achievementBand(1.02), 'good');
  assert.equal(achievementBand(0.92), 'avg');
  assert.equal(achievementBand(0.8), 'poor');
  assert.equal(achievementBand(0.5), 'bad');
  const e = [{ spbuId: 'a', periode: '2026-09' }, { spbuId: 'a', periode: '2026-10' }, { spbuId: 'b', periode: '2026-11' }];
  assert.equal(latestMonitoring(e, 'a').periode, '2026-10');
});

test('urutan tindak lanjut & kesehatan SPBU', () => {
  const tl = [
    { id: 1, spbuId: 'a', judul: 'A', status: 'selesai', tenggat: '2026-11-01' },
    { id: 2, spbuId: 'a', judul: 'B', status: 'open', tenggat: '2026-12-01', prioritas: 'rendah' },
    { id: 3, spbuId: 'a', judul: 'C', status: 'proses', tenggat: '2026-11-10' },
    { id: 4, spbuId: 'a', judul: 'D', status: 'open', tenggat: '2026-12-01', prioritas: 'tinggi' },
  ];
  assert.deepEqual(sortFollowups(tl, NOW).map(t => t.id), [3, 4, 2, 1]);
  const h = spbuHealth({ id: 'a', targetVolume: 100, akhirKontrak: '2030-01-01' }, tl, [{ spbuId: 'a', periode: '2026-10', volume: 95, setoran: 'lunas' }], NOW);
  assert.equal(h.open, 3);
  assert.equal(h.overdue, 1);
  assert.equal(h.level, 'bad');
  assert.equal(h.ach, 0.95);
  assert.match(openListText(tl, 'a', NOW), /^1\. C — tenggat 2026-11-10 \(TERLAMBAT\)\n2\. D/);
});

test('toCsv', () => {
  assert.equal(toCsv([['a', 'b,c'], ['"x"', 1]]), '﻿a,"b,c"\r\n"""x""",1');
});
