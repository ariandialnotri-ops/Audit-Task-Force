# Deploy Cloud Audit ke Cloudflare

Cloud aplikasi Audit Pertamina Way berjalan di akun Cloudflare Anda sendiri, terpisah dari aplikasi PANTAS:

| Komponen | Layanan Cloudflare | Nama |
|---|---|---|
| API (login, data audit, anggota) | Worker | `audit-task-force` |
| Database audit & akun | D1 | `audit-task-force` |
| Foto bukti | **D1** (default, tanpa kartu) atau R2 (opsional) | tabel `photos` / bucket `audit-foto` |

Nama Worker, database, dan bucket boleh diganti (mis. Worker bernama `audit-task-force`); yang **wajib persis** hanya nama variabel binding: `DB`, secret `SETUP_TOKEN`, dan (bila memakai R2) `PHOTOS`.

**Tanpa kartu kredit/debit:** R2 tidak wajib. Tanpa binding `PHOTOS`, foto otomatis disimpan di tabel `photos` D1 (gratis ±500 MB per database). Aplikasi mengecilkan foto ke ±1024 px (±80–100 KB) sebelum upload → muat ±5.000 foto. Admin bisa memantau pemakaian di tab **Cloud → Kapasitas Cloud**. Bila nanti punya kartu/PayPal, cukup buat bucket R2 dan tambahkan binding `PHOTOS` — tanpa mengubah aplikasi.

Aplikasi web (Vercel) cukup diberi alamat API Worker. Semua langkah bisa lewat **Dashboard** (tanpa install apa pun) atau lewat **CLI**.

---

## Cara A — lewat Cloudflare Dashboard

1. **Buat database D1**
   Dashboard → *Storage & Databases* → *D1 SQL Database* → **Create** → nama `audit-task-force`.
   Buka database → tab **Console/Studio** → tempel seluruh isi [`worker/schema.sql`](worker/schema.sql) → **Ctrl+A** → panah ▾ di tombol Run → **Run all** (tombol Run biasa hanya menjalankan satu perintah di posisi kursor). Hasil: *Executed 9/9* dan tabel `users`, `sessions`, `audits`, `photos` muncul.

   > Sudah menjalankan skema versi lama (tanpa tabel `photos`)? Jalankan juga ini di Console:
   > ```sql
   > CREATE TABLE IF NOT EXISTS photos (key TEXT PRIMARY KEY, audit_id TEXT NOT NULL, data BLOB NOT NULL, size INTEGER NOT NULL, created_at INTEGER NOT NULL);
   > CREATE INDEX IF NOT EXISTS photos_audit_idx ON photos (audit_id);
   > ```

2. **(Opsional) Bucket R2** — lewati bila tidak punya kartu/PayPal.
   Dashboard → *R2 Object Storage* → **Create bucket** → nama `audit-foto`. Aktivasi R2 meminta metode pembayaran walaupun $0/bulan.

3. **Buat Worker**
   Dashboard → *Workers & Pages* → **Create** → *Create Worker* → nama `audit-task-force` → **Deploy** → **Edit code**.
   Hapus kode contoh, tempel seluruh isi [`worker/src/index.js`](worker/src/index.js) → **Deploy**.

4. **Hubungkan database, bucket & secret**
   Worker → *Settings* → *Bindings* → **Add**:
   - *D1 database* → Variable name `DB` → pilih `audit-task-force`
   - (Hanya bila memakai R2) *R2 bucket* → Variable name `PHOTOS` → pilih `audit-foto`

   Worker → *Settings* → *Variables and Secrets* → **Add**:
   - Type **Secret**, name `SETUP_TOKEN`, value: kode rahasia buatan Anda (mis. 20 karakter acak). Dipakai sekali untuk membuat admin pertama.
   - (Disarankan) Type **Text**, name `ALLOWED_ORIGIN`, value: URL aplikasi, mis. `https://audit-task-force.vercel.app`.

5. **Catat alamat Worker**, mis. `https://audit-task-force.<akun-anda>.workers.dev`.
   Cek: buka `<alamat>/api/health` → harus tampil `{"ok":true,"needsSetup":true}`.

## Cara B — lewat CLI (wrangler)

```bash
cd worker
npm install
npx wrangler login
npx wrangler d1 create audit-task-force        # salin database_id ke wrangler.toml
# (opsional R2) npx wrangler r2 bucket create audit-foto  lalu aktifkan blok r2_buckets di wrangler.toml
npm run db:init                                   # jalankan schema.sql ke D1 (remote)
npx wrangler secret put SETUP_TOKEN               # ketik kode rahasia
# (opsional) ubah ALLOWED_ORIGIN di wrangler.toml ke URL aplikasi
npm run deploy
```

---

## Sambungkan aplikasi

- **Vercel (disarankan):** Project → *Settings* → *Environment Variables* → `VITE_AUDIT_API_URL` = alamat Worker → **Redeploy**. Semua HP langsung terhubung.
- **Tanpa env:** di aplikasi buka tab **Cloud** → isi *Alamat API* sekali per HP.

## Admin pertama & anggota

1. Buka tab **Cloud** → muncul form **Buat Admin Pertama** → isi *kode setup* (`SETUP_TOKEN`), nama, email, password.
2. Admin menambah auditor di tab **Cloud → Anggota** (email, nama, peran, password awal) lalu memberikan password awal ke auditor. Auditor bisa mengganti password sendiri di tab Cloud.
3. Lupa password / akun terkunci (5× salah → 15 menit): admin isi ulang email + password baru di form anggota.

## Kuota gratis Cloudflare (perkiraan, cek halaman harga Cloudflare)

- Workers: ±100.000 request/hari
- D1: ±5 GB penyimpanan
- D1: ±500 MB per database (foto cloud ±80–100 KB → ±5.000 foto)
- R2 (opsional): ±10 GB penyimpanan, tanpa biaya unduh (egress).

## Uji lokal

```bash
cd worker
cp .dev.vars.example .dev.vars
npm run db:init:local
npm run dev            # http://localhost:8787
npm test               # 36 uji API (butuh database lokal kosong)
```
