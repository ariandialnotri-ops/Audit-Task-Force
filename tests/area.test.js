import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ADMIN_ITEMS, itemArea, inArea } from '../src/data/area.js'
import { ALL_ITEMS, ITEM_BY_CODE } from '../src/lib/scoring.js'

test('setiap kode administrasi ada di checklist', () => {
  for (const code of ADMIN_ITEMS) assert.ok(ITEM_BY_CODE[code], `kode ${code} tidak ada`)
})

test('125 item terbagi habis: administrasi + lapangan', () => {
  const admin = ALL_ITEMS.filter((i) => itemArea(i.code) === 'admin').length
  const lap = ALL_ITEMS.filter((i) => itemArea(i.code) === 'lapangan').length
  assert.equal(admin + lap, ALL_ITEMS.length)
  assert.equal(admin, 25)
  assert.ok(inArea('2.2.n', 'admin') && !inArea('2.2.n', 'lapangan') && inArea('2.2.n', 'all'))
  assert.ok(inArea('2.2.m', 'lapangan'))
})
