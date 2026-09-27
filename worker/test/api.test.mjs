/**
 * Uji API end-to-end terhadap Worker yang berjalan (database harus KOSONG, mis. `wrangler dev` lokal baru).
 *   cd worker && npm run db:init:local && npm run dev   (terminal 1, .dev.vars berisi SETUP_TOKEN=kode-rahasia-uji)
 *   cd worker && npm test                              (terminal 2)
 */
const B = process.env.API_URL || 'http://localhost:8787'
const SETUP = process.env.SETUP_TOKEN || 'kode-rahasia-uji'
let pass = 0, fail = 0
const ok = (cond, msg) => { if (cond) { pass++; console.log('  ✓', msg) } else { fail++; console.log('  ✗', msg) } }
async function call(method, path, { token, json, raw, type } = {}) {
  const headers = {}
  if (token) headers.Authorization = 'Bearer ' + token
  let body
  if (json !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(json) }
  if (raw) { headers['Content-Type'] = type || 'image/jpeg'; body = raw }
  const r = await fetch(B + path, { method, headers, body })
  const ct = r.headers.get('content-type') || ''
  return { status: r.status, data: ct.includes('json') ? await r.json() : new Uint8Array(await r.arrayBuffer()), cors: r.headers.get('access-control-allow-origin') }
}
console.log('SETUP & LOGIN')
let r = await call('POST', '/api/setup', { json: { setupToken: 'salah', email: 'admin@x.id', password: 'rahasia123' } })
ok(r.status === 403, 'setup dengan kode salah ditolak (403)')
r = await call('POST', '/api/setup', { json: { setupToken: SETUP, email: 'Admin@X.id', nama: 'Rian', password: 'rahasia123' } })
ok(r.status === 200 && r.data.token && r.data.user.role === 'admin', 'setup admin pertama berhasil')
const admin = r.data.token
r = await call('POST', '/api/setup', { json: { setupToken: SETUP, email: 'lain@x.id', password: 'rahasia123' } })
ok(r.status === 409, 'setup kedua ditolak (409)')
r = await call('GET', '/api/health'); ok(r.data.needsSetup === false, 'health: needsSetup=false')
r = await call('POST', '/api/login', { json: { email: 'admin@x.id', password: 'rahasia123' } })
ok(r.status === 200 && r.data.token, 'login (email tidak peka huruf besar/kecil)')
r = await call('GET', '/api/audits'); ok(r.status === 401, 'tanpa token → 401')
r = await call('GET', '/api/audits', { token: 'palsu' }); ok(r.status === 401, 'token palsu → 401')
ok(r.cors === '*', 'header CORS ada')

console.log('ANGGOTA')
r = await call('POST', '/api/members', { token: admin, json: { email: 'auditor@x.id', nama: 'Budi', role: 'auditor', password: 'pendek' } })
ok(r.status === 400, 'password < 8 ditolak')
r = await call('POST', '/api/members', { token: admin, json: { email: 'auditor@x.id', nama: 'Budi', role: 'auditor', password: 'auditor123' } })
ok(r.status === 200 && r.data.created, 'admin menambah auditor')
r = await call('GET', '/api/members', { token: admin }); ok(r.data.length === 2, 'daftar anggota = 2')
const auditorId = r.data.find((m) => m.email === 'auditor@x.id').user_id
r = await call('POST', '/api/login', { json: { email: 'auditor@x.id', password: 'auditor123' } })
const aud = r.data.token
ok(r.data.user.role === 'auditor', 'auditor login')
r = await call('GET', '/api/members', { token: aud }); ok(r.status === 403, 'auditor tidak bisa lihat/kelola anggota')

console.log('KUNCI AKUN')
for (let i = 0; i < 5; i++) r = await call('POST', '/api/login', { json: { email: 'auditor@x.id', password: 'salahsalah' } })
r = await call('POST', '/api/login', { json: { email: 'auditor@x.id', password: 'auditor123' } })
ok(r.status === 429, 'setelah 5x salah akun terkunci (429) walau password benar: ' + r.data.error)
r = await call('POST', '/api/members', { token: admin, json: { email: 'auditor@x.id', nama: 'Budi', role: 'auditor', password: 'baru12345' } })
r = await call('POST', '/api/login', { json: { email: 'auditor@x.id', password: 'baru12345' } })
ok(r.status === 200, 'admin reset password membuka kunci')
let aud2 = r.data.token
r = await call('GET', '/api/me', { token: aud }); ok(r.status === 401, 'reset password mencabut sesi lama')

