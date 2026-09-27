/**
 * Kriteria penilaian dari "Audit Guideline — Materi sosialisasi New Pertamina Way 2.0 2025
 * (Basic Operational)", dipetakan ke kode item checklist aplikasi (Excel Intertek).
 *
 * - `ref`   : nomor item di guideline (penomoran guideline berbeda dari checklist Intertek)
 * - `page`  : halaman PDF guideline
 * - `scale` : skala nilai menurut guideline
 * - `crit`  : keterangan tiap nilai
 * - `pct`   : jenis kriteria persentase untuk kalkulator "% sesuai"
 *             ('A-F' = 100/80/60/40/20, 'ACF' = 100/60, 'AF' = 100, 'ABCF' = 100/80/60)
 *
 * 42 item checklist Intertek tidak ada di guideline Basic Operational ini; skalanya
 * tetap mengikuti Excel sumber.
 */
export const GUIDELINE_TITLE = 'Audit Guideline New Pertamina Way 2.0 – 2025 (Basic Operational)'

export const GUIDELINE = {
 "1.1.1.a": {
  "ref": "1.1.1.a",
  "page": 2,
  "scale": "A/F",
  "crit": {
   "A": "Jika 100% operator memakai seragam sesuai standar PERTAMINA (rancangan serupa, dikancing, baju, celana, sepatu warna hitam dan kantong uang minimum 1 tiap pulau)",
   "F": "Jika kurang dari 100% operator memakai seragam sesuai standar PERTAMINA (rancangan serupa, dikancing, baju, celana, sepatu warna hitam dan kantong uang minimum 1 tiap pulau)"
  },
  "pct": "AF"
 },
 "1.1.1.b": {
  "ref": "1.1.1.b",
  "page": 3,
  "scale": "A/F",
  "crit": {
   "A": "Jika 100% Operator menggunakan nomor SPBU dan nama Operator",
   "F": "Jika kurang dari 100% Operator menggunakan nomor SPBU dan nama Operator"
  },
  "pct": "AF"
 },
 "1.1.1.d": {
  "ref": "1.1.1.c",
  "page": 4,
  "scale": "A/F",
  "crit": {
   "A": "Jika 100% operator tidak membawa HP di pulau pompa selama bertugas",
   "F": "Jika kurang dari 100% operator tidak membawa HP di pulau pompa selama bertugas"
  },
  "pct": "AF"
 },
 "1.1.2.a": {
  "ref": "1.1.2.a",
  "page": 5,
  "scale": "A-F",
  "crit": {
   "A": "Jika 100% operator sesuai point 1.1.2.a (penampilan Operator)",
   "B": "Jika 80% ≤ Operator <100% sesuai point 1.1.2.a (penampilan Operator)",
   "C": "Jika 60% ≤ Operator <80% sesuai point 1.1.2.a (penampilan Operator)",
   "D": "Jika 40% ≤ Operator <60% sesuai point 1.1.2.a (penampilan Operator)",
   "E": "Jika 20% ≤ Operator <40% sesuai point 1.1.2.a (penampilan Operator)",
   "F": "Jika kurang dari 20% operator sesuai point 1.1.2.a (penampilan Operator)"
  },
  "pct": "A-F"
 },
 "1.1.2.b": {
  "ref": "1.1.2.b",
  "page": 6,
  "scale": "A/B/C/F",
  "crit": {
   "A": "Jika Operator menerima upah sesuai aturan Upah Minimum tahun berjalan",
   "C": "Jika Operator tidak menerima upah sesuai aturan Upah Minimum tahun sebelumnya",
   "F": "Jika operator menerima upah tidak sesuai aturan Upah Minimum tahun berjalan dan tahun sebelumnya"
  }
 },
 "1.2.a": {
  "ref": "1.2.a",
  "page": 7,
  "scale": "A/C/F",
  "crit": {
   "A": "Jika seluruh sampel Operator melakukan pelayanan sesuai ketentuan point 1.2.a",
   "C": "Jika 60% ≤ jumlah sampel Operator <100% melakukan pelayanan sesuai ketentuan poin 1.2.a",
   "F": "Jika kurang dari 60% sampel Operator melakukan pelayanan sesuai ketentuan poin 1.2.a"
  },
  "pct": "ACF"
 },
 "1.2.b": {
  "ref": "1.2.b",
  "page": 8,
  "scale": "A/C/F",
  "crit": {
   "A": "Jika seluruh sampel Operator mengingatkan & memastikan mesin kendaraan konsumen dalam keadaan mati saat pengisian BBM serta memasang stick cone di depan kendaraan konsumen (khusus roda 4)",
   "C": "Jika 60% ≤ jumlah sampel Operator <100% Operator mengingatkan & memastikan mesin kendaraan konsumen dalam keadaan mati saat pengisian BBM serta memasang stick cone di depan kendaraan konsumen (khusus roda 4)",
   "F": "Jika kurang dari 60% sampel Operator mengingatkan & memastikan mesin kendaraan konsumen dalam keadaan mati saat pengisian BBM serta memasang stick cone di depan kendaraan konsumen (khusus roda 4)"
  },
  "pct": "ACF"
 },
 "1.2.c": {
  "ref": "1.2.c",
  "page": 9,
  "scale": "A/C/F/X",
  "crit": {
   "A": "Jika seluruh sampel Operator melakukan pelayanan sesuai ketentuan point 1.2.c",
   "C": "Jika 60% ≤ jumlah sampel Operator <100% melakukan pelayanan sesuai ketentuan poin 1.2.c",
   "F": "Jika kurang dari 60% sampel Operator melakukan pelayanan sesuai ketentuan point 1.2.c",
   "X": "Jika SPBU tersebut menggunakan metode penjualan self service"
  },
  "pct": "ACF"
 },
 "1.2.d": {
  "ref": "1.2.d",
  "page": 10,
  "scale": "A/F/X",
  "crit": {
   "A": "Jika 100 % sampel Operator melakukan pengisian BBM secara hati-hati untuk mencegah tumpahnya BBM yang bisa merusak kendaraan",
   "F": "Jika kurang dari 100 % sampel Operator melakukan pengisian BBM secara hati-hati untuk mencegah tumpahnya BBM yang bisa merusak kendaraan",
   "X": "Jika SPBU tersebut menggunakan metode penjualan self service"
  },
  "pct": "AF"
 },
 "1.2.e": {
  "ref": "1.2.e",
  "page": 11,
  "scale": "A/F",
  "crit": {
   "A": "Jika 100 % sampel Operator melakukan penawaran EDC MyPertamina",
   "F": "Jika kurang dari 100 % sampel Operator melakukan penawaran EDC MyPertamina"
  },
  "pct": "AF"
 },
 "1.2.f": {
  "ref": "1.2.f",
  "page": 12,
  "scale": "A-F",
  "crit": {
   "A": "Jika 100 % sampel Operator mengkonfirmasi harga total dan jumlah uang yang diterima kepada pelanggan",
   "B": "Jika 80% ≤ jumlah sampel Operator <100% mengkonfirmasi harga total dan jumlah uang yang diterima kepada pelanggan",
   "C": "Jika 60% ≤ jumlah sampel Operator <80% mengkonfirmasi harga total dan jumlah uang yang diterima kepada pelanggan",
   "D": "Jika 40% ≤ jumlah sampel Operator <60% mengkonfirmasi harga total dan jumlah uang yang diterima kepada pelanggan",
   "E": "Jika 20% ≤ jumlah sampel Operator <40% mengkonfirmasi harga total dan jumlah uang yang diterima kepada pelanggan",
   "F": "Jika kurang dari 20 % sampel Operator mengkonfirmasi harga total dan jumlah uang yang diterima kepada pelanggan"
  },
  "pct": "A-F"
 },
 "1.2.g": {
  "ref": "1.2.g",
  "page": 13,
  "scale": "A-F/X",
  "crit": {
   "A": "Jika 100 % sampel Operator menyerahkan kuitansi/struk dan memberitahukan jumlah uang kembalian",
   "B": "Jika 80% ≤ jumlah sampel Operator 100% menyerahkan kuitansi/struk dan memberitahukan jumlah uang kembalian",
   "C": "Nilai 60% ≤ jumlah sampel Operator <80% menyerahkan kuitansi/struk dan memberitahukan jumlah uang kembalian",
   "D": "Jika 40% ≤ jumlah sampel Operator <60% menyerahkan kuitansi/struk dan memberitahukan jumlah uang kembalian",
   "E": "Jika 20% ≤ jumlah sampel Operator <40% menyerahkan kuitansi/struk dan memberitahukan jumlah uang kembalian",
   "F": "Jika kurang dari 20 % sampel Operator menyerahkan kuitansi/struk dan memberitahukan jumlah uang kembalian"
  },
  "pct": "A-F"
 },
 "1.2.h": {
  "ref": "1.2.h",
  "page": 14,
  "scale": "A/C/F",
  "crit": {
   "A": "Jika 100% sampel Operator mengucapkan terima kasih atas kunjungannya",
   "C": "Jika 60% ≤ jumlah sampel Operator <100% mengucapkan terima kasih kepada pelanggan atas kunjungannya",
   "F": "Jika kurang dari 60% sampel Operator mengucapkan terima kasih kepada pelanggan atas kunjungannya"
  },
  "pct": "ACF"
 },
 "1.2.i": {
  "ref": "1.2.i",
  "page": 15,
  "scale": "A/F",
  "crit": {
   "A": "Jika masing-masing pulau pompa tersedia informasi Call Center Layanan Pelanggan",
   "F": "Jika salah satu pulau pompa tidak tersedia informasi Call Center Layanan Pelanggan"
  }
 },
 "2.1.a": {
  "ref": "2.1.a",
  "page": 17,
  "scale": "A/F",
  "crit": {
   "A": "Jika Dispenser Unit disegel dan disertifikasi oleh Dinas Metrologi (masa kalibrasi berlaku, segel pada dispenser unit dan sertifikat tersedia)",
   "F": "Jika terdapat Dispenser Unit tidak disegel dan/atau tidak disertifikasi oleh Dinas Metrologi (masa kalibrasi tidak berlaku, segel pada dispenser unit tidak tersedia atau terputus dan sertifikat tidak tersedia)"
  }
 },
 "2.1.b": {
  "ref": "2.1.b",
  "page": 18,
  "scale": "A/F",
  "crit": {
   "A": "Jika SPBU memperbarui secara berkala catatan Totalizer Dispenser Unit BBM",
   "F": "Jika SPBU tidak memperbarui secara berkala catatan Totalizer Dispenser Unit BBM"
  }
 },
 "2.1.c": {
  "ref": "2.1.c",
  "page": 19,
  "scale": "A/F",
  "crit": {
   "A": "Jika seluruh peralatan Q & Q tersedia dan dalam kondisi baik",
   "F": "Jika terdapat peralatan Q & Q tidak tersedia atau tidak dalam kondisi baik"
  }
 },
 "2.2.a": {
  "ref": "2.2.a",
  "page": 20,
  "scale": "A/F",
  "crit": {
   "A": "Jika tidak ditemukan tanda-tanda manipulasi pada dispenser unit: segel-segel Dispenser, flow meter, dan digital LED yang dapat mempengaruhi ketidakwajaran takaran",
   "F": "Jika terdapat tanda-tanda manipulasi pada dispenser unit: segel-segel Dispenser, flow meter, dan digital LED yang dapat mempengaruhi ketidakwajaran takaran"
  }
 },
 "2.2.b": {
  "ref": "2.2.b",
  "page": 21,
  "scale": "A/F",
  "crit": {
   "A": "Jika SPBU tersedia dua sampel pengiriman terakhir untuk masing-masing tangki timbun",
   "F": "Jika SPBU tidak tersedia dua sampel pengiriman terakhir untuk masing-masing tangki timbun"
  }
 },
 "2.2.d": {
  "ref": "2.2.c",
  "page": 22,
  "scale": "A/F",
  "crit": {
   "A": "Jika tersedia semua contoh produk yang tersedia di SPBU yang sesuai standar PERTAMINA",
   "F": "Jika tidak tersedia semua contoh produk yang tersedia di SPBU yang sesuai standar PERTAMINA"
  }
 },
 "2.2.e": {
  "ref": "2.2.d",
  "page": 23,
  "scale": "A/F",
  "crit": {
   "A": "Jika tidak terdapat air pada seluruh tangki timbun",
   "F": "Jika terdapat air pada tangki timbun (pemeriksaan manual); atau Jika ketinggian air lebih dari nol pada sensor ATG Console; atau Jika tidak dapat dilakukan pemeriksaan air baik manual maupun melalui ATG Console"
  }
 },
 "2.2.f": {
  "ref": "2.2.e",
  "page": 24,
  "scale": "A/F/X",
  "crit": {
   "A": "Jika selisih antara densitas observasi dan densitas referensi dalam rentang ± 0.003",
   "F": "Jika selisih antara densitas observasi dan densitas referensi tidak dalam rentang ± 0.003",
   "X": "Jika tidak tersedia produk"
  }
 },
 "2.2.g": {
  "ref": "2.2.f",
  "page": 25,
  "scale": "A/F/X",
  "crit": {
   "A": "Jika selisih antara densitas observasi dan densitas referensi dalam rentang ± 0.003",
   "F": "Jika selisih antara densitas observasi dan densitas referensi tidak dalam rentang ± 0.003",
   "X": "Jika tidak tersedia produk"
  }
 },
 "2.2.h": {
  "ref": "2.2.g",
  "page": 26,
  "scale": "A/F/X",
  "crit": {
   "A": "Jika selisih antara densitas observasi dan densitas referensi dalam rentang ± 0.003",
   "F": "Jika selisih antara densitas observasi dan densitas referensi tidak dalam rentang ± 0.003",
   "X": "Jika tidak tersedia produk"
  }
 },
 "2.2.i": {
  "ref": "2.2.h",
  "page": 27,
  "scale": "A/F/X",
  "crit": {
   "A": "Jika selisih antara densitas observasi dan densitas referensi dalam rentang ± 0.003",
   "F": "Jika selisih antara densitas observasi dan densitas referensi tidak dalam rentang ± 0.003",
   "X": "Jika tidak tersedia produk"
  }
 },
 "2.2.j": {
  "ref": "2.2.i",
  "page": 28,
  "scale": "A/F/X",
  "crit": {
   "A": "Jika selisih antara densitas observasi dan densitas referensi dalam rentang ± 0.003",
   "F": "Jika selisih antara densitas observasi dan densitas referensi tidak dalam rentang ± 0.003",
   "X": "Jika tidak tersedia produk"
  }
 },
 "2.2.k": {
  "ref": "2.2.j",
  "page": 29,
  "scale": "A/F/X",
  "crit": {
   "A": "Jika selisih antara densitas observasi dan densitas referensi dalam rentang ± 0.003",
   "F": "Jika selisih antara densitas observasi dan densitas referensi tidak dalam rentang ± 0.003",
   "X": "Jika tidak tersedia produk"
  }
 },
 "2.2.l": {
  "ref": "2.2.k",
  "page": 30,
  "scale": "A/F/X",
  "crit": {
   "A": "Jika selisih antara densitas observasi dan densitas referensi dalam rentang ± 0.003",
   "F": "Jika selisih antara densitas observasi dan densitas referensi tidak dalam rentang ± 0.003",
   "X": "Jika tidak tersedia produk"
  }
 },
 "2.2.m": {
  "ref": "2.2.l",
  "page": 31,
  "scale": "A/B/C/F",
  "crit": {
   "A": "Tidak ada nozzle yang diperiksa di bawah toleransi −60 ml/20 liter",
   "B": "61–80 nozzle diperiksa: 1 s/d 2 nozzle di bawah toleransi",
   "C": "4–8 nozzle: 1 · 9–14 nozzle: 1–2 · 15–30 nozzle: 1–3 · 31–60 nozzle: 1–4 · 61–80 nozzle: 3–6 nozzle di bawah toleransi",
   "F": "1–3 nozzle: ≥1 · 4–8 nozzle: ≥2 · 9–14 nozzle: ≥3 · 15–30 nozzle: ≥4 · 31–60 nozzle: ≥5 · 61–80 nozzle: ≥7 nozzle di bawah toleransi"
  }
 },
 "2.2.n": {
  "ref": "2.2.m",
  "page": 32,
  "scale": "A/C/F",
  "crit": {
   "A": "Jika Catatan stok harian dan report harian POS P – Insyst diperbarui sesuai jadwal",
   "C": "Jika Catatan stok harian atau report harian POS P - Insyst tidak diperbarui sesuai jadwal",
   "F": "Jika Catatan stok harian atau report harian POS P – Insyst tidak dapat ditunjukkan"
  }
 },
 "2.2.o": {
  "ref": "2.2.n",
  "page": 33,
  "scale": "A/C/F",
  "crit": {
   "A": "Jika Catatan kualitas harian diperbarui minimal density pagi hari H audit dan density penerimaan beserta bukti foto pemeriksaan density dengan tertera tanggal dan jam pengambilannya dan Catatan Pemeriksaan volume harian diperbarui sampai hari H audit",
   "C": "Jika Catatan kualitas harian diperbarui minimal density pagi hari H audit namun density penerimaan tidak diperbarui (jika ada penerimaan) dan Catatan Pemeriksaan volume harian diperbarui sampai hari H audit; atau Jika Catatan kualitas harian diperbarui minimal density pagi hari H audit namun tidak tersedia bukti foto pemeriksaan density dan Catatan Pemeriksaan volume harian diperbarui sampai hari H audit; atau Jika data density pasca 2 jam tidak diinput ke Pos P-Insyst",
   "F": "Jika Catatan kualitas harian tidak diperbarui minimal density pagi hari H audit dan density penerimaan (jika ada penerimaan) dan/atau Catatan Pemeriksaan volume harian tidak diperbarui sampai hari H audit"
  }
 },
 "2.2.p": {
  "ref": "2.2.o",
  "page": 34,
  "scale": "A/F",
  "crit": {
   "A": "Jika tanda terima BBM/surat pengantar BBM (DO) dan Penebusan BBM (SO) tersedia di SPBU",
   "F": "Jika tanda terima BBM/surat pengantar BBM (DO) dan/atau Penebusan BBM (SO) tidak tersedia di SPBU"
  }
 },
 "2.2.q": {
  "ref": "2.2.p",
  "page": 35,
  "scale": "A/F",
  "crit": {
   "A": "Jika tidak terdapat produk JBU habis atau terdapat produk habis namun tersedia SO/penebusan sebelum hari H audit",
   "F": "Jika terdapat produk JBU habis dan tidak tersedia penebusan atau terdapat produk habis dan tersedia SO/penebusan bersamaan pada hari H audit"
  }
 },
 "3.1.1.e": {
  "ref": "3.1.1.a",
  "page": 37,
  "scale": "A-F",
  "crit": {
   "A": "Jika 100 % Totem/Signboard, Lisplang, Kanopi, Rambu Masuk dan Rambu Keluar dalam kondisi bersih dan baik tanpa ada kerusakan",
   "B": "Jika 80% ≤ Totem/Signboard, Lisplang, Kanopi, Rambu Masuk dan Rambu Keluar <100% dalam kondisi bersih dan baik tanpa ada kerusakan",
   "C": "Jika 60% ≤ Totem/Signboard, Lisplang, Kanopi, Rambu Masuk dan Rambu Keluar <80% dalam kondisi bersih dan baik tanpa ada kerusakan",
   "D": "Jika 40% ≤ Totem/Signboard, Lisplang, Kanopi, Rambu Masuk dan Rambu Keluar <60% dalam kondisi bersih dan baik tanpa ada kerusakan",
   "E": "Jika 20% ≤ Totem/Signboard, Lisplang, Kanopi, Rambu Masuk dan Rambu Keluar <40% dalam kondisi bersih dan baik tanpa ada kerusakan",
   "F": "Jika kurang dari 20% Totem/Signboard, Lisplang, Kanopi, Rambu Masuk dan Rambu Keluar dalam kondisi bersih dan baik tanpa ada kerusakan"
  },
  "pct": "A-F"
 },
 "3.1.1.f": {
  "ref": "3.1.1.b",
  "page": 38,
  "scale": "A-F",
  "crit": {
   "A": "Jika 100% Lampu penerangan di bawah kanopi dan lampu lisplang dalam kondisi berfungsi",
   "B": "Jika 80% ≤ Lampu penerangan di bawah kanopi dan lampu lisplang ≤ 100% dalam kondisi berfungsi",
   "C": "Jika 60% ≤ Lampu penerangan di bawah kanopi dan lampu lisplang <80% dalam kondisi berfungsi",
   "D": "Jika 40% ≤ Lampu penerangan di bawah kanopi dan lampu lisplang <60% dalam kondisi berfungsi",
   "E": "Jika 20% ≤ Lampu penerangan di bawah kanopi dan lampu lisplang <40% dalam kondisi berfungsi",
   "F": "Jika kurang dari 20% Lampu penerangan di bawah kanopi dan lampu lisplang dalam kondisi berfungsi"
  },
  "pct": "A-F"
 },
 "3.1.1.a": {
  "ref": "3.1.1.c",
  "page": 39,
  "scale": "A-F",
  "crit": {
   "A": "Jika 100% Tempat pembongkaran BBM dan Driveway/ Pelataran pengisian BBM dalam keadaan bebas tumpahan minyak, sampah, kering dan terpelihara baik (tak ada lubang atau kerusakan besar lainnya) serta tidak ada hambatan pada akses keluar masuk",
   "B": "Jika 80% ≤ Tempat pembongkaran BBM dan Driveway <100% dalam keadaan bebas tumpahan minyak, sampah, kering dan terpelihara baik (tak ada lubang atau kerusakan besar lainnya) serta tidak ada hambatan pada akses keluar masuk",
   "C": "Jika 60% ≤Tempat pembongkaran BBM dan Driveway <80% dalam keadaan bebas tumpahan minyak, sampah, kering dan terpelihara baik (tak ada lubang atau kerusakan besar lainnya) serta tidak ada hambatan pada akses keluar masuk",
   "D": "Jika 40% ≤ Tempat pembongkaran BBM dan Driveway <60% dalam keadaan bebas tumpahan minyak, sampah, kering dan terpelihara baik (tak ada lubang atau kerusakan besar lainnya) serta tidak ada hambatan pada akses keluar masuk",
   "E": "Jika 20% ≤ Tempat pembongkaran BBM dan Driveway <40% dalam keadaan bebas tumpahan minyak, sampah, kering dan terpelihara baik (tak ada lubang atau kerusakan besar lainnya) serta tidak ada hambatan pada akses keluar masuk",
   "F": "Jika kurang dari 20% Tempat pembongkaran BBM dan Driveway dalam keadaan bebas tumpahan minyak, sampah, kering dan terpelihara baik (tak ada lubang atau kerusakan besar lainnya) serta tidak ada hambatan pada akses keluar masuk"
  },
  "pct": "A-F"
 },
 "3.1.1.i": {
  "ref": "3.1.1.c",
  "page": 39,
  "scale": "A-F",
  "crit": {
   "A": "Jika 100% Tempat pembongkaran BBM dan Driveway/ Pelataran pengisian BBM dalam keadaan bebas tumpahan minyak, sampah, kering dan terpelihara baik (tak ada lubang atau kerusakan besar lainnya) serta tidak ada hambatan pada akses keluar masuk",
   "B": "Jika 80% ≤ Tempat pembongkaran BBM dan Driveway <100% dalam keadaan bebas tumpahan minyak, sampah, kering dan terpelihara baik (tak ada lubang atau kerusakan besar lainnya) serta tidak ada hambatan pada akses keluar masuk",
   "C": "Jika 60% ≤Tempat pembongkaran BBM dan Driveway <80% dalam keadaan bebas tumpahan minyak, sampah, kering dan terpelihara baik (tak ada lubang atau kerusakan besar lainnya) serta tidak ada hambatan pada akses keluar masuk",
   "D": "Jika 40% ≤ Tempat pembongkaran BBM dan Driveway <60% dalam keadaan bebas tumpahan minyak, sampah, kering dan terpelihara baik (tak ada lubang atau kerusakan besar lainnya) serta tidak ada hambatan pada akses keluar masuk",
   "E": "Jika 20% ≤ Tempat pembongkaran BBM dan Driveway <40% dalam keadaan bebas tumpahan minyak, sampah, kering dan terpelihara baik (tak ada lubang atau kerusakan besar lainnya) serta tidak ada hambatan pada akses keluar masuk",
   "F": "Jika kurang dari 20% Tempat pembongkaran BBM dan Driveway dalam keadaan bebas tumpahan minyak, sampah, kering dan terpelihara baik (tak ada lubang atau kerusakan besar lainnya) serta tidak ada hambatan pada akses keluar masuk"
  },
  "pct": "A-F"
 },
 "3.1.1.j": {
  "ref": "3.1.1.d",
  "page": 40,
  "scale": "A/F",
  "crit": {
   "A": "Jika tutup lubang tangki pengisian BBM diberi kode warna sesuai produk",
   "F": "Jika tutup lubang tangki pengisian BBM diberi kode warna tidak sesuai produk"
  }
 },
 "3.1.1.l": {
  "ref": "3.1.1.e",
  "page": 41,
  "scale": "A/C/F",
  "crit": {
   "A": "Jika Oil Catcher sesuai dengan standar dan dalam kondisi bersih",
   "C": "Jika Oil Catcher sesuai dengan standar dan tidak dalam kondisi bersih",
   "F": "Jika Oil Catcher tidak sesuai dengan standar dan dalam kondisi bersih"
  }
 },
 "3.1.2.b": {
  "ref": "3.1.2.a",
  "page": 42,
  "scale": "A/C/F",
  "crit": {
   "A": "Jika toilet dan wastafel dalam kondisi bersih, terpelihara baik dan perangkat di dalamnya dapat berfungsi (seperti kran air, bak air, gayung, urinoir, kloset, dan lampu)",
   "C": "Jika toilet/wastafel dalam kondisi tidak bersih/terpelihara baik, namun perangkat di dalamnya dapat berfungsi (seperti kran air, bak air, gayung, urinoir, kloset, dan lampu)",
   "F": "Jika perangkat di dalamnya tidak dapat berfungsi (seperti kran air, bak air, gayung, urinoir, kloset, dan lampu)"
  }
 },
 "3.1.2.e": {
  "ref": "3.1.2.b",
  "page": 43,
  "scale": "A/F",
  "crit": {
   "A": "Jika toilet berpenerangan cukup dan tersedia pengharum ruangan",
   "F": "Jika toilet tidak berpenerangan cukup dan/atau tidak tersedia pengharum ruangan"
  }
 },
 "3.1.3.b": {
  "ref": "3.1.3.a",
  "page": 44,
  "scale": "A/C/F/X",
  "crit": {
   "A": "Jika area wudhu dan musala dalam keadaan bersih, berpenerangan cukup, terpelihara dengan baik serta tersedia pengharum ruangan di ruangan musholla",
   "C": "Jika terdapat salah satu kondisi: tidak bersih atau tidak berpenerangan cukup atau tidak tersedia pengharum ruangan di area musala",
   "F": "Jika terdapat dua kondisi berikut: - tidak bersih - tidak ber penerangan cukup - tidak tersedia pengharum ruangan di area musala",
   "X": "Jika tidak tersedia fasilitas ibadah di SPBU"
  }
 },
 "3.1.4.a": {
  "ref": "3.2.a",
  "page": 45,
  "scale": "A/F",
  "crit": {
   "A": "Jika tersedia alat pemadam api ringan (APAR) dalam kondisi sesuai dengan ketentuan poin 3.1.4.a",
   "F": "Jika alat pemadam api ringan (APAR) dalam kondisi tidak sesuai dengan ketentuan poin 3.1.4.a"
  }
 },
 "3.1.4.b": {
  "ref": "3.2.b",
  "page": 46,
  "scale": "A/F",
  "crit": {
   "A": "Jika tersedia alat pemadam api berat (APAB) dalam kondisi sesuai dengan ketentuan poin 3.1.4.b",
   "F": "Jika alat pemadam api berat (APAB) dalam kondisi tidak sesuai dengan ketentuan poin 3.1.4.b"
  }
 },
 "3.1.4.c": {
  "ref": "3.2.c",
  "page": 47,
  "scale": "A/F",
  "crit": {
   "A": "Jika alat pemadam kebakaran yang diperiksa setiap 6 bulan sekali oleh petugas/perusahaan/institusi yang berwenang serta hasil dan tanggal pemeriksaan tercantum pada tabung pemadam tersebut",
   "F": "Jika alat pemadam kebakaran tidak diperiksa setiap 6 bulan sekali oleh petugas/perusahaan/institusi yang berwenang atau hasil dan tanggal pemeriksaan tidak tercantum pada tabung pemadam tersebut"
  }
 },
 "3.1.4.d": {
  "ref": "3.2.d",
  "page": 48,
  "scale": "A/F",
  "crit": {
   "A": "Jika \"Grounding\" (Kawat penetralan arus listrik) di area pengisian BBM dalam kondisi baik",
   "F": "Jika \"Grounding\" (Kawat penetralan arus listrik) di area pengisian BBM dalam kondisi tidak baik"
  }
 },
 "3.1.4.e": {
  "ref": "3.2.e",
  "page": 49,
  "scale": "A/F",
  "crit": {
   "A": "Jika Ducting / saluran pipa dari tangki timbun ke dispenser tertutup / ditimbun",
   "F": "Jika Ducting / saluran pipa dari tangki timbun ke dispenser tidak tertutup / ditimbun"
  }
 },
 "3.1.4.f": {
  "ref": "3.2.f",
  "page": 50,
  "scale": "A/F",
  "crit": {
   "A": "Jika seluruh nozzle terpasang Breakaway valve",
   "F": "Jika terdapat nozzle tidak terpasang Breakaway valve"
  }
 },
 "3.1.4.l": {
  "ref": "3.2.g",
  "page": 51,
  "scale": "A/F",
  "crit": {
   "A": "Jika tidak ada lubang terbuka di seluruh area manhole",
   "F": "Jika terdapat lubang terbuka di area manhole"
  }
 },
 "3.1.4.m": {
  "ref": "3.2.h",
  "page": 52,
  "scale": "A/F",
  "crit": {
   "A": "Jika tidak terdapat genangan BBM / air pada seluruh dombak / tank sump",
   "F": "Jika terdapat genangan BBM / air pada seluruh dombak / tank sump"
  }
 },
 "3.1.4.n": {
  "ref": "3.2.i",
  "page": 53,
  "scale": "A/F",
  "crit": {
   "A": "Jika tersedia rambu-rambu / sticker peringatan / larangan mengenai safety",
   "F": "Jika tidak tersedia rambu-rambu / sticker peringatan / larangan mengenai safety"
  }
 },
 "3.1.4.o": {
  "ref": "3.2.j",
  "page": 54,
  "scale": "A/F",
  "crit": {
   "A": "Jika tersedia daftar nomor telepon penting / emergency",
   "F": "Jika tidak tersedia daftar nomor telepon penting / emergency"
  }
 },
 "3.1.4.p": {
  "ref": "3.2.k",
  "page": 55,
  "scale": "A/F/X",
  "crit": {
   "A": "Jika tersedia Surat Ijin Kerja Aman (SIKA) saat ada pekerjaan perbaikan di lokasi",
   "F": "Jika tidak tersedia Surat Ijin Kerja Aman (SIKA) saat ada pekerjaan perbaikan di lokasi",
   "X": "Tidak ada pekerjaan perbaikan di SPBU"
  }
 },
 "3.1.4.r": {
  "ref": "3.2.l",
  "page": 56,
  "scale": "A-F",
  "crit": {
   "A": "Jika 100% instalasi listrik tampak aman",
   "B": "Jika 80% ≤ instalasi listrik <100% tampak instalasi aman",
   "C": "Jika 60% ≤ instalasi listrik <80% tampak instalasi aman",
   "D": "Jika 40% ≤ instalasi listrik <60% tampak instalasi aman",
   "E": "Jika 20% ≤ instalasi listrik <40% tampak instalasi aman",
   "F": "Jika kurang dari 20% instalasi tampak instalasi listrik tampak aman"
  },
  "pct": "A-F"
 },
 "3.1.4.s": {
  "ref": "3.2.m",
  "page": 57,
  "scale": "A/F",
  "crit": {
   "A": "Jika kotak P3K tersedia di kantor",
   "F": "Jika kotak P3K tidak tersedia di kantor"
  }
 },
 "3.1.4.t": {
  "ref": "3.2.n",
  "page": 58,
  "scale": "A-F",
  "crit": {
   "A": "Jika 100% operator dan pengawas telah terlatih dalam hal pemadaman kebakaran",
   "B": "Jika 80% ≤ operator dan pengawas <100% telah terlatih dalam hal pemadaman kebakaran",
   "C": "Jika 60% ≤ operator dan pengawas <80% telah terlatih dalam hal pemadaman kebakaran",
   "D": "Jika 40% ≤ operator dan pengawas <60% telah terlatih dalam hal pemadaman kebakaran",
   "E": "Jika 20% ≤ operator dan pengawas <40% telah terlatih dalam hal pemadaman kebakaran",
   "F": "Jika pengawas telah terlatih namun seluruh operator tidak tersedia sertifikat dalam hal pemadaman kebakaran"
  },
  "pct": "A-F"
 },
 "3.1.4.u": {
  "ref": "3.2.o",
  "page": 59,
  "scale": "A/F",
  "crit": {
   "A": "Jika terdapat minimal 1 (satu) orang petugas SPBU aktif yang telah mendapat surat keterangan Safetyman",
   "F": "Jika tidak tersedia petugas SPBU aktif yang telah mendapat surat keterangan Safetyman"
  }
 },
 "3.2.d": {
  "ref": "3.3.a",
  "page": 60,
  "scale": "A-F",
  "crit": {
   "A": "Jika 100% Layar penunjuk (LCD Dispenser) terbaca dengan jelas",
   "B": "Jika 80% ≤ Layar penunjuk (LCD Dispenser) < 100% terbaca dengan jelas",
   "C": "Jika 60% ≤ Layar penunjuk (LCD Dispenser) < 80% terbaca dengan jelas",
   "D": "Jika 40% ≤ Layar penunjuk (LCD Dispenser) < 60% terbaca dengan jelas",
   "E": "Jika 20% ≤ Layar penunjuk (LCD Dispenser) < 40% terbaca dengan jelas",
   "F": "Jika kurang dari 20% Layar penunjuk (LCD Dispenser) terbaca dengan jelas"
  },
  "pct": "A-F"
 },
 "3.2.e": {
  "ref": "3.3.b",
  "page": 61,
  "scale": "A/F",
  "crit": {
   "A": "Jika 100% sambungan pipa produk di dalam Dispenser Unit BBM tidak terdapat kebocoran",
   "F": "Jika < 100% sambungan pipa produk di dalam Dispenser Unit BBM tidak terdapat kebocoran"
  },
  "pct": "AF"
 },
 "3.2.f": {
  "ref": "3.3.c",
  "page": 62,
  "scale": "A/F",
  "crit": {
   "A": "Jika 100% semua koneksi listrik di dalam Dispenser Unit tidak terdapat sambungan yang longgar, terbuka, dan terkelupas",
   "F": "Jika < 100% koneksi listrik di dalam Dispenser Unit tidak terdapat sambungan yang longgar, terbuka dan terkelupas"
  },
  "pct": "AF"
 },
 "3.2.g": {
  "ref": "3.3.d",
  "page": 63,
  "scale": "A-F",
  "crit": {
   "A": "Jika 100% selang pengisian BBM tidak bocor atau terkelupas",
   "B": "Jika 80% ≤ selang pengisian BBM < 100% tidak bocor atau terkelupas",
   "C": "Jika 60% ≤ selang pengisian BBM < 80% tidak bocor atau terkelupas",
   "D": "Jika 40% ≤ selang pengisian BBM < 60% tidak bocor atau terkelupas",
   "E": "Jika 20% ≤ selang pengisian BBM < 40% tidak bocor atau terkelupas",
   "F": "Jika kurang dari 20% selang pengisian BBM tidak bocor atau terkelupas"
  },
  "pct": "A-F"
 },
 "3.2.h": {
  "ref": "3.3.e",
  "page": 64,
  "scale": "A/F",
  "crit": {
   "A": "Jika generator terpelihara secara baik dan tidak ditemukan kebocoran minyak atau pelumas, serta dapat berfungsi dengan baik",
   "F": "Jika generator tidak terpelihara dengan baik atau ditemukan kebocoran minyak atau pelumas atau tidak dapat berfungsi dengan baik"
  }
 },
 "3.2.i": {
  "ref": "3.3.f",
  "page": 65,
  "scale": "A/F/X",
  "crit": {
   "A": "Jika Pipa sirkulasi udara tangki timbun (Vent Pipe) pada area penyimpanan BBM sesuai warna produk",
   "F": "Jika Pipa sirkulasi udara tangki timbun (Vent Pipe) pada area penyimpanan BBM tidak sesuai warna produk",
   "X": "Jika tidak tersedia pipa sirkulasi udara tangki timbun (Vent Pipe)"
  }
 },
 "3.3.a": {
  "ref": "3.4.a",
  "page": 66,
  "scale": "A/F",
  "crit": {
   "A": "Jika catatan kerusakan tersedia dan kerusakan terdokumentasi dengan baik",
   "F": "Jika catatan kerusakan tidak tersedia atau informasi kerusakan tidak terdokumentasi dengan baik"
  }
 },
 "3.3.b": {
  "ref": "3.4.b",
  "page": 67,
  "scale": "A/F",
  "crit": {
   "A": "Jika catatan kerusakan tersedia dan kerusakan terdokumentasi dengan baik",
   "F": "Jika catatan kerusakan tidak tersedia atau informasi kerusakan tidak terdokumentasi dengan baik"
  }
 },
 "3.3.c": {
  "ref": "3.4.c",
  "page": 68,
  "scale": "A/F",
  "crit": {
   "A": "Jika keluhan kerusakan ditindaklanjuti dan diselesaikan dalam waktu maksimal 3 bulan",
   "F": "Jika keluhan kerusakan tidak ditindaklanjuti dan diselesaikan dalam waktu maksimal 3 bulan"
  }
 },
 "3.3.d": {
  "ref": "3.4.d",
  "page": 69,
  "scale": "A/F",
  "crit": {
   "A": "Jika seluruh mesin yang ada dalam kondisi baik dan berfungsi",
   "F": "Jika terdapat mesin yang ada dalam kondisi tidak baik dan tidak berfungsi"
  }
 },
 "4.1.a": {
  "ref": "3.5.a",
  "page": 70,
  "scale": "A/F",
  "crit": {
   "A": "Jika Produk Sign (Product Signage) sesuai dengan standar PERTAMINA",
   "F": "Jika Produk Sign (Product Signage) tidak sesuai dengan standar PERTAMINA"
  }
 },
 "4.1.b": {
  "ref": "3.5.b",
  "page": 71,
  "scale": "A-F",
  "crit": {
   "A": "Jika Totem sesuai dengan standar PERTAMINA versi tahun 2018 / format Green Energy Station dan penunjuk harga LED digital",
   "B": "Jika Totem sesuai dengan standar PERTAMINA versi tahun 2018 / format Green Energy Station, namun penunjuk harga LED digital dengan logo PERTAMINA tidak sesuai dan/atau menggunakan penunjuk harga manual",
   "C": "Jika Totem sesuai dengan standar PERTAMINA versi tahun 2006 atau 2007 dan menggunakan penunjuk harga",
   "D": "Jika Totem sesuai dengan standar PERTAMINA versi tahun 2006 atau 2007 dan tidak menggunakan penunjuk harga",
   "E": "Jika Totem tidak sesuai dengan standar PERTAMINA versi tahun 2006 atau 2007 atau 2018",
   "F": "Jika Totem tidak tersedia"
  }
 },
 "4.1.c": {
  "ref": "3.5.c",
  "page": 72,
  "scale": "A/F",
  "crit": {
   "A": "Jika lisplang (Facia) sesuai dengan standar PERTAMINA",
   "F": "Jika lisplang (Facia) tidak sesuai dengan standar PERTAMINA"
  }
 },
 "4.1.d": {
  "ref": "3.5.d",
  "page": 73,
  "scale": "A/F",
  "crit": {
   "A": "Jika Tiang kanopi sesuai dengan standar PERTAMINA",
   "F": "Jika Tiang kanopi tidak sesuai dengan standar PERTAMINA"
  }
 },
 "4.2.a": {
  "ref": "3.6.a",
  "page": 74,
  "scale": "A/F",
  "crit": {
   "A": "Jika Dispenser Unit BBM memiliki warna penunjuk produk sesuai dengan standar PERTAMINA",
   "F": "Jika Dispenser Unit BBM memiliki warna penunjuk produk tidak sesuai dengan standar PERTAMINA"
  }
 },
 "4.2.b": {
  "ref": "3.6.b",
  "page": 75,
  "scale": "A/F",
  "crit": {
   "A": "Jika paduan warna pada Dispenser Unit BBM sesuai dengan standar PERTAMINA",
   "F": "Jika paduan warna pada Dispenser Unit BBM tidak sesuai dengan standar PERTAMINA"
  }
 },
 "4.3.a": {
  "ref": "3.7.a",
  "page": 76,
  "scale": "A/B/C/F",
  "crit": {
   "A": "Jika 100% EDC Digitalisasi dan/atau Tablet MyPertamina tersedia dan berfungsi dengan baik di pulau pompa JBU",
   "B": "Jika 80% ≤ EDC Digitalisasi dan/atau Tablet MyPertamina < 100% tersedia dan berfungsi dengan baik di pulau pompa JBU",
   "C": "Jika 60% ≤ EDC Digitalisasi dan/atau Tablet MyPertamina < 80% tersedia dan berfungsi dengan baik di pulau pompa JBU",
   "F": "Jika 0% ≤ EDC Digitalisasi dan/atau Tablet MyPertamina < 60% tersedia dan berfungsi dengan baik di pulau pompa JBU"
  },
  "pct": "ABCF"
 },
 "4.3.d": {
  "ref": "3.7.b",
  "page": 77,
  "scale": "A/F",
  "crit": {
   "A": "Jika tersedia ATG & POS sesuai ketentuan PERTAMINA",
   "F": "Jika tidak tersedia ATG dan/atau tidak tersedia POS dan/atau ATG & POS tidak sesuai ketentuan PERTAMINA"
  }
 },
 "4.3.b": {
  "ref": "3.7.c",
  "page": 78,
  "scale": "A/F",
  "crit": {
   "A": "Jika petunjuk fasilitas SPBU telah tersedia (Musala, Toilet, Air dan Angin)",
   "F": "Jika terdapat petunjuk fasilitas SPBU tidak tersedia (Musala, Toilet, Air dan Angin)"
  }
 },
 "4.3.e": {
  "ref": "3.7.d",
  "page": 79,
  "scale": "A/F",
  "crit": {
   "A": "Jika SPBU dilengkapi CCTV di setiap pulau pompa dan berfungsi dengan baik dan tersimpan datanya min.1 bulan",
   "F": "Jika SPBU tidak dilengkapi CCTV di setiap pulau pompa atau tidak berfungsi dengan baik atau tidak tersimpan datanya min.1 bulan"
  }
 },
 "5.1.f": {
  "ref": "3.8.a",
  "page": 80,
  "scale": "A/C/F",
  "crit": {
   "A": "Jika tersedia produk JBU minimum 2 jenis yaitu Pertamax Series dan Dex Series",
   "C": "Jika tersedia produk JBU minimum 1 jenis yaitu Pertamax Series atau Dex Series",
   "F": "Jika tidak tersedia produk JBU Pertamax Series dan Dex Series"
  }
 },
 "5.2.d": {
  "ref": "3.8.b",
  "page": 81,
  "scale": "A/B/F",
  "crit": {
   "A": "Jika tersedia dua atau lebih NFR Nasional",
   "B": "Jika tersedia satu NFR Nasional",
   "F": "Jika tidak tersedia NFR Nasional"
  }
 },
 "5.2.e": {
  "ref": "3.8.c",
  "page": 82,
  "scale": "A/B/F",
  "crit": {
   "A": "Jika tersedia dua atau lebih NFR Lokal dan berkontrak payung dengan PT Pertamina Patra Niaga",
   "B": "Jika tersedia satu NFR Lokal dan berkontrak payung dengan PT Pertamina Patra Niaga",
   "F": "Jika tidak tersedia NFR Lokal, atau tersedia NFR Lokal namun tidak berkontrak payung dengan PT Pertamina Patra Niaga"
  }
 },
 "5.2.f": {
  "ref": "3.8.d",
  "page": 83,
  "scale": "A/F",
  "crit": {
   "A": "Jika seluruh NFR di SPBU memiliki izin Prinsip Pertamina Patra Niaga",
   "F": "Jika terdapat NFR yang tidak memiliki izin prinsip Pertamina Patra Niaga"
  }
 },
 "5.2.h": {
  "ref": "3.8.e",
  "page": 84,
  "scale": "A/B/F",
  "crit": {
   "A": "Jika tersedia pelumas Fastron series dan Enduro series dan memiliki format etalase sesuai standar",
   "B": "Jika tersedia pelumas Fastron series dan Enduro series, namun format etalase tidak sesuai standar",
   "F": "Jika tidak tersedia pelumas Fastron series dan atau Enduro series"
  }
 },
 "5.2.i": {
  "ref": "3.8.f",
  "page": 85,
  "scale": "A/F",
  "crit": {
   "A": "Jika SPBU tersedia fasilitas pengisian air dan angin serta berfungsi dengan baik dan terpelihara dengan baik",
   "F": "Jika SPBU tidak tersedia fasilitas pengisian air dan angin dan/atau tidak berfungsi dengan baik dan terpelihara dengan baik"
  }
 }
}
