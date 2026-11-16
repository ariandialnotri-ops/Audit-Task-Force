# Monitoring KSO SPBU

Aplikasi web (mobile-first) untuk **monitoring & tindak lanjut kerja sama operasi (KSO) SPBU**, dengan konsep **WhatsApp langsung** dan **pustaka materi**. Bagian dari repo Task Force Audit SPBU, tetapi berdiri sendiri (build & deploy terpisah).

## Fitur
- **SPBU KSO**: nomor, mitra, PIC + no. WA, lokasi, masa kontrak (peringatan ≤ N hari), target volume/bulan. Status kesehatan otomatis (TL terlambat, capaian volume, setoran, kontrak).
- **Monitoring bulanan**: realisasi vs target (KL), capaian %, status setoran/bagi hasil, nilai audit; grafik 12 bulan.
- **Tindak lanjut**: kategori, prioritas, tenggat, status (Belum/Proses/Selesai), PIC, sumber temuan, riwayat catatan & perubahan status. Filter + unduh CSV.
- **WA langsung**: tombol WA di setiap SPBU/temuan membuka composer — pilih template, pesan terisi otomatis (`{pic}`, `{judul}`, `{tenggat}`, `{daftar}`, `{capaian}` …), bisa diedit, lalu dibuka di WhatsApp (`wa.me`). Setiap kiriman tercatat di tab **Komunikasi**. Kirim ke banyak SPBU lewat antrian berurutan (WhatsApp tidak mengizinkan broadcast otomatis).
- **Materi**: unggah file (PDF/gambar/video/dokumen) atau simpan link. Kirim ke SPBU: di HP file dibagikan lewat menu Bagikan (Web Share) bersama pesannya; di desktop file diunduh lalu WhatsApp dibuka.
- **Pengaturan**: identitas pengirim, template WA (bisa diubah/ditambah), cadangan & pemulihan JSON (termasuk file materi), rekap CSV.

Data tersimpan di perangkat (IndexedDB `monitoring-kso`) — belum ada sinkron cloud.

## Menjalankan
```bash
cd kso-app
npm install
npm run dev      # pengembangan
npm test         # uji logika (node:test)
npm run build    # hasil di dist/
```
Deploy: Cloudflare Workers static assets (`npx wrangler deploy`, nama `task-force-kso-app`) atau hosting statis apa pun dari `dist/`.
