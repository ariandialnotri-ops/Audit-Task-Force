/**
 * Manajemen foto bukti.
 *
 * Audit hanya menyimpan metadata foto `{id, thumb, ts, lat, lng, acc, path?}`
 * dengan thumbnail kecil (±6 KB). File ukuran penuh disimpan terpisah sebagai
 * Blob di IndexedDB (store `photos`) dan baru dimuat saat dibutuhkan
 * (laporan, PDF, upload cloud). Ini membuat autosave & render checklist ringan
 * walau audit berisi puluhan foto.
 */
import { putPhoto, getPhoto, deletePhotos } from './storage.js'

const THUMB_W = 200

export function newPhotoId() {
  return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

/** Semua daftar foto di dalam audit (item + tenant). */
export function photoLists(audit) {
  const lists = []
  Object.values(audit.results || {}).forEach((r) => {
    if (Array.isArray(r.photos)) lists.push(r.photos)
    if (Array.isArray(r.tenants)) r.tenants.forEach((t) => { lists.push(t.fotoTenant || (t.fotoTenant = [])); lists.push(t.fotoIzin || (t.fotoIzin = [])) })
  })
  return lists
}

export function allPhotoIds(audit) {
  return photoLists(audit).flat().map((p) => p && p.id).filter(Boolean)
}

export function thumbSrc(p) {
  if (!p) return ''
  if (typeof p === 'string') return p
  return p.thumb || p.src || ''
}

export function canvasThumb(source, w, h) {
  const tw = Math.min(THUMB_W, w)
  const th = Math.round(h * tw / w)
  const c = document.createElement('canvas')
  c.width = tw
  c.height = th
  c.getContext('2d').drawImage(source, 0, 0, tw, th)
  return c.toDataURL('image/jpeg', 0.6)
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export async function dataUrlToBlob(dataUrl) {
  return (await fetch(dataUrl)).blob()
}

export async function thumbFromBlob(blob) {
  const url = URL.createObjectURL(blob)
  try {
    const img = await loadImage(url)
    return canvasThumb(img, img.naturalWidth, img.naturalHeight)
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Simpan hasil kamera `{blob, thumb, ts, lat, lng, acc}` → metadata foto. */
export async function storeNewPhoto({ blob, ...meta }) {
  const id = newPhotoId()
  await putPhoto(id, blob)
  return { id, ...meta }
}

/** Blob ukuran penuh dari metadata foto (atau null bila tidak tersedia di perangkat). */
export async function photoBlob(p) {
  if (!p) return null
  if (p.id) {
    const b = await getPhoto(p.id)
    if (b) return b
  }
  if (p.src) return dataUrlToBlob(p.src)
  return null
}

const urlCache = new Map()
/** URL ukuran penuh (object URL, di-cache). Jatuh ke thumbnail bila file tidak ada. */
export async function fullUrl(p) {
  if (!p) return ''
  if (p.src) return p.src
  if (p.id && urlCache.has(p.id)) return urlCache.get(p.id)
  const b = p.id ? await getPhoto(p.id) : null
  if (!b) return thumbSrc(p)
  const url = URL.createObjectURL(b)
  urlCache.set(p.id, url)
  return url
}

export function removePhotoFiles(list) {
  const ids = (list || []).map((p) => p && p.id).filter(Boolean)
  ids.forEach((id) => {
    if (urlCache.has(id)) { URL.revokeObjectURL(urlCache.get(id)); urlCache.delete(id) }
  })
  return deletePhotos(ids)
}

/**
 * Pindahkan foto lama (dataURL di dalam audit) ke store foto + buat thumbnail.
 * Mengembalikan true bila audit berubah.
 */
export async function migrateAuditPhotos(audit) {
  let changed = false
  for (const list of photoLists(audit)) {
    for (let i = 0; i < list.length; i++) {
      let p = list[i]
      if (typeof p === 'string') p = { src: p }
      if (!p.src) continue
      const blob = await dataUrlToBlob(p.src)
      const id = p.id || newPhotoId()
      await putPhoto(id, blob)
      const thumb = p.thumb || await thumbFromBlob(blob)
      const { src, ...rest } = p
      list[i] = { ...rest, id, thumb }
      changed = true
    }
  }
  return changed
}
