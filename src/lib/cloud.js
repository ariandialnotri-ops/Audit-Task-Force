/**
 * Sinkronisasi cloud (Cloudflare Worker + D1 + R2) — offline-first.
 *
 * Data tetap disimpan dulu di IndexedDB perangkat. Bila auditor login dan ada
 * sinyal, audit yang berubah dikirim ke API (`worker/`), foto ke R2. Area
 * Business Head / admin dapat melihat rekap semua audit dan mengunduh audit
 * lengkap ke perangkatnya.
 *
 * Alamat API: env build `VITE_AUDIT_API_URL` → isian tab Cloud (per perangkat) →
 * default Worker produksi `audit-task-force.ariandialnotri.workers.dev`.
 */
import { photoLists, photoBlob, newPhotoId, thumbFromBlob } from './photos.js'
import { putPhoto } from './storage.js'
import { blobSha256 } from './camera.js'

const LS_URL = 'audit_api_url'
const LS_TOKEN = 'audit_api_token'
const LS_USER = 'audit_api_user'

function lsGet(k) { try { return localStorage.getItem(k) } catch { return null } }
function lsSet(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v) } catch { /* ignore */ } }

/** Worker produksi tim audit (Cloudflare). Bisa ditimpa env build atau isian tab Cloud. */
const DEFAULT_API = 'https://audit-task-force.ariandialnotri.workers.dev'

export function apiBase() {
  return (import.meta.env.VITE_AUDIT_API_URL || lsGet(LS_URL) || DEFAULT_API || '').replace(/\/+$/, '')
}
export function apiFromEnv() {
  return !!import.meta.env.VITE_AUDIT_API_URL
}
export function setApiBase(url) {
  const u = String(url || '').trim().replace(/\/+$/, '')
  if (u && !/^https:\/\/|^http:\/\/localhost|^http:\/\/127\.0\.0\.1/.test(u)) throw new Error('Alamat API harus diawali https://')
  lsSet(LS_URL, u || null)
}
export function isConfigured() {
  return !!apiBase()
}

/* ------------------------------ HTTP ------------------------------ */

const listeners = new Set()
function emit() {
  const s = sessionFromStorage()
  listeners.forEach((cb) => cb(s))
}

function sessionFromStorage() {
  const token = lsGet(LS_TOKEN)
  if (!token) return null
  try { return { token, user: JSON.parse(lsGet(LS_USER) || 'null') } } catch { return null }
}

function saveSession(token, user) {
  lsSet(LS_TOKEN, token)
  lsSet(LS_USER, JSON.stringify(user))
  emit()
}

function clearSession() {
  lsSet(LS_TOKEN, null)
  lsSet(LS_USER, null)
  emit()
}

async function api(method, path, { json, raw, auth = true, expect = 'json' } = {}) {
  const base = apiBase()
  if (!base) throw new Error('Alamat API cloud belum diisi')
  const headers = {}
  const s = sessionFromStorage()
  if (auth && s) headers.Authorization = 'Bearer ' + s.token
  let body
  if (json !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(json) }
  if (raw) { headers['Content-Type'] = 'image/jpeg'; body = raw }
  let res
  try {
    res = await fetch(base + path, { method, headers, body })
  } catch {
    throw new Error('Tidak dapat terhubung ke server. Periksa koneksi internet.')
  }
  if (res.status === 401 && auth && s) clearSession()
  if (!res.ok) {
    let msg = `Server error ${res.status}`
    try { msg = (await res.json()).error || msg } catch { /* ignore */ }
    throw new Error(msg)
  }
  if (expect === 'blob') return res.blob()
  return res.json()
}

/* ------------------------------ Auth ------------------------------ */

export async function getSession() {
  return sessionFromStorage()
}

