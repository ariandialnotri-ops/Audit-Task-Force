# Audit Pertamina Way

Aplikasi mobile-web untuk audit SPBU Pertamina Way (Pasti Pas Good/Excellent). Auditor mengisi checklist per item, memberi nilai A–F/N/A, memotret bukti langsung dari kamera, dan mendapatkan skor + klasifikasi otomatis serta laporan hasil audit yang bisa diunduh sebagai PDF.

## Status saat ini (v2)

Web app statis berbasis **Vite + vanilla JS** (tanpa framework), siap deploy di **Vercel**. Data audit (termasuk foto) tersimpan otomatis di **IndexedDB** perangkat auditor; data v1 dari `localStorage` dimigrasikan otomatis.

## Menjalankan

```bash
npm install
npm run dev       # server lokal (http://localhost:5173)
npm test          # unit test density ASTM 53, skoring, tera, tenant, pencarian
npm run build     # hasil build di dist/
```

> Kamera & GPS hanya jalan di HTTPS atau `localhost`. Untuk dicoba di HP, pakai URL Vercel.

## Deploy ke Vercel

1. Di vercel.com → **Add New… → Project** → import repo GitHub `Audit-Task-Force`.
2. Framework otomatis terdeteksi **Vite** (`vercel.json` sudah mengatur build `npm run build`, output `dist`). Tidak perlu environment variable.
3. **Deploy.** Setiap push ke branch akan membuat preview deployment; push ke branch produksi memperbarui URL utama.

`vercel.json` juga mengirim header `Permissions-Policy: camera=(self), geolocation=(self)` supaya kamera & GPS diizinkan.

## Sumber data / rumus

- `SIMULASI_AUDIT_TERBARU_INTERTEK.xlsx` (sheet `Checklist`) — 125 item checklist, dikelompokkan dalam 5 elemen (3S, Q&Q, RFS, VFC, EPO), masing-masing punya bobot yang totalnya 30/30/20/10/10 = 100.
- `Item_Pinalti_Pasti_Pas.pdf` — 21 item "pinalti" yang wajib lulus (tidak boleh F) agar SPBU bisa disertifikasi, terlepas dari skor total.
- `Report Good` / `Report Excellent` (sheet Excel) — ambang minimum kelulusan per elemen dan Total Score untuk kelas Good vs Excellent.

Lihat `CLAUDE.md` untuk detail arsitektur, model data, dan rumus skoring lengkap.

## Desain

Gaya visual mengikuti design system **AeroShift SPBU** (lihat `DESIGN.md`) — iOS glassmorphism: kartu translucent berlapis blur, palet biru elektrik `#0050CB`/`#0066FF`, tipografi Plus Jakarta Sans (UI) + JetBrains Mono (angka/skor), dock navigasi bawah mengambang, dan hierarki elevasi lewat blur/shadow bukan garis tegas. Struktur & logika aplikasi tidak berubah dari versi sebelumnya.

## Fitur

**Baru di v2**
- **Density @15°C otomatis** (item 2.2.f–2.2.l) memakai Tabel ASTM 53 dari aplikasi PANTAS (interpolasi bilinear, cadangan rumus ASTM 53B). Sampel pengiriman terakhir vs sampel saat audit dibandingkan otomatis terhadap toleransi ±0,003 → saran nilai A/F, plus peringatan bila sampel diambil < 2 jam setelah bongkar.
- **Submit per item** — setiap item punya tombol Submit (validasi + simpan langsung); semua isian juga tersimpan otomatis. Status: Draft / Tersubmit / Ada perubahan.
- **Dashboard Item Pinalti** — kartu per kategori (3S, Q&Q, RFS, VFC, EPO); diklik menampilkan daftar item pinalti kategori itu yang bisa langsung dinilai. Saat checklist pertama dibuka auditor ditanya mau cek pinalti dahulu atau tidak.
- **Tipe Audit** dikosongkan (isian bebas, default kosong).
- **Data operator & nozzle wajib** sebelum checklist: total operator, operator shift 1/2/3, jumlah nozzle, nomor & produk tiap nozzle. Data nozzle terintegrasi ke item 2.2.m **tera bejana 20 L** (batas −60 ml, cakupan 50% Good / 100% Excellent per produk).
- **Foto GPS + timestamp** — foto hanya dari kamera langsung (tidak bisa dari galeri), wajib izin lokasi; setiap foto dicap tanggal-jam, koordinat, akurasi, nomor SPBU & kode item. Checklist tidak bisa dibuka tanpa GPS aktif.
- **Pencarian checklist** — ketik mis. "APAR" → muncul semua item terkait (APAR, APAB, masa berlaku, pelatihan pemadaman) lengkap dengan kategori/sub-elemen, bisa langsung dinilai atau dibuka di checklist.
- Form: Sales Area, SBM, Verifikator & Auditor dihapus; "Manager SPBU" → **Area Business Head**.
- **Syarat Excellent**: minimal 1 tenant internasional + 1 tenant nasional dengan izin prinsip berlaku.
- Item 5.2.f **daftar tenant**: nama, kategori, no. izin, berlaku s/d, foto tenant & foto izin prinsip.

**Dari v1**

- Checklist 125 item, terstruktur elemen → sub-elemen → (sub-sub-elemen) → item.
- Grading A–F / N/A sesuai skala asli tiap item, dengan badge "PINALTI" untuk 21 item wajib.
- 3 item bertingkat (Fast Track, Ragam Produk JBU, Kelengkapan NFR) punya input jumlah untuk membedakan syarat Good vs Excellent.
- Skor & klasifikasi (Pasti Pas Good / Excellent / Belum Lulus) dihitung otomatis mengikuti rumus asli di Excel.
- Laporan hasil audit otomatis + export PDF (html2canvas + jsPDF).
- Riwayat audit tersimpan lokal per perangkat.

## Roadmap / rekomendasi pengembangan

1. **Sinkronisasi cloud** (belum)  — saat ini data hanya tersimpan lokal per HP. Perlu backend (disarankan Supabase, seperti stack di project `setoran-tepat`) supaya Area Business Head bisa merekap hasil audit dari banyak SPBU/auditor sekaligus.
2. ~~Kalkulator Q&Q detail~~ — selesai di v2 (density @15°C & tera per nozzle).
3. **Export ke Excel** — menghasilkan file dengan format yang sama persis dengan `SIMULASI_AUDIT_TERBARU_INTERTEK.xlsx` untuk arsip internal.
4. **Alur approval berlapis** — Auditor → Verifikator → Koordinator dengan status & tanda tangan digital, sesuai kolom di laporan asli (Auditor 1/2, Verifikator, Koordinator, Acknowledge).
5. Kemungkinan migrasi dari vanilla JS ke React/Vite/Tailwind (pola yang sama dipakai di project Bongkaran BBM) kalau aplikasi ini terus tumbuh dan butuh state management yang lebih rapi.
