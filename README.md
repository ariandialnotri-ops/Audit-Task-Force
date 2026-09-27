# Audit Pertamina Way

Aplikasi mobile-web untuk audit SPBU Pertamina Way (Pasti Pas Good/Excellent). Auditor mengisi checklist per item, memberi nilai A–F/N/A, memotret bukti langsung dari kamera, dan mendapatkan skor + klasifikasi otomatis serta laporan hasil audit yang bisa diunduh sebagai PDF.

## Status saat ini (v2)

Web app statis berbasis **Vite + vanilla JS** (tanpa framework), siap deploy di **Vercel**. Offline-first: data audit tersimpan otomatis di **IndexedDB** perangkat auditor (foto sebagai file terpisah + thumbnail), lalu tersinkron ke **Cloudflare** (Worker + D1 + R2, terpisah dari PANTAS) saat auditor login dan ada sinyal. Data v1 dari `localStorage` dimigrasikan otomatis.

## Login & sinkronisasi cloud (Cloudflare)

- Backend sendiri di akun Cloudflare: **Worker** `worker/` (API + login), **D1** (data audit, akun, dan foto — tanpa kartu), **R2** opsional untuk foto bila ada metode pembayaran. Foto dikecilkan ke ±1024 px sebelum upload. Terpisah total dari Supabase PANTAS.
- **Landing page login**: aplikasi hanya bisa dipakai setelah login (email + password, hash PBKDF2, token sesi 30 hari, kunci 15 menit setelah 5× salah). Setelah login pertama, aplikasi tetap bisa dipakai offline. Saat server masih kosong, landing page menampilkan form **Buat Admin Pertama** (kode `SETUP_TOKEN`).
- Tab **Akun** (menggantikan tab Cloud): profil, status sinkron, **Rekap Audit Semua SPBU**, unduh audit lengkap ke perangkat, ganti password, keluar; admin juga mengelola **Anggota** & melihat kapasitas.
- Alamat API: env build `VITE_AUDIT_API_URL` → isian "Pengaturan server" di landing page → default Worker `audit-task-force`.
- Langkah deploy lengkap: **[DEPLOY-CLOUDFLARE.md](DEPLOY-CLOUDFLARE.md)**.

## Menjalankan

```bash
npm install
npm run dev       # server lokal (http://localhost:5173)
npm test          # unit test density ASTM 53, skoring, tera, tenant, pencarian
npm run build     # hasil build di dist/
```

> Kamera hanya jalan di HTTPS atau `localhost`. Untuk dicoba di HP, pakai URL Cloudflare/Vercel.

## Deploy ke Vercel

1. Di vercel.com → **Add New… → Project** → import repo GitHub `Audit-Task-Force`.
2. Framework otomatis terdeteksi **Vite** (`vercel.json` sudah mengatur build `npm run build`, output `dist`). Tidak perlu environment variable.
3. **Deploy.** Setiap push ke branch akan membuat preview deployment; push ke branch produksi memperbarui URL utama.

`vercel.json` / `public/_headers` mengirim header `Permissions-Policy: camera=(self), geolocation=()` — kamera diizinkan, lokasi tidak dipakai.

## Sumber data / rumus

- `SIMULASI_AUDIT_TERBARU_INTERTEK.xlsx` (sheet `Checklist`) — 125 item checklist, dikelompokkan dalam 5 elemen (3S, Q&Q, RFS, VFC, EPO), masing-masing punya bobot yang totalnya 30/30/20/10/10 = 100.
- `Item_Pinalti_Pasti_Pas.pdf` — 21 item "pinalti" yang wajib lulus (tidak boleh F) agar SPBU bisa disertifikasi, terlepas dari skor total.
- `Report Good` / `Report Excellent` (sheet Excel) — ambang minimum kelulusan per elemen dan Total Score untuk kelas Good vs Excellent.

Lihat `CLAUDE.md` untuk detail arsitektur, model data, dan rumus skoring lengkap.

## Desain

