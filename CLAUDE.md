# CLAUDE.md — Audit Pertamina Way

Konteks proyek ini untuk Claude Code. Baca file ini sebelum mengerjakan perubahan.

## Ringkasan

Aplikasi audit SPBU Pertamina Way (standar "Pasti Pas"). Auditor mengisi checklist 125 item, memberi nilai, memotret bukti, dan sistem menghitung skor + klasifikasi Good/Excellent/Gagal secara otomatis. Dipakai oleh Area Business Head Pertamina Retail dan tim auditnya untuk audit rutin SPBU di wilayah Jawa Timur (Kediri, Nganjuk, dll).

## Arsitektur saat ini (v2)

- Vite + vanilla JS (ES modules), tanpa framework. `npm run dev` / `npm run build` / `npm test` (node:test).
- `index.html` — shell. `src/main.js` — view, router & event delegation (satu listener click/input/change di `#app`).
- `src/data/checklist.js` — `CHECKLIST_TREE` + `PINALTI_META` (sumber: Excel Intertek, jangan diubah tanpa file sumber).
- `src/data/table53.js` — Tabel ASTM-IP 53, disalin dari aplikasi PANTAS (`ariandialnotri-ops/Laporan-Pembongkaran-BBM`, `bongkaran-app/src/data/table53.json`).
- `src/lib/density.js` — port `density.ts` PANTAS (bilinear tabel 53, cadangan rumus 53B).
- `src/lib/scoring.js` — skoring murni + aturan otomatis (density, tera, tenant, pencarian). Diuji di `tests/`.
- `src/lib/storage.js` — IndexedDB `audit-pertamina-way` v2: store `audits` (JSON ringan) + store `photos` (Blob foto penuh, key = id foto). Autosave debounce + flush saat Submit; migrasi otomatis dari `localStorage` `pw_audits_v1`.
- `src/lib/photos.js` — metadata foto `{id, thumb, ts, lat, lng, acc, path?}`; foto penuh hanya dimuat untuk laporan/PDF/upload. Foto lama (dataURL di audit) dimigrasi otomatis.
- `src/lib/cloud.js` — klien API cloud (dimuat dinamis): token Bearer di localStorage, push audit + upload foto, rekap, pull, anggota. Alamat API: `VITE_AUDIT_API_URL` → isian tab Cloud → default `https://audit-task-force.ariandialnotri.workers.dev`.
- `worker/` — backend Cloudflare Worker (`src/index.js`), skema D1 (`schema.sql`), `wrangler.toml`, uji API (`npm test` terhadap `wrangler dev` lokal). Binding: `DB` (D1), `PHOTOS` (R2 **opsional**, key `<auditId>/<photoId>.jpg`; tanpa binding ini foto disimpan di tabel D1 `photos` — Rian tidak punya kartu untuk aktivasi R2), secret `SETUP_TOKEN`, var `ALLOWED_ORIGIN`. Klien mengecilkan foto ke 1024 px/q0.62 sebelum upload; admin melihat pemakaian via `GET /api/usage`. Deploy: `DEPLOY-CLOUDFLARE.md`. Sengaja terpisah dari Supabase PANTAS (permintaan Rian).
- `src/lib/camera.js` — kamera getUserMedia layar penuh + watchPosition GPS + stamp teks di foto. Tidak ada input file/galeri.
- Deploy aplikasi web: Cloudflare Workers static assets (`wrangler.jsonc` di root, nama `audit-task-force-app`, header di `public/_headers`) atau Vercel (`vercel.json`). Jangan beri nama `audit-task-force` — itu Worker API.

## Model data

```js
audit = {
  id, version: 2, createdAt, updatedAt, status: 'draft' | 'selesai',
  lokasiAudit, lokasiTerakhir,          // {lat,lng,acc,ts} dari GPS
  pinaltiPromptShown: bool,
  info: { nomorSpbu, region, kota, alamat, namaPemilik, areaBusinessHead, tipeKepemilikan, tahun, telepon,
          tanggalAudit, tipeAudit /* kosong default */, koordinator, kelasTarget: 'good'|'excellent',
          operatorTotal, operatorShift1, operatorShift2, operatorShift3,
          nozzles: [{ id, nomor, produk }],
          umkTahunIni, umkTahunLalu, upahOperator, hariKerja, bpjs },
  results: {
    [itemCode]: { grade, note, photos: [{id, thumb, ts, lat, lng, acc, path?}], jumlah, submittedAt, changedAfterSubmit,
                  density?: { refObs, refSuhu, refD15Manual, waktuBongkar, obs, suhu },   // 2.2.f–2.2.l
                  tera?: { [nozzleId]: 'selisih ml' },                                 // 2.2.m
                  tenants?: [{ id, nama, kategori, nomorIzin, berlakuSampai, fotoTenant: [], fotoIzin: [] }] } // 5.2.f
  }
}
```

Audit juga punya `syncedAt` (versi `updatedAt` terakhir yang sudah terkirim ke cloud). Foto v1 (string dataURL) dimigrasi ke store `photos` saat aplikasi dibuka.

## Aturan otomatis v2

