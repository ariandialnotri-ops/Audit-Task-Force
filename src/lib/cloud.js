/**
 * Sinkronisasi cloud (Supabase) — offline-first.
 *
 * Data tetap disimpan dulu di IndexedDB perangkat. Bila auditor login dan ada
 * sinyal, audit yang berubah dikirim ke tabel `audit_reports` dan fotonya ke
 * bucket privat `audit-foto`. Area Business Head / admin dapat melihat rekap
 * semua audit dan mengunduh audit lengkap ke perangkatnya.
 *
 * Modul ini di-load secara dinamis setelah tampilan pertama muncul, supaya
 * library Supabase tidak memperlambat pembukaan aplikasi.
 */
import { createClient } from '@supabase/supabase-js'
import { photoLists, photoBlob, newPhotoId, thumbFromBlob } from './photos.js'
import { putPhoto } from './storage.js'

// URL & publishable key memang aman berada di sisi klien (akses dijaga RLS).
// Bisa ditimpa lewat environment variable Vercel.
const URL = import.meta.env.VITE_SUPABASE_URL || 'https://tpkxekmcrzavcyazkuzn.supabase.co'
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_Xmz3qWjXVacxU6gXiWc8uw_ZktJ4A2P'
const BUCKET = 'audit-foto'

export const cloudEnabled = !!(URL && KEY)
const sb = cloudEnabled ? createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true } }) : null

function friendly(message) {
  if (/failed to fetch|networkerror|load failed/i.test(message || '')) return 'Tidak dapat terhubung ke server. Periksa koneksi internet.'
  return message
}

function check({ data, error }) {
  if (error) throw new Error(friendly(error.message))
  return data
}

export async function getSession() {
  if (!sb) return null
  const { data } = await sb.auth.getSession()
  return data.session
}

export function onAuthChange(cb) {
  if (!sb) return () => {}
  const { data } = sb.auth.onAuthStateChange((_event, session) => cb(session))
  return () => data.subscription.unsubscribe()
}

export async function signIn(email, password) {
  const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password })
  if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Email atau password salah.' : friendly(error.message))
}

export async function signOut() {
  await sb.auth.signOut()
}

/** Peran pengguna login ('admin' | 'auditor'), atau null bila belum terdaftar sebagai anggota. */
export async function claimRole() {
  return check(await sb.rpc('audit_claim_first'))
}

/* ------------------------------ Foto ------------------------------ */

function rid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

/** Unggah foto yang belum punya `path` di storage. Mengubah objek foto (menambah `path`). */
async function uploadPendingPhotos(audit) {
  let uploaded = 0
  for (const list of photoLists(audit)) {
    for (const p of list) {
      if (!p || p.path) continue
      const blob = await photoBlob(p)
      if (!blob) continue
      const path = `${audit.id}/${p.id || rid()}.jpg`
      check(await sb.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: true }))
      p.path = path
      uploaded++
    }
  }
  return uploaded
}

/** Salinan audit tanpa file gambar penuh (hanya metadata + thumbnail + path storage). */
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
  const row = {
    id: audit.id,
    status: audit.status === 'selesai' ? 'selesai' : 'draft',
    nomor_spbu: audit.info.nomorSpbu || null,
    kota: audit.info.kota || null,
    tanggal_audit: /^\d{4}-\d{2}-\d{2}$/.test(audit.info.tanggalAudit || '') ? audit.info.tanggalAudit : null,
    data: stripForCloud(audit),
    summary,
    client_updated_at: new Date(audit.updatedAt).toISOString(),
  }
  check(await sb.from('audit_reports').upsert(row, { onConflict: 'id' }))
  return { photos }
}

export async function listRemote() {
  return check(await sb.from('audit_reports')
    .select('id,status,nomor_spbu,kota,tanggal_audit,summary,client_updated_at,updated_at,created_by')
    .order('updated_at', { ascending: false })
    .limit(500))
}

/** Unduh audit lengkap (termasuk foto) dari cloud menjadi objek audit lokal. */
export async function pullAudit(id, onProgress) {
  const row = check(await sb.from('audit_reports').select('data,client_updated_at').eq('id', id).single())
  const audit = row.data
  const lists = photoLists(audit)
  const total = lists.reduce((n, l) => n + l.length, 0)
  let done = 0
  for (const list of lists) {
    for (const p of list) {
      if (p.path) {
        const blob = check(await sb.storage.from(BUCKET).download(p.path))
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
  check(await sb.from('audit_reports').delete().eq('id', id))
}

/* ------------------------------ Anggota ------------------------------ */

export async function listMembers() {
  return check(await sb.from('audit_members').select('user_id,email,nama,role,created_at').order('created_at'))
}

export async function addMember(email, nama, role) {
  check(await sb.rpc('audit_add_member', { p_email: email, p_nama: nama, p_role: role }))
}

export async function removeMember(userId) {
  check(await sb.from('audit_members').delete().eq('user_id', userId))
}
