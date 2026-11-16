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
  ['pic', 'Nama PIC SPBU'],
  ['sbm', 'Nama SBM'],
  ['nomor', 'Nomor SPBU (54.644.21)'],
  ['kota', 'Kota / kabupaten'],
  ['tahap', 'Tahapan terakhir'],
  ['berikutnya', 'Tahapan berikutnya'],
  ['plan', 'Tanggal plan sosialisasi & survey'],
  ['penawaran', 'Penawaran sharing'],
  ['keterangan', 'Keterangan'],
  ['aksi', 'Rencana tindak lanjut berikutnya'],
  ['jadwal', 'Tanggal tindak lanjut berikutnya'],
  ['materi', 'Judul materi'],
  ['link', 'Link materi'],
  ['pengirim', 'Nama pengirim (Pengaturan)'],
  ['jabatan', 'Jabatan pengirim (Pengaturan)'],
  ['perusahaan', 'Nama perusahaan pengirim (Pengaturan)'],
];

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 18) return 'Selamat sore';
  return 'Selamat malam';
}

const TTD = '\n\nHormat kami,\n{pengirim}\n{jabatan}\n{perusahaan}';

// `untuk`: 'pic' (PIC/owner SPBU), 'sbm' (Sales Branch Manager), 'materi' (kirim materi ke PIC).
export const DEFAULT_TEMPLATES = [
  { id: 'tpl-kenal', nama: 'Perkenalan & ajakan sosialisasi KSO TAC', untuk: 'pic',
    isi: '{salam} Bapak/Ibu {pic},\n\nPerkenalkan, saya {pengirim} ({jabatan}). Kami ingin memperkenalkan peluang kerja sama pengelolaan SPBU {nomor} melalui skema *KSO TAC* bersama {perusahaan}.\n\nBila berkenan, kami ingin menjadwalkan sosialisasi & survey di lokasi SPBU. Kapan waktu yang Bapak/Ibu (dan owner) luangkan?\n\nTerima kasih.' + TTD },
  { id: 'tpl-jadwal', nama: 'Konfirmasi jadwal sosialisasi & survey', untuk: 'pic',
    isi: '{salam} Bapak/Ibu {pic},\n\nMengonfirmasi rencana *sosialisasi & survey KSO TAC* di SPBU {nomor} ({kota}) pada *{plan}*.\n\nMohon konfirmasi kehadiran owner / pengelola. Terima kasih.' + TTD },
  { id: 'tpl-materi', nama: 'Kirim materi', untuk: 'materi',
    isi: '{salam} Bapak/Ibu {pic},\n\nBerikut kami sampaikan materi *{materi}* sebagai bahan pertimbangan kerja sama KSO TAC untuk SPBU {nomor}.\n{link}\n\nKami siap menjelaskan lebih lanjut bila ada pertanyaan.' + TTD },
  { id: 'tpl-penawaran', nama: 'Follow-up penawaran sharing', untuk: 'pic',
    isi: '{salam} Bapak/Ibu {pic},\n\nMenindaklanjuti penawaran sharing KSO TAC untuk SPBU {nomor} ({penawaran}), kami ingin menanyakan tanggapan owner serta hal yang masih perlu kami jelaskan atau diskusikan.\n\nKami menunggu kabar baiknya.' + TTD },
  { id: 'tpl-fu', nama: 'Follow-up tindak lanjut', untuk: 'pic',
    isi: '{salam} Bapak/Ibu {pic},\n\nMelanjutkan pembahasan kerja sama KSO TAC SPBU {nomor}. Rencana berikutnya: *{aksi}*{jadwal}.\n\nMohon kabar dari Bapak/Ibu. Terima kasih.' + TTD },
  { id: 'tpl-sbm', nama: 'Minta bantuan SBM menghubungkan owner', untuk: 'sbm',
    isi: '{salam} Pak {sbm},\n\nMohon bantuan untuk menginformasikan/menghubungkan kami dengan owner SPBU {nomor} ({kota}) terkait rencana *sosialisasi & survey KSO TAC*.\n\nStatus terakhir: {keterangan}\n\nTerima kasih atas bantuannya.' + TTD },
  { id: 'tpl-sbm-update', nama: 'Update progres ke SBM', untuk: 'sbm',
    isi: '{salam} Pak {sbm},\n\nUpdate progres KSO TAC SPBU {nomor} ({kota}):\nTahapan: *{tahap}*\nKeterangan: {keterangan}\nRencana berikutnya: {aksi}{jadwal}\n\nTerima kasih.' + TTD },
];
