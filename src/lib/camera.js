/**
 * Kamera + GPS + timestamp.
 *
 * - Foto hanya bisa diambil langsung dari kamera (getUserMedia), tidak ada
 *   pilihan galeri sama sekali.
 * - Foto wajib punya titik GPS: tombol jepret baru aktif setelah lokasi
 *   didapat, dan izin lokasi harus diizinkan di HP.
 * - Setiap foto dicap (stamp) tanggal, jam, koordinat, akurasi, nomor SPBU
 *   dan kode item langsung di gambar.
 */
import { canvasThumb } from './photos.js'

export class GpsError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

export function gpsSupported() {
  return typeof navigator !== 'undefined' && 'geolocation' in navigator
}

export function cameraSupported() {
  return typeof navigator !== 'undefined' && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
}

export async function gpsPermissionState() {
  try {
    if (!navigator.permissions) return 'unknown'
    const st = await navigator.permissions.query({ name: 'geolocation' })
    return st.state
  } catch {
    return 'unknown'
  }
}

function toPos(p) {
  return { lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy), ts: p.timestamp || Date.now() }
}

function gpsErrorFrom(err) {
  if (!window.isSecureContext) return new GpsError('insecure', 'Lokasi hanya tersedia lewat HTTPS.')
  if (err && err.code === 1) return new GpsError('denied', 'Izin lokasi (GPS) ditolak.')
  if (err && err.code === 3) return new GpsError('timeout', 'Lokasi GPS belum didapat (timeout). Pastikan GPS aktif lalu coba lagi.')
  return new GpsError('unavailable', 'Lokasi GPS tidak tersedia. Aktifkan GPS/Location di HP.')
}

/** Minta lokasi sekali. Memunculkan dialog izin browser bila belum pernah diizinkan. */
export function requireGps(timeout = 20000) {
  return new Promise((resolve, reject) => {
    if (!gpsSupported()) return reject(new GpsError('unsupported', 'Perangkat/browser tidak mendukung GPS.'))
    if (!window.isSecureContext) return reject(new GpsError('insecure', 'Lokasi hanya tersedia lewat HTTPS.'))
    navigator.geolocation.getCurrentPosition(
      (p) => resolve(toPos(p)),
      (e) => reject(gpsErrorFrom(e)),
      { enableHighAccuracy: true, timeout, maximumAge: 30000 },
    )
  })
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

export function formatCoord(pos) {
  if (!pos) return '—'
  return `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)} (±${pos.acc} m)`
}

function drawStamp(ctx, w, h, lines) {
  const fs = Math.max(14, Math.round(w / 42))
  const pad = Math.round(fs * 0.6)
  const lh = Math.round(fs * 1.35)
  const boxH = pad * 2 + lh * lines.length
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  ctx.fillRect(0, h - boxH, w, boxH)
  ctx.fillStyle = '#FFD200'
  ctx.fillRect(0, h - boxH, Math.max(4, Math.round(fs / 4)), boxH)
  ctx.textBaseline = 'top'
  lines.forEach((line, i) => {
    ctx.font = `${i === 0 ? '700' : '500'} ${fs}px "JetBrains Mono", ui-monospace, monospace`
    ctx.fillStyle = '#fff'
    ctx.fillText(line, pad + 6, h - boxH + pad + i * lh, w - pad * 2)
  })
}

/**
 * Buka kamera layar penuh. Resolve dengan foto `{blob, thumb, ts, lat, lng, acc}`
 * atau null bila dibatalkan. Reject bila kamera/GPS tidak bisa dipakai.
 */
export function captureStampedPhoto({ label = '', spbu = '' } = {}) {
  return new Promise((resolve, reject) => {
    if (!cameraSupported()) {
      reject(new GpsError('nocamera', window.isSecureContext
        ? 'Kamera tidak tersedia di browser ini.'
        : 'Kamera hanya bisa dipakai lewat HTTPS (buka aplikasi dari link Vercel).'))
      return
    }
    if (!gpsSupported()) {
      reject(new GpsError('unsupported', 'Perangkat/browser tidak mendukung GPS.'))
      return
    }

    const root = document.createElement('div')
    root.className = 'cam-overlay'
    root.innerHTML = `
      <div class="cam-top">
        <button class="cam-x" data-cam="cancel" aria-label="Tutup">&times;</button>
        <div class="cam-title">${label.replace(/[<>&"]/g, '')}</div>
      </div>
      <video class="cam-video" autoplay playsinline muted></video>
      <div class="cam-info">
        <div class="cam-gps" data-cam="gps">Mencari lokasi GPS…</div>
        <div class="cam-time" data-cam="time"></div>
      </div>
      <div class="cam-bottom">
        <button class="cam-shutter" data-cam="shoot" disabled aria-label="Ambil foto"></button>
      </div>`
    document.body.appendChild(root)

    const video = root.querySelector('video')
    const gpsEl = root.querySelector('[data-cam="gps"]')
    const timeEl = root.querySelector('[data-cam="time"]')
    const shoot = root.querySelector('[data-cam="shoot"]')
    let stream = null
    let watchId = null
    let pos = null
    let done = false

    const clock = setInterval(() => { timeEl.textContent = formatStampTime(Date.now()) }, 500)
    timeEl.textContent = formatStampTime(Date.now())

    function cleanup() {
      done = true
      clearInterval(clock)
      if (watchId !== null) navigator.geolocation.clearWatch(watchId)
      if (stream) stream.getTracks().forEach((t) => t.stop())
      root.remove()
    }
    function updateShutter() {
      shoot.disabled = !(pos && stream && video.videoWidth)
    }
    video.addEventListener('loadeddata', updateShutter)
    video.addEventListener('playing', updateShutter)

    watchId = navigator.geolocation.watchPosition(
      (p) => {
        pos = toPos(p)
        gpsEl.textContent = `GPS ${formatCoord(pos)}`
        gpsEl.classList.add('ok')
        updateShutter()
      },
      (e) => {
        const err = gpsErrorFrom(e)
        if (err.code === 'denied' || err.code === 'insecure') {
          cleanup()
          reject(err)
          return
        }
        gpsEl.textContent = err.message
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 10000 },
    )

    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
      .then((s) => {
        if (done) { s.getTracks().forEach((t) => t.stop()); return }
        stream = s
        video.srcObject = s
        updateShutter()
      })
      .catch((e) => {
        cleanup()
        reject(new GpsError('camera', e && e.name === 'NotAllowedError'
          ? 'Izin kamera ditolak. Izinkan akses kamera untuk situs ini di pengaturan browser.'
          : 'Kamera tidak bisa dibuka: ' + (e && e.message ? e.message : e)))
      })

    root.addEventListener('click', (ev) => {
      const act = ev.target.closest('[data-cam]')?.dataset.cam
      if (act === 'cancel') { cleanup(); resolve(null) }
      if (act === 'shoot' && pos && stream && video.videoWidth) {
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
        drawStamp(ctx, w, h, [
          formatStampTime(ts),
          `Lat/Long ${formatCoord(pos)}`,
          [spbu ? `SPBU ${spbu}` : '', label].filter(Boolean).join(' · '),
        ])
        const thumb = canvasThumb(canvas, w, h)
        const coords = { lat: pos.lat, lng: pos.lng, acc: pos.acc }
        canvas.toBlob((blob) => {
          cleanup()
          if (!blob) { reject(new GpsError('camera', 'Gagal menyimpan foto.')); return }
          resolve({ blob, thumb, ts, ...coords })
        }, 'image/jpeg', 0.7)
      }
    })
  })
}

