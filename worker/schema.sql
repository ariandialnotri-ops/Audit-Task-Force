-- Skema D1 (SQLite) untuk API Audit Pertamina Way.
-- Jalankan sekali: wrangler d1 execute audit-task-force --remote --file=schema.sql
-- (atau tempel di Cloudflare Dashboard → D1 → database → Console).

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  nama TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'auditor')),
  pass_hash TEXT NOT NULL,
  pass_salt TEXT NOT NULL,
  failed INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);

CREATE TABLE IF NOT EXISTS audits (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'selesai')),
  nomor_spbu TEXT,
  kota TEXT,
  tanggal_audit TEXT,
  data TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '{}',
  client_updated_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by TEXT,
  updated_by TEXT
);
CREATE INDEX IF NOT EXISTS audits_updated_idx ON audits (updated_at DESC);
CREATE INDEX IF NOT EXISTS audits_spbu_idx ON audits (nomor_spbu);

-- Foto bukti bila R2 tidak dipakai (tanpa kartu/billing). Bila binding R2 PHOTOS dipasang, tabel ini tidak dipakai.
CREATE TABLE IF NOT EXISTS photos (
  key TEXT PRIMARY KEY,
  audit_id TEXT NOT NULL,
  data BLOB NOT NULL,
  size INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS photos_audit_idx ON photos (audit_id);
