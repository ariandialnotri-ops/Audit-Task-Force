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

test('CCU: kode administrasi valid & 158 item terbagi habis', async () => {
  const { CCU_ADMIN_ITEMS } = await import('../src/data/area.js')
  const { CCU_ITEMS, CCU_BY_CODE } = await import('../src/lib/ccu.js')
  for (const code of CCU_ADMIN_ITEMS) assert.ok(CCU_BY_CODE[code], `kode CCU ${code} tidak ada`)
  const admin = CCU_ITEMS.filter((i) => itemArea(i.code) === 'admin').length
  assert.equal(admin, CCU_ADMIN_ITEMS.size)
  assert.ok(admin > 0 && admin < CCU_ITEMS.length)
  assert.ok(inArea('IX.1', 'admin') && inArea('IV.1', 'lapangan'))
})
