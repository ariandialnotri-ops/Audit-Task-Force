# Target KSO TAC — SPBU DODO

Aplikasi web (mobile-first) untuk memantau **target kerja sama SPBU DODO dengan skema KSO TAC**: dari plan sosialisasi sampai Go Live, dengan **WhatsApp langsung** ke PIC SPBU / SBM dan **pustaka materi**. Berdiri sendiri di repo Task Force Audit SPBU (build & deploy terpisah).

## Struktur data = Excel "Target KSO"
Kolom: No, Region, Sales Area, No. SPBU, Kota/Kab., Provinsi, Rata-rata Omzet (KL/hari), Grading Pertamina Way, SBM, Kontak SBM, Nama/Nomor PIC SPBU, Prioritas, PIC Pertare, **Tanggal Pelaksanaan** (Plan Sosialisasi & Survey → Sosialisasi & Survey → Penawaran Sharing → Negosiasi → BAK & PKS → Go Live), Keterangan.
Nilai tahapan boleh tanggal, `done`, atau teks (mis. `28% PTPR`).

## Fitur
- **Impor Excel** (.xlsx, tanpa library — `src/lib/xlsx.js`); impor ulang menggabungkan berdasarkan No. SPBU, riwayat & jadwal tetap.
- **Ekspor Excel** dengan tata letak yang sama + kolom Status & Tindak lanjut + baris total.
- **Beranda**: jumlah per tahapan (sama dengan baris total Excel), status owner (Proses / Mempertimbangkan / Menunggu tanggapan / Belum berminat / Tidak dilanjutkan / Go Live), tindak lanjut terlambat, plan sosialisasi yang lewat, target belum dijadwalkan, rekap per kota.
- **Target**: filter status/tahapan/prioritas/kota/grading, urut prioritas/omzet/jadwal; detail dengan stepper tahapan (ketuk untuk isi), status & keterangan, jadwal tindak lanjut, riwayat aktivitas.
- **WA langsung** ke PIC SPBU atau SBM dengan template (perkenalan, jadwal sosialisasi, kirim materi, follow-up penawaran, minta bantuan SBM, update ke SBM). Setiap kiriman tercatat. WA berurutan untuk banyak SPBU.
- **Materi**: file (dibagikan via menu Bagikan di HP) atau link; kirim ke satu/banyak SPBU.
- Status owner diisi otomatis dari Keterangan saat impor (mis. "belum berminat" → Belum berminat).

Data tersimpan di perangkat (IndexedDB `kso-tac-target`); file Excel sumber **tidak** disimpan di repo (berisi nomor HP).

## Menjalankan
```bash
cd kso-app
npm install
npm run dev
npm test
npm run build
```
Deploy: Vercel proyek `monitoring-kso-spbu` (root `kso-app`) atau `npx wrangler deploy`.