Gaya visual mengikuti design system **AeroShift SPBU** (lihat `DESIGN.md`) — iOS glassmorphism: kartu translucent berlapis blur, palet biru elektrik `#0050CB`/`#0066FF`, tipografi Plus Jakarta Sans (UI) + JetBrains Mono (angka/skor), dock navigasi bawah mengambang, dan hierarki elevasi lewat blur/shadow bukan garis tegas. Struktur & logika aplikasi tidak berubah dari versi sebelumnya.

## Fitur

**Baru di v3**
- **Auditor** (menggantikan Koordinator), boleh lebih dari satu (Auditor 1, 2, …).
- **Data operator per kategori shift**: Shift 1/2/3, **NS** (Normal Shift), **MD** (Middle Shift), **OFF**. Pilih shift yang bertugas saat audit → total sampel item operator (1.1.1.a/b/d, 1.1.2.a, 1.2.a–h) terisi otomatis; auditor cukup mengisi jumlah operator yang sesuai. Bila ada yang tidak sesuai, wajib mengisi **nama operator** tersebut (masuk ke Komentar Auditor).
- **Jumlah nozzle + tombol Submit** → baris nozzle muncul dengan **dropdown nomor nozzle** (duplikat ditandai).
- **UMK tahun lalu dihapus** (hanya UMK tahun ini).
- **Density 2.2.f–2.2.l**: label "Hasil Density", "Hasil density pengiriman terakhir", "Hasil density sampel audit"; isian waktu bongkar dihapus.
- **Tera 2.2.m mode P/M** (Preset/Manual) per nozzle.
- **Submit → Edit**: item yang sudah disubmit terkunci (tombol kuning **Edit** untuk membuka lagi).
- **Submit Laporan**: setelah 125 item tersubmit muncul tombol mengambang dengan animasi proses (cek item → hitung skor → validasi pinalti → simpan cloud) dan nomor laporan `PW/<SPBU>/<kode>`.
- **Foto tanpa GPS**: pratinjau dulu (Ulangi / Gunakan Foto); dicap tanggal-jam, SPBU, item, auditor dan **kode verifikasi**. Sidik SHA-256 disimpan sehingga keaslian foto dapat dicek di penampil foto ("✓ Asli, belum diubah").
- **Laporan PDF A4 vektor** (jsPDF + autotable) persis struktur Excel referensi `Audit_Pertamina_Way_SPBU_*.xlsx`: Ringkasan (Informasi SPBU, Kegiatan Audit, Total Score, Indikator, Rincian Sub-Elemen), Detail Checklist (warna nilai & skor per kelompok), Komentar Auditor (+ UMK/upah/BPJS, NFR, Komentar Manajer SPBU), Pengecekan Q&Q (nozzle, produk, P/M, tera, qty var, density), lampiran foto. Setiap kelompok diukur dulu dan dipindah utuh ke halaman berikutnya bila tidak muat — tidak ada kelompok yang terpisah halaman atau teks terpotong; header kolom diulang, footer berisi No. Report, kode verifikasi laporan & nomor halaman.
- **Ringkasan teks dihapus**; tab Cloud diganti **landing page login** + tab **Akun**.

**v2**
- **Density @15°C otomatis** (item 2.2.f–2.2.l) memakai Tabel ASTM 53 dari aplikasi PANTAS (interpolasi bilinear, cadangan rumus ASTM 53B). Sampel pengiriman terakhir vs sampel saat audit dibandingkan otomatis terhadap toleransi ±0,003 → saran nilai A/F.
- **Submit per item** — setiap item punya tombol Submit (validasi + simpan langsung); semua isian juga tersimpan otomatis. Status: Draft / Tersubmit / Ada perubahan.
- **Dashboard Item Pinalti** — kartu per kategori (3S, Q&Q, RFS, VFC, EPO); diklik menampilkan daftar item pinalti kategori itu yang bisa langsung dinilai. Saat checklist pertama dibuka auditor ditanya mau cek pinalti dahulu atau tidak.
- **Tipe Audit** dikosongkan (isian bebas, default kosong).
- **Data operator & nozzle wajib** sebelum checklist: total operator, operator shift 1/2/3, jumlah nozzle, nomor & produk tiap nozzle. Data nozzle terintegrasi ke item 2.2.m **tera bejana 20 L** (batas −60 ml, cakupan 50% Good / 100% Excellent per produk).
- **Foto kamera langsung** — tidak bisa dari galeri (v3: tanpa GPS, diganti kode verifikasi).
- **Pencarian checklist** — ketik mis. "APAR" → muncul semua item terkait (APAR, APAB, masa berlaku, pelatihan pemadaman) lengkap dengan kategori/sub-elemen, bisa langsung dinilai atau dibuka di checklist.
- Form: Sales Area, SBM, Verifikator & Auditor dihapus; "Manager SPBU" → **Area Business Head**.
- **Syarat Excellent**: minimal 1 tenant internasional + 1 tenant nasional dengan izin prinsip berlaku.
- Item 5.2.f **daftar tenant**: nama, kategori, no. izin, berlaku s/d, foto tenant & foto izin prinsip.

