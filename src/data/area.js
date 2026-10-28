/**
 * Pembagian checklist berdasarkan TEMPAT pemeriksaan, agar auditor bisa
 * menyelesaikan satu area dulu:
 * - 'admin'    : Administrasi / Office — dokumen, catatan, sertifikat, data
 *                sistem (P-Insyst, ATG/POS, CCTV), sampel & perlengkapan di kantor.
 * - 'lapangan' : Observasi lapangan — pulau pompa, dispenser, area tangki,
 *                toilet, musala, pelayanan operator, signage, NFR, dsb.
 * Klasifikasi ini hanya untuk tampilan (filter), tidak memengaruhi skoring.
 */
export const ADMIN_ITEMS = new Set([
  '1.1.2.b', // upah sesuai UMK + BPJS (slip/bukti bayar)
  '1.1.2.c', // program Reward
  '2.1.a', // sertifikat & masa tera Metrologi
  '2.1.b', // catatan Totalizer di P-Insyst
  '2.2.b', // sampel 2 pengiriman terakhir
  '2.2.c', // segel & label kaleng sampel
  '2.2.d', // display sampel BBM
  '2.2.n', // catatan stok harian
  '2.2.o', // catatan kualitas & volume harian
  '2.2.p', // surat pengantar pengiriman & penebusan
  '3.1.4.o', // daftar nomor telepon penting
  '3.1.4.p', // Surat Ijin Kerja Aman (SIKA)
  '3.1.4.q', // dokumen UKL/UPL
  '3.1.4.s', // kotak P3K di kantor
  '3.1.4.t', // pelatihan pemadaman kebakaran
  '3.1.4.u', // surat keterangan Safetyman
  '3.2.a', // catatan pemeliharaan fasilitas
  '3.2.b', // catatan pemeliharaan DU & ST
  '3.3.a', // catatan pemeliharaan kerusakan
  '3.3.b', // tanggal keluhan & tanggapan
  '3.3.c', // tindak lanjut keluhan ≤ 3 bulan
  '4.3.d', // ATG & POS
  '4.3.e', // rekaman CCTV ≥ 1 bulan
  '5.1.g', // realisasi penebusan JBU
  '5.2.f', // izin prinsip NFR
])

/**
 * Item CCU (Cross Check Up SPBU COCO) yang diperiksa di kantor: dokumen,
 * catatan, dashboard/sistem, keuangan, legal, aset & sosmed. Sisanya Lapangan.
 */
export const CCU_ADMIN_ITEMS = new Set([
  'I.8', 'I.9', 'I.11', 'I.13', 'I.14', 'I.15', // ruang kantor, sistem, checklist & prosedur 5R, score
  'II.3', 'II.4', 'II.13', 'II.14', // Hazard Identification, Action Tracking, OKD, simulasi darurat
  'III.1', 'III.2', 'III.3', // internet, dashboard, POS/BOS
  'V.1', 'V.2', 'V.3', 'V.4', 'V.5', 'V.6', 'V.7', // keuangan
  'VII.2', 'VII.3', 'VII.5', // training, sosialisasi AKHLAK, komposisi pekerja
  'VIII.6', 'VIII.7', 'VIII.9', // dashboard performance, koordinasi SBM/RSH
  'IX.1', 'IX.2', 'IX.3', 'IX.4', 'IX.5', 'IX.6', 'IX.7', 'IX.8', 'IX.9', 'IX.10', 'IX.11', 'IX.12', // legal
  'X.1', 'X.2', // AMS & FUPP
  'XI.4', 'XI.9', 'XI.10', 'XI.11', // handling complain, 135, Google Maps & telepon
  'XII.1', 'XII.2', 'XII.4', 'XII.5', // register & laporan risiko
  'XIII.1', 'XIII.2', 'XIII.3', 'XIII.4', 'XIII.5', 'XIII.6', 'XIII.7', 'XIII.8', 'XIII.9', // digital campaign
  'XIV.1.1.1', 'XIV.1.1.2', 'XIV.1.1.3', 'XIV.1.2.2', 'XIV.1.2.3', // administrasi Bright Store
  'XIV.1.3.1', 'XIV.1.3.2', 'XIV.1.3.3', 'XIV.1.3.4', 'XIV.1.3.5',
  'XIV.3.2.1', 'XIV.3.2.2', 'XIV.3.2.3', // monitoring, cash handling, dokumentasi penerimaan
  'XV.4', 'XV.6', // laporan JBT & tindak lanjut
])

export const AREAS = [
  { id: 'all', label: 'Semua' },
  { id: 'lapangan', label: 'Lapangan', long: 'Observasi Lapangan' },
  { id: 'admin', label: 'Administrasi', long: 'Administrasi / Office' },
]

export function itemArea(code) {
  return ADMIN_ITEMS.has(code) || CCU_ADMIN_ITEMS.has(code) ? 'admin' : 'lapangan'
}

export function inArea(code, area) {
  return !area || area === 'all' || itemArea(code) === area
}