export function onAuthChange(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export async function health() {
  return api('GET', '/api/health', { auth: false })
}

export async function signIn(email, password) {
  const { token, user } = await api('POST', '/api/login', { json: { email: email.trim(), password }, auth: false })
  saveSession(token, user)
}

export async function setupAdmin(setupToken, email, nama, password) {
  const { token, user } = await api('POST', '/api/setup', { json: { setupToken, email, nama, password }, auth: false })
  saveSession(token, user)
}

export async function signOut() {
  try { await api('POST', '/api/logout') } catch { /* tetap keluar di perangkat */ }
  clearSession()
}

/** Peran pengguna login ('admin' | 'auditor'), null bila sesi tidak berlaku. */
export async function claimRole() {
  const { user } = await api('GET', '/api/me')
  lsSet(LS_USER, JSON.stringify(user))
  return user.role
}

export async function changePassword(oldPassword, newPassword) {
  await api('PUT', '/api/me/password', { json: { oldPassword, newPassword } })
}

/* ------------------------------ Foto ------------------------------ */

const CLOUD_MAX_W = 1024
const CLOUD_QUALITY = 0.62

/**
 * Perkecil foto untuk cloud (±1024 px, ±80–100 KB) agar kuota gratis awet.
 * Foto asli tetap utuh di perangkat & PDF. Stamp GPS/tanggal ikut karena sudah tercetak di gambar.
 */
async function compressForCloud(blob) {
  try {
    const bmp = await createImageBitmap(blob)
    if (bmp.width <= CLOUD_MAX_W && blob.size <= 160 * 1024) { bmp.close && bmp.close(); return blob }
    const scale = Math.min(1, CLOUD_MAX_W / bmp.width)
    const c = document.createElement('canvas')
    c.width = Math.round(bmp.width * scale)
    c.height = Math.round(bmp.height * scale)
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height)
    bmp.close && bmp.close()
    const out = await new Promise((res) => c.toBlob(res, 'image/jpeg', CLOUD_QUALITY))
    return out && out.size < blob.size ? out : blob
  } catch {
    return blob
  }
}

async function uploadPendingPhotos(audit) {
  let uploaded = 0
  for (const list of photoLists(audit)) {
    for (const p of list) {
      if (!p || p.path) continue
      const original = await photoBlob(p)
      if (!original) continue
      const blob = await compressForCloud(original)
      // Salinan cloud dikompres ulang → simpan sidik jarinya juga agar tetap bisa diverifikasi setelah diunduh
      if (p.sha256) p.cloudSha256 = blob === original ? p.sha256 : await blobSha256(blob)
      if (!p.id) p.id = newPhotoId()
      const { path } = await api('PUT', `/api/photos/${encodeURIComponent(audit.id)}/${encodeURIComponent(p.id)}`, { raw: blob })
      p.path = path
      uploaded++
    }
  }
  return uploaded
}

/** Salinan audit tanpa file gambar penuh (hanya metadata + thumbnail + path). */
function stripForCloud(audit) {
  const copy = JSON.parse(JSON.stringify(audit))
  delete copy.syncedAt
  photoLists(copy).forEach((list) => {
    for (let i = 0; i < list.length; i++) {
      const { src, ...rest } = typeof list[i] === 'string' ? { src: list[i] } : list[i]
      list[i] = rest
    }
  })
  return copy
}

/* ------------------------------ Audit ------------------------------ */

export async function pushAudit(audit, summary) {
  const photos = await uploadPendingPhotos(audit)
  await api('PUT', `/api/audits/${encodeURIComponent(audit.id)}`, {
    json: {
      status: audit.status === 'selesai' ? 'selesai' : 'draft',
      nomor_spbu: audit.info.nomorSpbu || null,
      kota: audit.info.kota || null,
      tanggal_audit: /^\d{4}-\d{2}-\d{2}$/.test(audit.info.tanggalAudit || '') ? audit.info.tanggalAudit : null,
      data: stripForCloud(audit),
      summary,
      client_updated_at: new Date(audit.updatedAt).toISOString(),
    },
  })
  return { photos }
}

export async function listRemote() {
  return api('GET', '/api/audits')
}

/** Unduh audit lengkap (termasuk foto) dari cloud menjadi objek audit lokal. */
export async function pullAudit(id, onProgress) {
  const row = await api('GET', `/api/audits/${encodeURIComponent(id)}`)
  const audit = row.data
  const lists = photoLists(audit)
  const total = lists.reduce((n, l) => n + l.length, 0)
  let done = 0
  for (const list of lists) {
    for (const p of list) {
      if (p.path) {
        const blob = await api('GET', `/api/photos/${p.path.split('/').map(encodeURIComponent).join('/')}`, { expect: 'blob' })
        if (!p.id) p.id = newPhotoId()
        await putPhoto(p.id, blob)
        if (!p.thumb) p.thumb = await thumbFromBlob(blob)
      }
      done++
      if (onProgress) onProgress(done, total)
    }
  }
  audit.updatedAt = row.client_updated_at ? new Date(row.client_updated_at).getTime() : Date.now()
  audit.syncedAt = audit.updatedAt
  return audit
}

export async function deleteRemote(id) {
  await api('DELETE', `/api/audits/${encodeURIComponent(id)}`)
}

/* ------------------------------ Anggota ------------------------------ */

export async function usage() {
  return api('GET', '/api/usage')
}

export async function listMembers() {
  return api('GET', '/api/members')
}

export async function addMember(email, nama, role, password) {
  await api('POST', '/api/members', { json: { email, nama, role, password } })
}

export async function removeMember(userId) {
  await api('DELETE', `/api/members/${encodeURIComponent(userId)}`)
}