- **Kriteria nilai dari Audit Guideline 2025** di setiap item (buka "Kriteria nilai"), nilai terpilih disorot; skala nilai dicocokkan dengan guideline (koreksi: 3.1.4.r Instalasi listrik menjadi A–F). N/A hanya untuk item berskala "/X".
- **Kalkulator "% sesuai"** untuk item berbasis persentase (mis. 7 dari 10 operator = 70% → C).
- **Tera 2.2.m** dinilai otomatis A/B/C/F memakai tabel ketentuan guideline (jumlah nozzle dicek vs jumlah di bawah −60 ml).

**Dari v1**

- Checklist 125 item, terstruktur elemen → sub-elemen → (sub-sub-elemen) → item.
- Grading A–F / N/A sesuai skala asli tiap item, dengan badge "PINALTI" untuk 21 item wajib.
- 3 item bertingkat (Fast Track, Ragam Produk JBU, Kelengkapan NFR) punya input jumlah untuk membedakan syarat Good vs Excellent.
- Skor & klasifikasi (Pasti Pas Good / Excellent / Belum Lulus) dihitung otomatis mengikuti rumus asli di Excel.
- Laporan hasil audit otomatis + export PDF.
- Riwayat audit tersimpan lokal per perangkat.

## Roadmap / rekomendasi pengembangan

1. ~~Sinkronisasi cloud~~ — selesai di v2 (Cloudflare Worker + D1 + R2, offline-first).
2. ~~Kalkulator Q&Q detail~~ — selesai di v2 (density @15°C & tera per nozzle).
3. **Export ke Excel** (PDF A4 sudah mengikuti format Excel laporan) — menghasilkan file dengan format yang sama persis dengan `SIMULASI_AUDIT_TERBARU_INTERTEK.xlsx` untuk arsip internal.
4. **Alur approval berlapis** — Auditor → Verifikator → Koordinator dengan status & tanda tangan digital, sesuai kolom di laporan asli (Auditor 1/2, Verifikator, Koordinator, Acknowledge).
5. Kemungkinan migrasi dari vanilla JS ke React/Vite/Tailwind (pola yang sama dipakai di project Bongkaran BBM) kalau aplikasi ini terus tumbuh dan butuh state management yang lebih rapi.

## Performa (diukur: Chromium, CPU diperlambat 4×, jaringan Slow 4G)

| Pengukuran | Hasil |
|---|---|
| Unduhan awal (JS + CSS, gzip) | ±68 KB (+ modul cloud 2 KB; modul PDF ±190 KB hanya dimuat saat unduh PDF) |
| Aplikasi siap dipakai | ±0,8 detik |
| Autosave audit berisi 60 foto | 8 ms (sebelumnya 209 ms) |
| Buka elemen checklist (58 item) | ±110 ms (sebelumnya 670 ms) |
| Klik nilai / pencarian | 17 ms / 41 ms |
| Memori JS (audit 60 foto) | 32 MB (sebelumnya 69 MB) |
| Ukuran foto | ±150 KB per foto (1280 px) + thumbnail ±3–6 KB |
