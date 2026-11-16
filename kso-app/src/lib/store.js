// Penyimpanan lokal: IndexedDB `kso-tac-target` — store `kv` (state JSON) + store `files` (Blob materi).
const DB_NAME = 'kso-tac-target';
const STATE_KEY = 'state';
let dbp = null;

function db() {
  if (!dbp) {
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
        if (!d.objectStoreNames.contains('files')) d.createObjectStore('files');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbp;
}

async function tx(store, mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction(store, mode);
    const r = fn(t.objectStore(store));
    t.oncomplete = () => resolve(r?.result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export const emptyState = () => ({
  version: 1,
  targets: [], materi: [], templates: null,
  settings: { pengirim: '', jabatan: '', perusahaan: 'PT Pertamina Retail', targetGoLive: '' },
});

export async function loadState() {
  const s = await tx('kv', 'readonly', st => st.get(STATE_KEY));
  return { ...emptyState(), ...(s || {}), settings: { ...emptyState().settings, ...(s?.settings || {}) } };
}

let timer = null;
let pending = null;
export function saveState(state, immediate = false) {
  pending = state;
  clearTimeout(timer);
  const run = () => { const s = pending; pending = null; return tx('kv', 'readwrite', st => st.put(JSON.parse(JSON.stringify(s)), STATE_KEY)); };
  if (immediate) return run();
  timer = setTimeout(run, 300);
  return Promise.resolve();
}
export function flushState() { if (pending) { clearTimeout(timer); return saveState(pending, true); } }

export const putFile = (id, blob) => tx('files', 'readwrite', st => st.put(blob, id));
export const getFile = id => tx('files', 'readonly', st => st.get(id));
export const deleteFile = id => tx('files', 'readwrite', st => st.delete(id));

export async function allFiles() {
  const d = await db();
  return new Promise((resolve, reject) => {
    const out = {};
    const t = d.transaction('files', 'readonly');
    const req = t.objectStore('files').openCursor();
    req.onsuccess = () => { const c = req.result; if (c) { out[c.key] = c.value; c.continue(); } };
    t.oncomplete = () => resolve(out);
    t.onerror = () => reject(t.error);
  });
}