- Density: D15 = tabel ASTM 53 (obs, suhu). |D15 audit − D15 pengiriman terakhir| ≤ 0,003 → saran A, selain itu F.
- Tera 2.2.m: batas **−60 ml/20 L** (ketentuan Pasti Pas, dikonfirmasi Rian; teks judul guideline yang menyebut −100 ml diabaikan). Nilai A/B/C/F dari tabel "Ketentuan nilai" guideline (`teraGradeByTable`: jumlah nozzle dicek vs jumlah di bawah toleransi). Diterapkan bila cakupan per produk terpenuhi (Good ≥ 50%, Excellent 100%), atau langsung F bila sudah pasti F walau semua nozzle dicek.
- Kalkulator "% sesuai" (`gradeFromPct`) untuk item yang kriteria guideline-nya persentase (A–F: 100/80/60/40/20, A/C/F: 100/60, A/F: 100, A/B/C/F: 100/80/60).
- Tenant 5.2.f: izin berlaku = `berlakuSampai ≥ tanggalAudit` dan ada foto izin. Semua tenant berlaku → A, ada yang tidak → F.
- Excellent tambahan wajib ≥1 tenant `internasional` + ≥1 tenant `nasional` berizin berlaku (di `computeAudit`).
- Nilai otomatis diterapkan saat angka berubah; auditor tetap bisa mengganti nilai (muncul peringatan bila berbeda).

## Rumus skoring (jangan diubah tanpa verifikasi ulang ke sumber Excel)

- Nilai per grade: `A=1, B=0.8, C=0.6, D=0.4, E=0.2, F=0`. `X` = N/A, dikeluarkan dari pembilang & penyebut.
- Skala per item mengikuti kolom `scale` Excel (mis. `A/F`, `A-F`, `A/C/F/X`): tombol nilai = `allowed`, dan **N/A hanya untuk item yang skalanya memuat `X`** (20 item, `allowNA`). Submit menolak nilai di luar skala.
- Compliance suatu grup (sub-sub-elemen / sub-elemen / elemen) = `Σ(bobot × nilai)` item yang sudah dinilai (bukan X) ÷ `Σ(bobot)` item yang sudah dinilai (bukan X).
- Total Score (TS) = `Σ (compliance elemen × bobot elemen)`, bobot elemen: 3S=30, Q&Q=30, RFS=20, VFC=10, EPO=10 (total 100).
- Ambang minimum kelulusan (persis dari sheet `Report Good` / `Report Excellent` di file Excel sumber):

  | Elemen | Good | Excellent |
  |---|---|---|
  | TS keseluruhan | 75% | 80% |
  | 3S | 80% | 85% |
  | Q&Q | 85% | 85% |
  | RFS | 85% | 85% |
  | VFC | 15% | 20% |
  | EPO | 25% | 50% |

- **Item Pinalti** (21 item, lihat `PINALTI_META`): jika salah satu bernilai `F`, SPBU otomatis gagal sertifikasi berapa pun TS-nya.
- **Item bertingkat** (`4.3.f` Fast Track, `5.1.f` Ragam Produk JBU, `5.2.g` Kelengkapan NFR): field `jumlah` — minimal 1 untuk syarat Good, minimal 2 untuk syarat Excellent.
- Logika lengkap ada di `computeAudit()` dan `computeGroupScore()` di `src/lib/scoring.js`.

## Audit Guideline (kriteria nilai)

`src/data/guideline.js` berisi kriteria tiap nilai dari *Audit Guideline New Pertamina Way 2.0 – 2025 (Basic Operational)* (PDF 85 hal., tidak disimpan di repo), dipetakan ke kode checklist Intertek (penomoran guideline berbeda, mis. APAR = guideline 3.2.a = checklist 3.1.4.a). 83 item checklist terpetakan; 42 item tidak ada di guideline Basic Operational dan tetap memakai skala Excel. Skala semua item terpetakan sudah dicocokkan (test `skala setiap item sesuai Audit Guideline`); satu-satunya koreksi: 3.1.4.r Instalasi listrik A/F → **A–F**. Bobot item tidak berubah (guideline tidak memuat bobot per item).

## Sumber kebenaran data checklist

Data 125 item, bobot, dan skala grade diekstrak dari:
- `SIMULASI_AUDIT_TERBARU_INTERTEK.xlsx`, sheet `Checklist` (bobot per item), sheet `Report Good`/`Report Excellent` (ambang minimum).
- `Item_Pinalti_Pasti_Pas.pdf` (daftar 21 item pinalti + keterangan gagal).

Kedua file ini **tidak disertakan di repo ini** (dokumen internal Pertamina) — jika perlu menambah/mengubah item checklist, minta Rian mengirim ulang file sumbernya, jangan menebak-nebak bobot atau ambang minimum.

## Yang belum dikerjakan / rencana lanjutan

Lihat bagian "Roadmap" di `README.md`. Sinkronisasi cloud & kalkulator Q&Q sudah selesai (v2). Tersisa: export ke format Excel asli, alur approval berlapis, aturan nilai B/C tera 2.2.m (menunggu ketentuan dari sumber).

## Gaya UI

Sejak commit kedua, desain mengikuti design system **AeroShift SPBU** (spesifikasi lengkap ada di `DESIGN.md`, jangan dihapus/diringkas — itu sumber kebenaran token desain):
- iOS glassmorphism: `backdrop-filter: blur()` berlapis, border translucent putih, inner rim highlight, shadow difus per level elevasi.
- Palet: primary `#0050CB`/`#0066FF` (electric blue), status compliance dipetakan ke Settlement Green `#10B981` (Good), Fuel Cyan `#00C2B8` (Average), Variance Amber `#F59E0B` (Poor), Alert Red `#EF4444` (Warning); tingkat Excellent memakai gradasi primary blue.
- Tipografi: Plus Jakarta Sans untuk UI, JetBrains Mono untuk semua angka/skor/kode item/tabel (alignment tabular).
- Radius: 16px kartu standar, 24px hero/modal, pill (9999px) untuk tombol & dock navigasi bawah yang kini mengambang (floating dock), bukan menempel penuh di tepi layar.
- Semua perubahan ini murni di lapisan CSS + dua fungsi pemetaan warna (`complianceBand()`, `classificationBadge()`) di `index.html`. Struktur HTML, data model, dan seluruh logika skoring/klasifikasi tidak diubah.
