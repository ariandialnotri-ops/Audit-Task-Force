/**
 * Kamera + timestamp + kode verifikasi keabsahan.
 *
 * - Foto hanya bisa diambil langsung dari kamera (getUserMedia), tidak ada
 *   pilihan galeri sama sekali.
 * - Setiap foto dicap (stamp) tanggal-jam, nomor SPBU, kode item, nama auditor
 *   dan KODE VERIFIKASI unik langsung di gambar.
 * - Setelah jepret muncul pratinjau: "Ulangi" atau "Gunakan Foto".
 * - Sidik jari SHA-256 file foto disimpan; `verifyPhoto()` memeriksa bahwa file
 *   belum diubah sejak diambil.
 */
import { canvasThumb } from './photos.js'

export class CameraError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

export function cameraSupported() {
  return typeof navigator !== 'undefined' && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
}

function pad(n) { return String(n).padStart(2, '0') }

export function formatStampTime(ts) {
  const d = new Date(ts)
  let tz = ''
  try {
    tz = new Intl.DateTimeFormat('id-ID', { timeZoneName: 'short' }).formatToParts(d).find((p) => p.type === 'timeZoneName')?.value || ''
  } catch { /* ignore */ }
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${tz ? ' ' + tz : ''}`
}

async function sha256Hex(data) {
  const buf = typeof data === 'string' ? new TextEncoder().encode(data) : data
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', buf))
  return [...d].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Kode verifikasi 8 karakter (mis. "7F3A-91C2") dari data foto + nonce acak. */
async function makeVerifyCode(parts) {
  const nonce = [...crypto.getRandomValues(new Uint8Array(8))].map((b) => b.toString(16).padStart(2, '0')).join('')
  const h = await sha256Hex([...parts, nonce].join('|'))
  return h.slice(0, 8).toUpperCase().replace(/^(.{4})/, '$1-')
}

/** Hitung SHA-256 blob. */
export async function blobSha256(blob) {
  return sha256Hex(await blob.arrayBuffer())
}

/**
 * Periksa keabsahan foto: file yang tersimpan sama persis dengan saat dijepret.
 * Mengembalikan 'valid' | 'changed' | 'unknown' (foto lama tanpa sidik jari).
 */
export async function verifyPhoto(meta, blob) {
  if (!meta || !meta.sha256 || !blob) return 'unknown'
  const h = await blobSha256(blob)
  // cloudSha256 = salinan terkompres yang diunggah ke cloud (foto hasil unduh dari cloud)
  return h === meta.sha256 || (meta.cloudSha256 && h === meta.cloudSha256) ? 'valid' : 'changed'
}

function drawStamp(ctx, w, h, lines) {
  const fs = Math.max(14, Math.round(w / 42))
  const padPx = Math.round(fs * 0.6)
  const lh = Math.round(fs * 1.35)
  const boxH = padPx * 2 + lh * lines.length
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  ctx.fillRect(0, h - boxH, w, boxH)
  ctx.fillStyle = '#FFD200'
  ctx.fillRect(0, h - boxH, Math.max(4, Math.round(fs / 4)), boxH)
  ctx.textBaseline = 'top'
  lines.forEach((line, i) => {
    ctx.font = `${i === 0 ? '700' : '500'} ${fs}px "JetBrains Mono", ui-monospace, monospace`
    ctx.fillStyle = '#fff'
    ctx.fillText(line, padPx + 6, h - boxH + padPx + i * lh, w - padPx * 2)
  })
}

const escHtml = (s) => String(s || '').replace(/[<>&"]/g, '')

/**
 * Buka kamera layar penuh. Resolve dengan `{blob, thumb, ts, code, sha256, auditor}`
 * atau null bila dibatalkan. Reject bila kamera tidak bisa dipakai.
 */
export function captureStampedPhoto({ label = '', spbu = '', auditor = '' } = {}) {
  return new Promise((resolve, reject) => {
    if (!cameraSupported()) {
      reject(new CameraError('nocamera', window.isSecureContext
        ? 'Kamera tidak tersedia di browser ini.'
        : 'Kamera hanya bisa dipakai lewat HTTPS (buka aplikasi dari link resmi).'))
      return
    }

    const root = document.createElement('div')
    root.className = 'cam-overlay'
    root.innerHTML = `
      <div class="cam-top">
        <button class="cam-x" data-cam="cancel" aria-label="Tutup">&times;</button>
        <div class="cam-title">${escHtml(label)}</div>
      </div>
      <video class="cam-video" autoplay playsinline muted></video>
      <img class="cam-preview" alt="Pratinjau foto" hidden>
      <div class="cam-info">
        <div class="cam-time" data-cam="time"></div>
        <div class="cam-sub">${escHtml([spbu ? `SPBU ${spbu}` : '', auditor].filter(Boolean).join(' · '))}</div>
      </div>
      <div class="cam-bottom" data-stage="live">
        <button class="cam-shutter" data-cam="shoot" disabled aria-label="Ambil foto"></button>
      </div>
      <div class="cam-bottom cam-actions" data-stage="preview" hidden>
        <button class="cam-btn ghost" data-cam="retake">Ulangi</button>
        <button class="cam-btn" data-cam="use">Gunakan Foto</button>
      </div>`
    document.body.appendChild(root)

    const video = root.querySelector('video')
    const preview = root.querySelector('.cam-preview')
    const timeEl = root.querySelector('[data-cam="time"]')
    const shoot = root.querySelector('[data-cam="shoot"]')
    const liveBar = root.querySelector('[data-stage="live"]')
    const previewBar = root.querySelector('[data-stage="preview"]')
    const infoBox = root.querySelector('.cam-info')
    let stream = null
    let done = false
    let pending = null // hasil jepretan menunggu konfirmasi
    let previewUrl = null

    const clock = setInterval(() => { timeEl.textContent = formatStampTime(Date.now()) }, 500)
    timeEl.textContent = formatStampTime(Date.now())

    function cleanup() {
      done = true
      clearInterval(clock)
      if (stream) stream.getTracks().forEach((t) => t.stop())
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      root.remove()
    }
    function updateShutter() {
      shoot.disabled = !(stream && video.videoWidth)
    }
    function showStage(stage) {
      const isPreview = stage === 'preview'
      video.hidden = isPreview
      preview.hidden = !isPreview
      liveBar.hidden = isPreview
      previewBar.hidden = !isPreview
      infoBox.hidden = isPreview
    }
    video.addEventListener('loadeddata', updateShutter)
    video.addEventListener('playing', updateShutter)

    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
      .then((s) => {
        if (done) { s.getTracks().forEach((t) => t.stop()); return }
        stream = s
        video.srcObject = s
        updateShutter()
      })
      .catch((e) => {
        cleanup()
        reject(new CameraError('camera', e && e.name === 'NotAllowedError'
          ? 'Izin kamera ditolak. Izinkan akses kamera untuk situs ini di pengaturan browser.'
          : 'Kamera tidak bisa dibuka: ' + (e && e.message ? e.message : e)))
      })

    async function takeShot() {
      const maxW = 1280
      const scale = Math.min(1, maxW / video.videoWidth)
      const w = Math.round(video.videoWidth * scale)
      const h = Math.round(video.videoHeight * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, w, h)
      const ts = Date.now()
      const code = await makeVerifyCode([ts, spbu, label, auditor])
      drawStamp(ctx, w, h, [
        formatStampTime(ts),
        [spbu ? `SPBU ${spbu}` : '', label].filter(Boolean).join(' · '),
        [auditor ? `Auditor: ${auditor}` : '', `Kode verifikasi: ${code}`].filter(Boolean).join(' · '),
      ])
      const thumb = canvasThumb(canvas, w, h)
      const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.7))
      if (!blob) throw new CameraError('camera', 'Gagal menyimpan foto.')
      const sha256 = await blobSha256(blob)
      return { blob, thumb, ts, code, sha256, auditor }
    }

    root.addEventListener('click', async (ev) => {
      const act = ev.target.closest('[data-cam]')?.dataset.cam
      if (act === 'cancel') { cleanup(); resolve(null); return }
      if (act === 'shoot' && stream && video.videoWidth && !shoot.disabled) {
        shoot.disabled = true
        try {
          pending = await takeShot()
          if (previewUrl) URL.revokeObjectURL(previewUrl)
          previewUrl = URL.createObjectURL(pending.blob)
          preview.src = previewUrl
          showStage('preview')
        } catch (e) {
          cleanup()
          reject(e)
        }
        return
      }
      if (act === 'retake') {
        pending = null
        showStage('live')
        updateShutter()
        return
      }
      if (act === 'use' && pending) {
        const out = pending
        cleanup()
        resolve(out)
      }
    })
  })
}

/**
 * SEMENTARA: pilih foto dari galeri (tanpa stamp timestamp / kode verifikasi).
 * Harus dipanggil langsung dari handler klik (aturan browser untuk membuka pemilih file).
 * Resolve dengan array `{blob, thumb, ts, sha256, auditor, source: 'gallery', fileDate}`
 * (kosong bila dibatalkan). Foto dikecilkan ke maks 1280 px, JPEG q0.72.
 */
export function pickGalleryPhotos({ auditor = '', multiple = true } = {}) {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = multiple
    input.style.display = 'none'
    document.body.appendChild(input)
    let settled = false
    const finish = (v) => { if (settled) return; settled = true; input.remove(); resolve(v) }
    input.addEventListener('cancel', () => finish([]))
    input.addEventListener('change', async () => {
      const files = [...(input.files || [])].filter((f) => f.type.startsWith('image/'))
      const out = []
      for (const f of files) {
        try { out.push(await processGalleryFile(f, auditor)) } catch (e) { console.warn('Foto galeri gagal diproses', e) }
      }
      finish(out)
    })
    input.click()
  })
}

async function processGalleryFile(file, auditor) {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('Format gambar tidak didukung')); im.src = url })
    const scale = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight))
    const w = Math.round(img.naturalWidth * scale)
    const h = Math.round(img.naturalHeight * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d').drawImage(img, 0, 0, w, h)
    const thumb = canvasThumb(canvas, w, h)
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.72))
    if (!blob) throw new Error('Gagal menyimpan foto')
    return { blob, thumb, ts: Date.now(), fileDate: file.lastModified || null, sha256: await blobSha256(blob), auditor, source: 'gallery' }
  } finally {
    URL.revokeObjectURL(url)
  }
}
