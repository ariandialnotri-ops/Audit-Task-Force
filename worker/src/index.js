/**
 * API Audit Pertamina Way — Cloudflare Worker + D1 (data) + R2 (foto).
 *
 * Binding yang dibutuhkan (lihat wrangler.toml / Dashboard → Worker → Settings → Bindings):
 *   DB           : D1 database  (skema: worker/schema.sql)
 *   PHOTOS       : R2 bucket    (OPSIONAL — foto bukti, key: <auditId>/<photoId>.jpg).
 *                  Bila tidak dipasang, foto disimpan di tabel `photos` D1 (tanpa kartu/billing).
 *   SETUP_TOKEN  : secret       (kode sekali pakai untuk membuat admin pertama)
 *   ALLOWED_ORIGIN (opsional)   : origin aplikasi, mis. https://audit-task-force.vercel.app ("*" bila kosong)
 *
 * Autentikasi: email + password (PBKDF2-SHA256 100.000 iterasi), token Bearer acak
 * (disimpan sebagai hash SHA-256 di tabel sessions, berlaku 30 hari). Akun dikunci
 * 15 menit setelah 5 kali salah password. Peran: admin | auditor.
 */

const SESSION_DAYS = 30
const PBKDF2_ITER = 100000
const MAX_FAILED = 5
const LOCK_MS = 15 * 60 * 1000
const MAX_AUDIT_BYTES = 1_900_000
const MAX_PHOTO_BYTES = 5 * 1024 * 1024
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/

class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

/* ------------------------------ util ------------------------------ */

function cors(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

function json(env, data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors(env) } })
}

async function body(req) {
  try {
    return await req.json()
  } catch {
    throw new HttpError(400, 'Body JSON tidak valid')
  }
}

const enc = new TextEncoder()

function b64(bytes) {
  let s = ''
  bytes.forEach((b) => { s += String.fromCharCode(b) })
  return btoa(s)
}
function unb64(str) {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0))
}
function b64url(bytes) {
  return b64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function sha256hex(text) {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(text)))
  return [...d].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function pbkdf2(password, saltB64) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unb64(saltB64), iterations: PBKDF2_ITER }, key, 256)
  return b64(new Uint8Array(bits))
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}

async function hashPassword(password) {
  const salt = b64(crypto.getRandomValues(new Uint8Array(16)))
  return { salt, hash: await pbkdf2(password, salt) }
}

function newId(prefix) {
  return prefix + b64url(crypto.getRandomValues(new Uint8Array(12)))
}

function checkPassword(pw) {
  if (typeof pw !== 'string' || pw.length < 8) throw new HttpError(400, 'Password minimal 8 karakter')
  if (pw.length > 200) throw new HttpError(400, 'Password terlalu panjang')
}

function checkEmail(email) {
  const e = String(email || '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) || e.length > 200) throw new HttpError(400, 'Email tidak valid')
  return e
}

function publicUser(u) {
  return { id: u.id, email: u.email, nama: u.nama, role: u.role }
}

/* ------------------------------ auth ------------------------------ */

async function createSession(env, userId) {
  const token = b64url(crypto.getRandomValues(new Uint8Array(32)))
  const now = Date.now()
  await env.DB.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
    .bind(await sha256hex(token), userId, now + SESSION_DAYS * 86400000, now).run()
  return token
}

async function authUser(req, env) {
  const h = req.headers.get('Authorization') || ''
  const token = h.startsWith('Bearer ') ? h.slice(7).trim() : ''
  if (!token) throw new HttpError(401, 'Belum login')
  const row = await env.DB.prepare(
    'SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?',
  ).bind(await sha256hex(token), Date.now()).first()
  if (!row) throw new HttpError(401, 'Sesi berakhir, silakan login ulang')
  return row
}

function requireAdmin(user) {
  if (user.role !== 'admin') throw new HttpError(403, 'Hanya admin yang dapat melakukan ini')
}

async function login(req, env) {
  const { email, password } = await body(req)
  const e = String(email || '').trim().toLowerCase()
  const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(e).first()
  const now = Date.now()
  if (!user) {
    await pbkdf2(String(password || ''), 'AAAAAAAAAAAAAAAAAAAAAA==') // samakan waktu respons
    throw new HttpError(401, 'Email atau password salah.')
  }
  if (user.locked_until && user.locked_until > now) {
    throw new HttpError(429, `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil((user.locked_until - now) / 60000)} menit.`)
  }
  const ok = safeEqual(await pbkdf2(String(password || ''), user.pass_salt), user.pass_hash)
  if (!ok) {
    const failed = user.failed + 1
    await env.DB.prepare('UPDATE users SET failed = ?, locked_until = ? WHERE id = ?')
      .bind(failed >= MAX_FAILED ? 0 : failed, failed >= MAX_FAILED ? now + LOCK_MS : null, user.id).run()
    throw new HttpError(401, 'Email atau password salah.')
  }
  await env.DB.prepare('UPDATE users SET failed = 0, locked_until = NULL WHERE id = ?').bind(user.id).run()
  await env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now).run()
  return { token: await createSession(env, user.id), user: publicUser(user) }
}

