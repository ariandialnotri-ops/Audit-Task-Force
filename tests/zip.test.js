import { test } from 'node:test'
import assert from 'node:assert/strict'
import { crc32, makeZip } from '../src/lib/zip.js'

test('crc32 sesuai nilai standar', () => {
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926)
})

test('zip berisi file utuh (STORE)', async () => {
  const data = new Uint8Array([0xff, 0xd8, 1, 2, 3, 0xff, 0xd9])
  const blob = makeZip([{ name: 'folder/a.jpg', data }, { name: 'folder/b.jpg', data }])
  const buf = new Uint8Array(await blob.arrayBuffer())
  const dv = new DataView(buf.buffer)
  assert.equal(dv.getUint32(0, true), 0x04034b50)
  assert.equal(dv.getUint32(buf.length - 22, true), 0x06054b50)
  assert.equal(dv.getUint16(buf.length - 22 + 10, true), 2)
})
