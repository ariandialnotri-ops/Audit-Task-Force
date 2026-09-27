/**
 * Penyimpanan audit di IndexedDB (kapasitas jauh lebih besar dari localStorage,
 * perlu untuk foto ber-timestamp GPS). Data v1 di localStorage (`pw_audits_v1`)
 * dimigrasikan otomatis sekali saat pertama dibuka.
 */
const DB_NAME = 'audit-pertamina-way'
const DB_VERSION = 1
const STORE = 'audits'
const LEGACY_KEY = 'pw_audits_v1'

let dbPromise = null

function openDb() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function tx(mode, fn) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode)
    const store = t.objectStore(STORE)
    const out = fn(store)
    t.oncomplete = () => resolve(out && 'result' in out ? out.result : undefined)
    t.onerror = () => reject(t.error)
    t.onabort = () => reject(t.error)
  }))
}

export async function loadAll() {
  const list = await tx('readonly', (s) => s.getAll())
  const audits = {}
  ;(list || []).forEach((a) => { audits[a.id] = a })

  // Migrasi sekali dari localStorage v1
  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null')
    if (legacy && typeof legacy === 'object') {
      for (const a of Object.values(legacy)) {
        if (!audits[a.id]) {
          audits[a.id] = a
          await putAudit(a)
        }
      }
      localStorage.removeItem(LEGACY_KEY)
    }
  } catch (e) {
    console.warn('Migrasi data lama gagal', e)
  }
  return audits
}

export function putAudit(audit) {
  return tx('readwrite', (s) => { s.put(audit) })
}

export function deleteAudit(id) {
  return tx('readwrite', (s) => { s.delete(id) })
}

/* Simpan tertunda (debounce) per audit supaya ketikan tidak menulis ke disk tiap huruf. */
const pending = new Map()
export function scheduleSave(audit, delay = 400) {
  clearTimeout(pending.get(audit.id))
  pending.set(audit.id, setTimeout(() => {
    pending.delete(audit.id)
    putAudit(audit).catch((e) => console.error('Gagal menyimpan', e))
  }, delay))
}

/** Tulis segera (dipakai tombol Submit). */
export async function flushSave(audit) {
  clearTimeout(pending.get(audit.id))
  pending.delete(audit.id)
  await putAudit(audit)
}

export async function flushAll(audits) {
  const ids = [...pending.keys()]
  for (const id of ids) {
    if (audits[id]) await flushSave(audits[id])
  }
}