async function setup(req, env) {
  const { setupToken, email, nama, password } = await body(req)
  const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM users').first('n')
  if (count > 0) throw new HttpError(409, 'Admin sudah dibuat. Minta admin menambahkan akun Anda.')
  if (!env.SETUP_TOKEN || !safeEqual(String(setupToken || ''), env.SETUP_TOKEN)) throw new HttpError(403, 'Kode setup salah')
  const e = checkEmail(email)
  checkPassword(password)
  const { salt, hash } = await hashPassword(password)
  const id = newId('u')
  await env.DB.prepare('INSERT INTO users (id, email, nama, role, pass_hash, pass_salt, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(id, e, String(nama || '').trim() || null, 'admin', hash, salt, Date.now()).run()
  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first()
  return { token: await createSession(env, id), user: publicUser(user) }
}

/* ------------------------------ audits ------------------------------ */

function auditRow(r) {
  return {
    id: r.id,
    status: r.status,
    nomor_spbu: r.nomor_spbu,
    kota: r.kota,
    tanggal_audit: r.tanggal_audit,
    summary: JSON.parse(r.summary || '{}'),
    client_updated_at: r.client_updated_at ? new Date(r.client_updated_at).toISOString() : null,
    updated_at: new Date(r.updated_at).toISOString(),
    created_by: r.created_by,
    created_by_email: r.created_by_email || null,
  }
}

async function listAudits(env) {
  const { results } = await env.DB.prepare(
    `SELECT a.id, a.status, a.nomor_spbu, a.kota, a.tanggal_audit, a.summary, a.client_updated_at, a.updated_at, a.created_by, u.email AS created_by_email
     FROM audits a LEFT JOIN users u ON u.id = a.created_by ORDER BY a.updated_at DESC LIMIT 500`,
  ).all()
  return results.map(auditRow)
}

async function getAudit(env, id) {
  const r = await env.DB.prepare('SELECT data, client_updated_at FROM audits WHERE id = ?').bind(id).first()
  if (!r) throw new HttpError(404, 'Audit tidak ditemukan')
  return { data: JSON.parse(r.data), client_updated_at: r.client_updated_at ? new Date(r.client_updated_at).toISOString() : null }
}

async function putAudit(req, env, user, id) {
  const raw = await req.text()
  if (raw.length > MAX_AUDIT_BYTES) throw new HttpError(413, 'Data audit terlalu besar')
  let b
  try { b = JSON.parse(raw) } catch { throw new HttpError(400, 'Body JSON tidak valid') }
  if (!b || typeof b.data !== 'object') throw new HttpError(400, 'Field data wajib diisi')
  const status = b.status === 'selesai' ? 'selesai' : 'draft'
  const now = Date.now()
  const clientTs = b.client_updated_at ? Date.parse(b.client_updated_at) || null : null
  await env.DB.prepare(
    `INSERT INTO audits (id, status, nomor_spbu, kota, tanggal_audit, data, summary, client_updated_at, created_at, updated_at, created_by, updated_by)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9, ?10, ?10)
     ON CONFLICT (id) DO UPDATE SET status = ?2, nomor_spbu = ?3, kota = ?4, tanggal_audit = ?5, data = ?6, summary = ?7,
       client_updated_at = ?8, updated_at = ?9, updated_by = ?10`,
  ).bind(
    id, status, b.nomor_spbu || null, b.kota || null, b.tanggal_audit || null,
    JSON.stringify(b.data), JSON.stringify(b.summary || {}), clientTs, now, user.id,
  ).run()
  return { ok: true }
}

async function deleteAudit(env, ctx, user, id) {
  const r = await env.DB.prepare('SELECT status, created_by FROM audits WHERE id = ?').bind(id).first()
  if (!r) return { ok: true }
  if (user.role !== 'admin' && !(r.created_by === user.id && r.status === 'draft')) {
    throw new HttpError(403, 'Hanya admin atau pembuat (status draft) yang dapat menghapus audit ini')
  }
  await env.DB.prepare('DELETE FROM audits WHERE id = ?').bind(id).run()
  ctx.waitUntil(photoStore(env).deleteAudit(id))
  return { ok: true }
}

/* ------------------------------ photos ------------------------------ */

/**
 * Penyimpanan foto: R2 bila binding PHOTOS dipasang, selain itu tabel `photos` di D1.
 * D1 gratis ±500 MB per database — foto dikecilkan klien (±1024 px) sebelum upload.
 */
function photoStore(env) {
  if (env.PHOTOS) {
    return {
      kind: 'r2',
      async put(key, auditId, buf) {
        await env.PHOTOS.put(key, buf, { httpMetadata: { contentType: 'image/jpeg' } })
      },
      async get(key) {
        const obj = await env.PHOTOS.get(key)
        return obj ? obj.body : null
      },
      async deleteAudit(auditId) {
        let cursor
        do {
          const list = await env.PHOTOS.list({ prefix: `${auditId}/`, cursor })
          if (list.objects.length) await env.PHOTOS.delete(list.objects.map((o) => o.key))
          cursor = list.truncated ? list.cursor : undefined
        } while (cursor)
      },
      async usage() {
        let count = 0, bytes = 0, cursor
        do {
          const list = await env.PHOTOS.list({ cursor })
          list.objects.forEach((o) => { count++; bytes += o.size })
          cursor = list.truncated ? list.cursor : undefined
        } while (cursor)
        return { count, bytes }
      },
    }
  }
  return {
    kind: 'd1',
    async put(key, auditId, buf) {
      await env.DB.prepare('INSERT OR REPLACE INTO photos (key, audit_id, data, size, created_at) VALUES (?, ?, ?, ?, ?)')
        .bind(key, auditId, buf, buf.byteLength, Date.now()).run()
    },
    async get(key) {
      const r = await env.DB.prepare('SELECT data FROM photos WHERE key = ?').bind(key).first()
      if (!r) return null
      const d = r.data
      return d instanceof ArrayBuffer ? d : Uint8Array.from(d).buffer
    },
    async deleteAudit(auditId) {
      await env.DB.prepare('DELETE FROM photos WHERE audit_id = ?').bind(auditId).run()
    },
    async usage() {
      const r = await env.DB.prepare('SELECT COUNT(*) AS n, COALESCE(SUM(size), 0) AS b FROM photos').first()
      return { count: r.n, bytes: r.b }
    },
  }
}

async function putPhoto(req, env, auditId, photoId) {
  const len = Number(req.headers.get('Content-Length') || 0)
  if (len > MAX_PHOTO_BYTES) throw new HttpError(413, 'Foto terlalu besar (maks 5 MB)')
  const buf = await req.arrayBuffer()
  if (buf.byteLength > MAX_PHOTO_BYTES) throw new HttpError(413, 'Foto terlalu besar (maks 5 MB)')
  const head = new Uint8Array(buf.slice(0, 3))
  if (!(head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff)) throw new HttpError(415, 'Hanya foto JPEG')
  const store = photoStore(env)
  if (store.kind === 'd1' && buf.byteLength > 1_500_000) throw new HttpError(413, 'Foto terlalu besar untuk penyimpanan D1 (maks 1,5 MB)')
  const key = `${auditId}/${photoId}.jpg`
  await store.put(key, auditId, buf)
  return { path: key }
}

async function getPhoto(env, auditId, photoId) {
  const body = await photoStore(env).get(`${auditId}/${photoId}.jpg`)
  if (!body) throw new HttpError(404, 'Foto tidak ditemukan')
  return new Response(body, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=86400', ...cors(env) } })
}

async function usage(env) {
  const store = photoStore(env)
  const photos = await store.usage()
  const audits = await env.DB.prepare('SELECT COUNT(*) AS n FROM audits').first('n')
  const users = await env.DB.prepare('SELECT COUNT(*) AS n FROM users').first('n')
  // Batas kuota gratis (perkiraan): D1 ±500 MB per database, R2 ±10 GB
  return { storage: store.kind, photos, audits, users, limitBytes: store.kind === 'r2' ? 10 * 1024 ** 3 : 500 * 1024 ** 2 }
}

/* ------------------------------ members ------------------------------ */

async function listMembers(env) {
  const { results } = await env.DB.prepare('SELECT id, email, nama, role, created_at FROM users ORDER BY created_at').all()
  return results.map((u) => ({ user_id: u.id, email: u.email, nama: u.nama, role: u.role, created_at: new Date(u.created_at).toISOString() }))
}

async function upsertMember(req, env) {
  const { email, nama, role, password } = await body(req)
  const e = checkEmail(email)
  if (!['admin', 'auditor'].includes(role)) throw new HttpError(400, 'Peran tidak valid')
  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(e).first()
  if (existing) {
    await env.DB.prepare('UPDATE users SET nama = ?, role = ? WHERE id = ?').bind(String(nama || '').trim() || null, role, existing.id).run()
    if (password) {
      checkPassword(password)
      const { salt, hash } = await hashPassword(password)
      await env.DB.prepare('UPDATE users SET pass_hash = ?, pass_salt = ?, failed = 0, locked_until = NULL WHERE id = ?').bind(hash, salt, existing.id).run()
      await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(existing.id).run()
    }
    return { ok: true, updated: true }
  }
  checkPassword(password)
  const { salt, hash } = await hashPassword(password)
  await env.DB.prepare('INSERT INTO users (id, email, nama, role, pass_hash, pass_salt, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(newId('u'), e, String(nama || '').trim() || null, role, hash, salt, Date.now()).run()
  return { ok: true, created: true }
}

async function deleteMember(env, user, id) {
  if (id === user.id) throw new HttpError(400, 'Tidak dapat menghapus akun sendiri')
  await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id).run()
  await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run()
  return { ok: true }
}

async function changePassword(req, env, user) {
  const { oldPassword, newPassword } = await body(req)
  if (!safeEqual(await pbkdf2(String(oldPassword || ''), user.pass_salt), user.pass_hash)) throw new HttpError(400, 'Password lama salah')
  checkPassword(newPassword)
  const { salt, hash } = await hashPassword(newPassword)
  await env.DB.prepare('UPDATE users SET pass_hash = ?, pass_salt = ? WHERE id = ?').bind(hash, salt, user.id).run()
  return { ok: true }
}

/* ------------------------------ router ------------------------------ */

async function route(req, env, ctx) {
  const url = new URL(req.url)
  const p = url.pathname.replace(/\/+$/, '')
  const m = req.method
  let x

  if (p === '/api/health' && m === 'GET') {
    const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM users').first('n')
    return json(env, { ok: true, needsSetup: n === 0 })
  }
  if (p === '/api/setup' && m === 'POST') return json(env, await setup(req, env))
  if (p === '/api/login' && m === 'POST') return json(env, await login(req, env))

  const user = await authUser(req, env)

  if (p === '/api/logout' && m === 'POST') {
    const token = (req.headers.get('Authorization') || '').slice(7).trim()
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256hex(token)).run()
    return json(env, { ok: true })
  }
  if (p === '/api/me' && m === 'GET') return json(env, { user: publicUser(user) })
  if (p === '/api/me/password' && m === 'PUT') return json(env, await changePassword(req, env, user))

  if (p === '/api/audits' && m === 'GET') return json(env, await listAudits(env))
  if ((x = p.match(/^\/api\/audits\/([^/]+)$/))) {
    const id = decodeURIComponent(x[1])
    if (!ID_RE.test(id)) throw new HttpError(400, 'ID audit tidak valid')
    if (m === 'GET') return json(env, await getAudit(env, id))
    if (m === 'PUT') return json(env, await putAudit(req, env, user, id))
    if (m === 'DELETE') return json(env, await deleteAudit(env, ctx, user, id))
  }
  if ((x = p.match(/^\/api\/photos\/([^/]+)\/([^/]+?)(?:\.jpg)?$/))) {
    const [auditId, photoId] = [decodeURIComponent(x[1]), decodeURIComponent(x[2])]
    if (!ID_RE.test(auditId) || !ID_RE.test(photoId)) throw new HttpError(400, 'ID foto tidak valid')
    if (m === 'PUT') return json(env, await putPhoto(req, env, auditId, photoId))
    if (m === 'GET') return getPhoto(env, auditId, photoId)
  }

  if (p === '/api/usage' && m === 'GET') { requireAdmin(user); return json(env, await usage(env)) }
  if (p === '/api/members' && m === 'GET') { requireAdmin(user); return json(env, await listMembers(env)) }
  if (p === '/api/members' && m === 'POST') { requireAdmin(user); return json(env, await upsertMember(req, env)) }
  if ((x = p.match(/^\/api\/members\/([^/]+)$/)) && m === 'DELETE') { requireAdmin(user); return json(env, await deleteMember(env, user, decodeURIComponent(x[1]))) }

  throw new HttpError(404, 'Endpoint tidak ditemukan')
}

export default {
  async fetch(req, env, ctx) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(env) })
    try {
      return await route(req, env, ctx)
    } catch (e) {
      if (e instanceof HttpError) return json(env, { error: e.message }, e.status)
      console.error(e)
      return json(env, { error: 'Terjadi kesalahan server' }, 500)
    }
  },
}