console.log('AUDIT & FOTO')
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 0xff, 0xd9])
r = await call('PUT', '/api/photos/aud1/p1', { token: aud2, raw: new Uint8Array([1, 2, 3]) }); ok(r.status === 415, 'bukan JPEG ditolak')
r = await call('PUT', '/api/photos/aud1/p1', { token: aud2, raw: jpeg }); ok(r.status === 200 && r.data.path === 'aud1/p1.jpg', 'upload foto ke R2')
r = await call('GET', '/api/photos/aud1/p1.jpg', { token: aud2 }); ok(r.data.length === jpeg.length, 'unduh foto dari R2')
r = await call('GET', '/api/photos/aud1/p1.jpg'); ok(r.status === 401, 'foto tanpa login → 401')
r = await call('GET', '/api/photos/..%2Fx/p1', { token: aud2 }); ok(r.status === 400, 'path foto aneh ditolak')
const data = { id: 'aud1', info: { nomorSpbu: '5164116' }, results: { '1.1.1.a': { grade: 'A', photos: [{ id: 'p1', path: 'aud1/p1.jpg', thumb: 'data:x' }] } } }
r = await call('PUT', '/api/audits/aud1', { token: aud2, json: { status: 'draft', nomor_spbu: '5164116', kota: 'Kediri', tanggal_audit: '2026-09-27', data, summary: { ts: 81.5, classification: 'good' }, client_updated_at: new Date().toISOString() } })
ok(r.status === 200, 'auditor menyimpan audit')
r = await call('PUT', '/api/audits/aud1', { token: aud2, json: { status: 'draft', data: { ...data, v: 2 }, summary: { ts: 82 } } })
ok(r.status === 200, 'simpan ulang (upsert)')
r = await call('GET', '/api/audits', { token: admin })
ok(r.data.length === 1 && r.data[0].summary.ts === 82 && r.data[0].created_by_email === 'auditor@x.id', 'admin melihat rekap + email pembuat')
r = await call('GET', '/api/audits/aud1', { token: admin }); ok(r.data.data.v === 2, 'admin membaca data lengkap')
r = await call('PUT', '/api/audits/aud2', { token: admin, json: { status: 'selesai', data: {}, summary: {} } })
r = await call('DELETE', '/api/audits/aud2', { token: aud2 }); ok(r.status === 403, 'auditor tidak bisa hapus audit orang lain')
r = await call('DELETE', '/api/audits/aud1', { token: aud2 }); ok(r.status === 200, 'auditor hapus draft miliknya')
await new Promise((res) => setTimeout(res, 300))
r = await call('GET', '/api/photos/aud1/p1.jpg', { token: admin }); ok(r.status === 404, 'foto ikut terhapus dari R2')
r = await call('PUT', '/api/audits/big', { token: admin, json: { data: { s: 'x'.repeat(2_000_000) } } }); ok(r.status === 413, 'data > 1,9 MB ditolak')

console.log('PASSWORD & LOGOUT')
r = await call('PUT', '/api/me/password', { token: aud2, json: { oldPassword: 'salah', newPassword: 'abcdefgh1' } }); ok(r.status === 400, 'ganti password dengan password lama salah ditolak')
r = await call('PUT', '/api/me/password', { token: aud2, json: { oldPassword: 'baru12345', newPassword: 'abcdefgh1' } }); ok(r.status === 200, 'ganti password')
r = await call('DELETE', '/api/members/' + auditorId, { token: aud2 }); ok(r.status === 403, 'auditor tidak bisa hapus anggota')
r = await call('POST', '/api/logout', { token: aud2 }); r = await call('GET', '/api/me', { token: aud2 }); ok(r.status === 401, 'logout mencabut token')
r = await call('DELETE', '/api/members/' + auditorId, { token: admin }); ok(r.status === 200, 'admin hapus anggota')
console.log(`\n${pass} lolos, ${fail} gagal`)
if (fail) process.exit(1)
