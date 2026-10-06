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

export const AREAS = [
  { id: 'all', label: 'Semua' },
  { id: 'lapangan', label: 'Lapangan', long: 'Observasi Lapangan' },
  { id: 'admin', label: 'Administrasi', long: 'Administrasi / Office' },
]

export function itemArea(code) {
  return ADMIN_ITEMS.has(code) ? 'admin' : 'lapangan'
}

export function inArea(code, area) {
  return !area || area === 'all' || itemArea(code) === area
}
