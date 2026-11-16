// Utilitas WhatsApp "klik-untuk-chat": normalisasi nomor, isi template, link wa.me.

/** Normalisasi nomor HP Indonesia ke format internasional tanpa '+', mis. 0812-3456 → 628123456. */
export function normalizePhone(raw) {
  let d = String(raw ?? '').replace(/[^\d+]/g, '');
  if (d.startsWith('+')) d = d.slice(1);
  d = d.replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('0')) d = '62' + d.slice(1);
  else if (d.startsWith('8')) d = '62' + d;
  return d.length >= 9 && d.length <= 15 ? d : '';
}

/** Ganti {placeholder} dengan nilai dari vars. Placeholder tanpa nilai dikosongkan, baris kosong ganda dirapikan. */
export function fillTemplate(text, vars = {}) {
  const out = String(text ?? '').replace(/\{(\w+)\}/g, (_, k) => {
    const v = vars[k];
    return v === undefined || v === null ? '' : String(v);
  });
  return out.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** Link wa.me. Tanpa nomor → WhatsApp membuka pemilih kontak (berguna untuk grup). */
export function waLink(phone, text = '') {
  const p = normalizePhone(phone);
  const q = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${p}${q}`;
}

export function displayPhone(raw) {
  const p = normalizePhone(raw);
  if (!p) return raw || '';
  const local = p.startsWith('62') ? '0' + p.slice(2) : '+' + p;
  return local.replace(/(\d{4})(\d{4})(\d+)/, '$1-$2-$3');
}

export const PLACEHOLDERS = [
  ['salam', 'Salam pembuka sesuai jam (Pagi/Siang/Sore/Malam)'],
  ['pic', 'Nama PIC mitra'],
  ['spbu', 'Nama SPBU'],
  ['nomor', 'Nomor SPBU'],
  ['mitra', 'Nama mitra KSO'],
  ['judul', 'Judul tindak lanjut'],
  ['detail', 'Deskripsi tindak lanjut'],
  ['tenggat', 'Tenggat tindak lanjut'],
  ['status', 'Status tindak lanjut'],
  ['daftar', 'Daftar tindak lanjut terbuka SPBU'],
  ['periode', 'Periode monitoring terakhir'],
  ['volume', 'Volume realisasi periode terakhir'],
  ['target', 'Target volume'],
  ['capaian', 'Capaian % periode terakhir'],
  ['akhirKontrak', 'Tanggal berakhir kontrak'],
  ['materi', 'Judul materi'],
  ['link', 'Link materi'],
  ['pengirim', 'Nama pengirim (Pengaturan)'],
  ['jabatan', 'Jabatan pengirim (Pengaturan)'],
];

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 18) return 'Selamat sore';
  return 'Selamat malam';
}

export const DEFAULT_TEMPLATES = [
  {
    id: 'tpl-reminder', nama: 'Pengingat tindak lanjut', untuk: 'tindak',
    isi: '{salam} Bapak/Ibu {pic},\n\nMenindaklanjuti hasil monitoring SPBU {nomor} {spbu}, mohon tindak lanjut atas:\n*{judul}*\n{detail}\n\nTenggat: *{tenggat}*\nStatus saat ini: {status}\n\nMohon kirimkan bukti perbaikan (foto/dokumen) melalui chat ini. Terima kasih.\n\n{pengirim}\n{jabatan}',
  },
  {
    id: 'tpl-rekap', nama: 'Rekap tindak lanjut terbuka', untuk: 'spbu',
    isi: '{salam} Bapak/Ibu {pic},\n\nBerikut rekap tindak lanjut SPBU {nomor} {spbu} yang masih terbuka:\n{daftar}\n\nMohon update progresnya. Terima kasih.\n\n{pengirim}\n{jabatan}',
  },
  {
    id: 'tpl-kinerja', nama: 'Info kinerja volume', untuk: 'spbu',
    isi: '{salam} Bapak/Ibu {pic},\n\nInformasi kinerja SPBU {nomor} {spbu} periode {periode}:\nRealisasi: {volume} KL\nTarget: {target} KL\nCapaian: *{capaian}*\n\nMohon langkah perbaikan untuk mencapai target. Terima kasih.\n\n{pengirim}\n{jabatan}',
  },
  {
    id: 'tpl-laporan', nama: 'Permintaan laporan bulanan', untuk: 'spbu',
    isi: '{salam} Bapak/Ibu {pic},\n\nMohon kiriman laporan operasional & penjualan bulanan SPBU {nomor} {spbu} sesuai ketentuan kerja sama KSO.\n\nTerima kasih.\n\n{pengirim}\n{jabatan}',
  },
  {
    id: 'tpl-kontrak', nama: 'Pengingat masa kontrak', untuk: 'spbu',
    isi: '{salam} Bapak/Ibu {pic},\n\nKami informasikan perjanjian KSO SPBU {nomor} {spbu} ({mitra}) berakhir pada *{akhirKontrak}*. Mohon koordinasi untuk proses evaluasi/perpanjangan.\n\nTerima kasih.\n\n{pengirim}\n{jabatan}',
  },
  {
    id: 'tpl-materi', nama: 'Kirim materi', untuk: 'materi',
    isi: '{salam} Bapak/Ibu {pic},\n\nBerikut kami sampaikan materi *{materi}* untuk SPBU {nomor} {spbu}.\n{link}\n\nMohon dipelajari dan disosialisasikan ke seluruh operator. Terima kasih.\n\n{pengirim}\n{jabatan}',
  },
];
