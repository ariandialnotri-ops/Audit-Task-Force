/**
 * Checklist Cross Check Up (CCU) SPBU COCO — PT Pertamina Retail.
 * DIBUAT OTOMATIS dari "Checklist_Program_CCU_SPBU_COCO - Versi 3.0 2024.xlsx"
 * (sheet "Checklist CCU" untuk item, skala & bobot item; sheet "Rekap Score" untuk
 * bobot aspek). Jangan ubah manual tanpa file sumber.
 * - section.formula 'sum' (XIII): skor = jumlah nilai tanpa normalisasi N/A (sesuai Excel).
 * - section.toggle (XIV Bright Store, XV Subsidi Tepat): baris "Bila tidak ada … diberikan nilai A".
 * - XIV memakai parts (XIV.1–XIV.3); skor = rata-rata skor part + skor toggle.
 */
export const CCU_FORM_CODE = 'F12/CCU-SPBU/R1/2024'
export const CCU_TITLE = 'STANDART CHECKLIST CROSS CHECK UP (CCU) SPBU COCO'
export const CCU_COMPANY = 'PT PERTAMINA RETAIL'
export const CCU_INFO_UMUM = [
  'Semua pertanyaan pada checklist wajib di isi sesuai dengan kondisi di lapangan',
  'Setiap Observer wajib melaporkan hasil kunjungan kepada Officer Fuel Operation Controller',
  'Jadwal pelaksanaan Program CCU ditentukan oleh Officer Fuel Operation Controller',
  'Periode pelaksanaan CCU selama 2 (dua) bulan sekali',
  'Apabila ada temuan lain di lapangan silahkan di tuliskan pada kolom yang tersedia di atas',
]
export const CCU_SECTIONS = [
 {
  "code": "I",
  "title": "KONSISTENSI PENERAPAN PROGRAM 5R DI AREA SPBU",
  "bobot": 0.15,
  "groups": [
   {
    "code": null,
    "title": null,
    "items": [
     {
      "code": "I.1",
      "no": 1,
      "desc": "Penerapan 5R di Area Pelayanan Konsumen",
      "scale": "A/C/F",
      "weight": 6.666666666666667
     },
     {
      "code": "I.2",
      "no": 2,
      "desc": "Penerapan 5R di Area Bongkar & Tangki Pendam",
      "scale": "A/C/F",
      "weight": 6.666666666666667
     },
     {
      "code": "I.3",
      "no": 3,
      "desc": "Penerapan 5R di Area Fasilitas Umum",
      "scale": "A/C/F",
      "weight": 6.666666666666667
     },
     {
      "code": "I.4",
      "no": 4,
      "desc": "Penerapan 5R di Area Panel & Genset SPBU",
      "scale": "A/C/F",
      "weight": 6.666666666666667
     },
     {
      "code": "I.5",
      "no": 5,
      "desc": "Penerapan 5R di Area Bright Store/Café",
      "scale": "A/C/F/X",
      "weight": 6.666666666666667
     },
     {
      "code": "I.6",
      "no": 6,
      "desc": "Penerapan 5R di Area Masuk & Keluar SPBU",
      "scale": "A/C/F",
      "weight": 6.666666666666667
     },
     {
      "code": "I.7",
      "no": 7,
      "desc": "Penerapan 5R di Area Tenant NFR",
      "scale": "A/C/F",
      "weight": 6.666666666666667
     },
     {
      "code": "I.8",
      "no": 8,
      "desc": "Penerapan 5R di Area Ruangan Kantor SPBU",
      "scale": "A/C/F",
      "weight": 6.666666666666667
     },
     {
      "code": "I.9",
      "no": 9,
      "desc": "Penerapan 5R di Area Sistem SPBU",
      "scale": "A/C/F",
      "weight": 6.666666666666667
     },
     {
      "code": "I.10",
      "no": 10,
      "desc": "Penerapan 5R di Area Penunjang Lainnya",
      "scale": "A/C/F",
      "weight": 6.666666666666667
     },
     {
      "code": "I.11",
      "no": 11,
      "desc": "Konsistensi Pengisian Checklist Harian 5R SPBU",
      "scale": "A/C/F",
      "weight": 6.666666666666667
     },
     {
      "code": "I.12",
      "no": 12,
      "desc": "Petugas SPBU memahami Program 5R",
      "scale": "A/C/F",
      "weight": 6.666666666666667
     },
     {
      "code": "I.13",
      "no": 13,
      "desc": "Terdapat prosedur 5R di setiap area di SPBU",
      "scale": "A/C/F",
      "weight": 6.666666666666667
     },
     {
      "code": "I.14",
      "no": 14,
      "desc": "Terdapat Score CCU di kantor SPBU",
      "scale": "A/C/F",
      "weight": 6.666666666666667
     },
     {
      "code": "I.15",
      "no": 15,
      "desc": "Terdapat Score Service Excellent di kantor SPBU",
      "scale": "A/C/F",
      "weight": 6.666666666666667,
      "ket": "Score Beresin SPBU"
     }
    ]
   }
  ]
 },
 {
  "code": "II",
  "title": "PENGECEKAN ASPEK HSSE",
  "bobot": 0.12,
  "groups": [
   {
    "code": null,
    "title": null,
    "items": [
     {
      "code": "II.1",
      "no": 1,
      "desc": "Petugas SPBU memahami HSSE Golden Rules",
      "scale": "A/F",
      "weight": 6.666666666666667
     },
     {
      "code": "II.2",
      "no": 2,
      "desc": "Mekanisme Daily Check Up berjalan setiap hari (Fit to work)",
      "scale": "A/F",
      "weight": 6.666666666666667
     },
     {
      "code": "II.3",
      "no": 3,
      "desc": "Tersedia dokumen Hazard Identification di SPBU",
      "scale": "A/F",
      "weight": 6.666666666666667
     },
     {
      "code": "II.4",
      "no": 4,
      "desc": "Tidak ada pending item pada Action Tracking Dashboard HSSE",
      "scale": "A/F",
      "weight": 6.666666666666667
     },
     {
      "code": "II.5",
      "no": 5,
      "desc": "Peralatan safety tersedia di SPBU, dalam kondisi baik dan siap digunakan.",
      "scale": "A/F",
      "weight": 6.666666666666667
     },
     {
      "code": "II.6",
      "no": 6,
      "desc": "APAR/APAB tidak habis masa kadaluarsanya",
      "scale": "A/F",
      "weight": 6.666666666666667
     },
     {
      "code": "II.7",
      "no": 7,
      "desc": "Saat proses pengisian BBM Operator memasang stick cone",
      "scale": "A/F",
      "weight": 6.666666666666667
     },
     {
      "code": "II.8",
      "no": 8,
      "desc": "Saat proses pengisian BBM Operator memastikan mesin kendaraan dimatikan",
      "scale": "A/F",
      "weight": 6.666666666666667
     },
     {
      "code": "II.9",
      "no": 9,
      "desc": "Grounding terpasang pada saat bongkar BBM",
      "scale": "A/F",
      "weight": 6.666666666666667
     },
     {
      "code": "II.10",
      "no": 10,
      "desc": "Operasional Harian SPBU sudah sesuai dengan kaidah Aspek HSSE",
      "scale": "A/F",
      "weight": 6.666666666666667
     },
     {
      "code": "II.11",
      "no": 11,
      "desc": "Seragam dan safety shoes yang dikenakan oleh pekerja SPBU",
      "scale": "A/F",
      "weight": 6.666666666666667
     },
     {
      "code": "II.12",
      "no": 12,
      "desc": "Rambu-rambu HSSE dan marka jalan tersedia dan tidak pudar/ kusam",
      "scale": "A/C/F",
      "weight": 6.666666666666667
     },
     {
      "code": "II.13",
      "no": 13,
      "desc": "Struktur OKD tersedia, di update dan disesuakan dengan kondisi terkini",
      "scale": "A/F",
      "weight": 6.666666666666667
     },
     {
      "code": "II.14",
      "no": 14,
      "desc": "Simulasi Keadaan Darurat dilakukan secara rutin dan berkala",
      "scale": "A/F",
      "weight": 6.666666666666667
     },
     {
      "code": "II.15",
      "no": 15,
      "desc": "Semua potensi resiko yang ada di SPBU telah termitigasi dengan sempurna",
      "scale": "A/F",
      "weight": 6.666666666666667
     }
    ]
   }
  ]
 },
 {
  "code": "III",
  "title": "PENGECEKAN ASPEK INFORMATION & TECHNOLOGY",
  "bobot": 0.05,
  "groups": [
   {
    "code": null,
    "title": null,
    "items": [
     {
      "code": "III.1",
      "no": 1,
      "desc": "Jaringan internet di SPBU dalam kondisi stabil",
      "scale": "A/F",
      "weight": 25.0
     },
     {
      "code": "III.2",
      "no": 2,
      "desc": "SPBU terkoneksi ke dalam dashboard Perusahaan",
      "scale": "A/F",
      "weight": 25.0
     },
     {
      "code": "III.3",
      "no": 3,
      "desc": "POS SPBU, BOS, POS Bright tersedia dan berfungsi dengan baik",
      "scale": "A/F",
      "weight": 25.0
     },
     {
      "code": "III.4",
      "no": 4,
      "desc": "Tidak ada kendala dalam penggunaan RFID, Voucher dan subsidi tepat di SPBU",
      "scale": "A/F",
      "weight": 25.0
     }
    ]
   }
  ]
 },
 {
  "code": "IV",
  "title": "PENGECEKAN ASPEK TECHNICAL",
  "bobot": 0.03,
  "groups": [
   {
    "code": null,
    "title": null,
    "items": [
     {
      "code": "IV.1",
      "no": 1,
      "desc": "Dispenser unit dapat berfungsi dengan baik, tidak ada kerusakan",
      "scale": "A/C/F",
      "weight": 20.0
     },
     {
      "code": "IV.2",
      "no": 2,
      "desc": "Area driveway dalam kondisi baik, tidak ada kerusakan yang fatal",
      "scale": "A/C/F",
      "weight": 20.0
     },
     {
      "code": "IV.3",
      "no": 3,
      "desc": "Area bongkar BBM dalam kondisi baik, tidak ada kerusakan yang fatal",
      "scale": "A/C/F",
      "weight": 20.0
     },
     {
      "code": "IV.4",
      "no": 4,
      "desc": "Tidak ada bangunan sipil di SPBU yang rusak",
      "scale": "A/C/F",
      "weight": 20.0
     },
     {
      "code": "IV.5",
      "no": 5,
      "desc": "Totem, kanopi, tiang kanopi, dsb dalam kondisi baik",
      "scale": "A/C/F",
      "weight": 20.0
     }
    ]
   }
  ]
 },
 {
  "code": "V",
  "title": "PENGECEKAN ASPEK KEUANGAN",
  "bobot": 0.05,
  "groups": [
   {
    "code": null,
    "title": null,
    "items": [
     {
      "code": "V.1",
      "no": 1,
      "desc": "Penyetoran uang penjualan dilakukan dengan mekanisme cash drop",
      "scale": "A/F",
      "weight": 14.2857
     },
     {
      "code": "V.2",
      "no": 2,
      "desc": "Tidak ada selisih setor dalam penyetoran uang secara harian di SPBU",
      "scale": "A/F",
      "weight": 14.2857
     },
     {
      "code": "V.3",
      "no": 3,
      "desc": "Hasil sidak Cash opname di Bright Store tidak ditemukan adanya selisih",
      "scale": "A/F",
      "weight": 14.2857
     },
     {
      "code": "V.4",
      "no": 4,
      "desc": "Penginputan setoran tunai BOS, baik SPBU/Bright dilakukan Max. H+1",
      "scale": "A/F",
      "weight": 14.2857
     },
     {
      "code": "V.5",
      "no": 5,
      "desc": "Semua nota/bon realisasi PC, valid dan bisa dipertanggung jawabkan",
      "scale": "A/F",
      "weight": 14.2857
     },
     {
      "code": "V.6",
      "no": 6,
      "desc": "Dokumen verifikasi harian SPBU telah di review dan di tanda tangani BUH",
      "scale": "A/F",
      "weight": 14.2857
     },
     {
      "code": "V.7",
      "no": 7,
      "desc": "Arsiparis keuangan tertata rapi dan terdokumentasi softcopy/hardcopy",
      "scale": "A/F",
      "weight": 14.2857
     }
    ]
   }
  ]
 },
 {
  "code": "VI",
  "title": "PENGECEKAN ASPEK MARKETING",
  "bobot": 0.03,
  "groups": [
   {
    "code": null,
    "title": null,
    "items": [
     {
      "code": "VI.1",
      "no": 1,
      "desc": "Pemasangan spanduk sesuai pada tempatnya dan rapi",
      "scale": "A/F",
      "weight": 20.0
     },
     {
      "code": "VI.2",
      "no": 2,
      "desc": "Materi publikasi yang terpasang secara estetika layak",
      "scale": "A/F",
      "weight": 20.0
     },
     {
      "code": "VI.3",
      "no": 3,
      "desc": "Petugas mengetahui Program Promo yang sedang berjalan",
      "scale": "A/C/F",
      "weight": 20.0
     },
     {
      "code": "VI.4",
      "no": 4,
      "desc": "Petugas menawarkan Program Promo kepada konsumen",
      "scale": "A/C/F",
      "weight": 20.0
     },
     {
      "code": "VI.5",
      "no": 5,
      "desc": "Terdapat materi promosi terhadap program yang sedang berjalan",
      "scale": "A/F",
      "weight": 20.0
     }
    ]
   }
  ]
 },
 {
  "code": "VII",
  "title": "PENGECEKAN ASPEK HUMAN RESOURCE",
  "bobot": 0.04,
  "groups": [
   {
    "code": null,
    "title": null,
    "items": [
     {
      "code": "VII.1",
      "no": 1,
      "desc": "Situasi & suasana kerja di SPBU cenderung kondusif dan harmonis",
      "scale": "A/F",
      "weight": 16.6667
     },
     {
      "code": "VII.2",
      "no": 2,
      "desc": "Petugas SPBU mengikuti training dalam kurun waktu 3 bulan terakhir",
      "scale": "A/F",
      "weight": 16.6667
     },
     {
      "code": "VII.3",
      "no": 3,
      "desc": "BUH telah melakukan sosialisasi AKHLAK Min. 1x sehari secara rutin",
      "scale": "A/F",
      "weight": 16.6667
     },
     {
      "code": "VII.4",
      "no": 4,
      "desc": "Petugas SPBU telah menampilkan AKHLAK dalam prilaku sehari-sehari",
      "scale": "A/C/F",
      "weight": 16.6667
     },
     {
      "code": "VII.5",
      "no": 5,
      "desc": "Komposisi jumlah pekerja di SPBU sudah sesuai",
      "scale": "A/F",
      "weight": 16.6667
     },
     {
      "code": "VII.6",
      "no": 6,
      "desc": "Petugas mempunyai skill yang memadai (sampling 5 org)",
      "scale": "A/C/F",
      "weight": 16.6667
     }
    ]
   }
  ]
 },
 {
  "code": "VIII",
  "title": "PENGECEKAN ASPEK OPERASIONAL SPBU",
  "bobot": 0.1,
  "groups": [
   {
    "code": null,
    "title": null,
    "items": [
     {
      "code": "VIII.1",
      "no": 1,
      "desc": "Antrian pengisian BBM tidak sampai ke jalan raya",
      "scale": "A/F",
      "weight": 11.1111
     },
     {
      "code": "VIII.2",
      "no": 2,
      "desc": "Akses menuju jalur red carpet bebas dari hambatan",
      "scale": "A/F",
      "weight": 11.1111
     },
     {
      "code": "VIII.3",
      "no": 3,
      "desc": "Petugas menjalankan SOP Pelayanan dengan baik",
      "scale": "A/C/F",
      "weight": 11.1111
     },
     {
      "code": "VIII.4",
      "no": 4,
      "desc": "Akses menuju Bright Store dan tenant lain bebas hambatan",
      "scale": "A/F",
      "weight": 11.1111
     },
     {
      "code": "VIII.5",
      "no": 5,
      "desc": "Parkir kendaraan tidak menghambat mobilisasi kendaraan lain",
      "scale": "A/F",
      "weight": 11.1111
     },
     {
      "code": "VIII.6",
      "no": 6,
      "desc": "Tersedia dashboard performance SPBU dan selalu di update",
      "scale": "A/F",
      "weight": 11.1111
     },
     {
      "code": "VIII.7",
      "no": 7,
      "desc": "Pengawas, Admin, Ka. Shift memahami dashboard performance SPBU",
      "scale": "A/F",
      "weight": 11.1111
     },
     {
      "code": "VIII.8",
      "no": 8,
      "desc": "Driveway tampak bersih, mengkilap, marka jalan jelas dan tidak rusak",
      "scale": "A/C/F",
      "weight": 11.1111
     },
     {
      "code": "VIII.9",
      "no": 9,
      "desc": "Koordinasi berjalan rutin dengan SBM dan RSH",
      "scale": "A/F",
      "weight": 11.1111
     }
    ]
   }
  ]
 },
 {
  "code": "IX",
  "title": "PENGECEKAN ASPEK LEGAL",
  "bobot": 0.05,
  "groups": [
   {
    "code": null,
    "title": null,
    "items": [
     {
      "code": "IX.1",
      "no": 1,
      "desc": "Dokumen UKL UPL tersedia dan tersimpan rapi",
      "scale": "A/F",
      "weight": 8.3333
     },
     {
      "code": "IX.2",
      "no": 2,
      "desc": "Dokumen Layout SPBU tersedia dan tersimpan rapi",
      "scale": "A/F",
      "weight": 8.3333
     },
     {
      "code": "IX.3",
      "no": 3,
      "desc": "Dokumen IMB/PBG tersedia dan tersimpan rapi",
      "scale": "A/F",
      "weight": 8.3333
     },
     {
      "code": "IX.4",
      "no": 4,
      "desc": "Dokumen Izin Usaha dan Izin Prinsip tersedia dan tersimpan rapi",
      "scale": "A/F",
      "weight": 8.3333
     },
     {
      "code": "IX.5",
      "no": 5,
      "desc": "Dokumen kontrak NFR tersedia dan tersimpan rapi",
      "scale": "A/F",
      "weight": 8.3333
     },
     {
      "code": "IX.6",
      "no": 6,
      "desc": "Dokumen Izin Peruntukan Penggunaan Tanah (IPPT) tersedia dan tersimpan rapi",
      "scale": "A/F",
      "weight": 8.3333
     },
     {
      "code": "IX.7",
      "no": 7,
      "desc": "Dokumen Izin Pemanfaatan Ruang (IPR)/ IPPR tersedia dan tersimpan rapi",
      "scale": "A/F",
      "weight": 8.3333
     },
     {
      "code": "IX.8",
      "no": 8,
      "desc": "Dokumen Izin Pemanfaatan Air tersedia dan tersimpan rapi",
      "scale": "A/F",
      "weight": 8.3333
     },
     {
      "code": "IX.9",
      "no": 9,
      "desc": "Dokumen Rekomendasi/ Hasil Penilaian UKL/UPL tersedia dan tersimpan rapi",
      "scale": "A/F",
      "weight": 8.3333
     },
     {
      "code": "IX.10",
      "no": 10,
      "desc": "Dokumen SHGB/ SHM tersedia dan tersimpan rapi",
      "scale": "A/F",
      "weight": 8.3333
     },
     {
      "code": "IX.11",
      "no": 11,
      "desc": "Dokumen Analisis Dampak Lalu Lintas (Andalalin) tersedia dan tersimpan rapi",
      "scale": "A/F",
      "weight": 8.3333
     },
     {
      "code": "IX.12",
      "no": 12,
      "desc": "Dokumen Tindak Lanjut Kajian Manajemen & Rekayasa Lalin tersedia",
      "scale": "A/F",
      "weight": 8.3333
     }
    ]
   }
  ]
 },
 {
  "code": "X",
  "title": "PENGECEKAN ASSET SPBU",
  "bobot": 0.04,
  "groups": [
   {
    "code": null,
    "title": null,
    "items": [
     {
      "code": "X.1",
      "no": 1,
      "desc": "Semua aset di SPBU sudah tercatat & terdaftar di dalam AMS",
      "scale": "A/F",
      "weight": 25.0
     },
     {
      "code": "X.2",
      "no": 2,
      "desc": "Tidak terdapat aset scrap yg belum diajukan FUPP",
      "scale": "A/F",
      "weight": 25.0
     },
     {
      "code": "X.3",
      "no": 3,
      "desc": "Semua aset di SPBU telah memiliki label barcode",
      "scale": "A/F",
      "weight": 25.0
     },
     {
      "code": "X.4",
      "no": 4,
      "desc": "Semua aset di SPBU terpelihara dengan baik",
      "scale": "A/F",
      "weight": 25.0
     }
    ]
   }
  ]
 },
 {
  "code": "XI",
  "title": "PENGECEKAN CUSTOMER FOCUS DI SPBU",
  "bobot": 0.06,
  "groups": [
   {
    "code": null,
    "title": null,
    "items": [
     {
      "code": "XI.1",
      "no": 1,
      "desc": "Tidak ada konsumen yang mengeluhkan terkait pelayanan di SPBU",
      "scale": "A/F",
      "weight": 8.3333
     },
     {
      "code": "XI.2",
      "no": 2,
      "desc": "Tersedia QR Code Digital Customer Survey di setiap Pulau Pompa",
      "scale": "A/F",
      "weight": 8.3333,
      "ket": "belum terdapat standard"
     },
     {
      "code": "XI.3",
      "no": 3,
      "desc": "Tersedia QR Code Digital Customer Survey di Area Bright Store/Café",
      "scale": "A/F",
      "weight": 8.3333
     },
     {
      "code": "XI.4",
      "no": 4,
      "desc": "Pengawas & Ka. Shift memahami tatacara handling customer complain",
      "scale": "A/F",
      "weight": 8.3333
     },
     {
      "code": "XI.5",
      "no": 5,
      "desc": "Petugas menawarkan pengisian QR Code DCS kepada konsumen",
      "scale": "A/C/F",
      "weight": 8.3333
     },
     {
      "code": "XI.6",
      "no": 6,
      "desc": "Customer Greeting secara konsisten dilakukan oleh petugas",
      "scale": "A/C/F",
      "weight": 8.3333
     },
     {
      "code": "XI.7",
      "no": 7,
      "desc": "Konsumen di SPBU merasa puas di SPBU (sampling 5 konsumen)",
      "scale": "A-F",
      "weight": 8.3333
     },
     {
      "code": "XI.8",
      "no": 8,
      "desc": "Marshalling di SPBU berjalan cukup efektif",
      "scale": "A/F",
      "weight": 8.3333
     },
     {
      "code": "XI.9",
      "no": 9,
      "desc": "Semua keluhan pelanggan melalui 135 sudah terselesaikan baik",
      "scale": "A/F",
      "weight": 8.3333
     },
     {
      "code": "XI.10",
      "no": 10,
      "desc": "Konsumen mudah untuk mencari lokasi SPBU melalui Google Maps",
      "scale": "A/F",
      "weight": 8.3333
     },
     {
      "code": "XI.11",
      "no": 11,
      "desc": "Nomor telpon SPBU yang terdaftar dalam Google berstatus aktif",
      "scale": "A/F",
      "weight": 8.3333
     },
     {
      "code": "XI.12",
      "no": 12,
      "desc": "Penangganan keluhan pelanggan di Area SPBU sudah cukup baik",
      "scale": "A/F",
      "weight": 8.3333
     }
    ]
   }
  ]
 },
 {
  "code": "XII",
  "title": "PENGECEKAN RISK MANAGEMENT DI SPBU",
  "bobot": 0.06,
  "groups": [
   {
    "code": null,
    "title": null,
    "items": [
     {
      "code": "XII.1",
      "no": 1,
      "desc": "Semua potensi resiko di SPBU termitigasi dengan baik dan tercatat",
      "scale": "A/F",
      "weight": 20.0
     },
     {
      "code": "XII.2",
      "no": 2,
      "desc": "Semua potensi resiko di SPBU dikelola dengan baik",
      "scale": "A/F",
      "weight": 20.0
     },
     {
      "code": "XII.3",
      "no": 3,
      "desc": "Petugas mengetahui adanya potensi resiko di SPBU (Sampling 5 orang)",
      "scale": "A-F",
      "weight": 20.0
     },
     {
      "code": "XII.4",
      "no": 4,
      "desc": "SPBU secara rutin melaporkan pengelolaan resiko kepada tim HO",
      "scale": "A/F",
      "weight": 20.0
     },
     {
      "code": "XII.5",
      "no": 5,
      "desc": "SPBU mempunyai TOP 3 Priority resiko",
      "scale": "A/F",
      "weight": 20.0
     }
    ]
   }
  ]
 },
 {
  "code": "XIII",
  "title": "PENGECEKAN DIGITAL CAMPAIGN SPBU",
  "bobot": 0.07,
  "groups": [
   {
    "code": null,
    "title": null,
    "items": [
     {
      "code": "XIII.1",
      "no": 1,
      "desc": "SPBU mempunyai akun Social Media (Email, Instagram, Youtube, TikTok)",
      "scale": "A/F",
      "weight": 11.1111
     },
     {
      "code": "XIII.2",
      "no": 2,
      "desc": "Titik koordinat SPBU telah terdaftar dalam Google Maps",
      "scale": "A/F",
      "weight": 11.1111
     },
     {
      "code": "XIII.3",
      "no": 3,
      "desc": "Konten Social Media SPBU berisi hal-hal yang bersifat positif & menarik",
      "scale": "A-F",
      "weight": 11.1111
     },
     {
      "code": "XIII.4",
      "no": 4,
      "desc": "Min. 50% dari total jumlah pekerja SPBU mempunyai akun Sosmed",
      "scale": "A/C/F",
      "weight": 11.1111
     },
     {
      "code": "XIII.5",
      "no": 5,
      "desc": "Tidak ada komentar Negatif di dalam Akun Sosmed & Google Review",
      "scale": "A/C/F",
      "weight": 11.1111
     },
     {
      "code": "XIII.6",
      "no": 6,
      "desc": "Mekanisme Positive Vibes dijalankan dalam Sosmed & Google Review",
      "scale": "A/F",
      "weight": 11.1111
     },
     {
      "code": "XIII.7",
      "no": 7,
      "desc": "SPBU merilis konten Social Media Min. 2x dalam satu bulan",
      "scale": "A/F",
      "weight": 11.1111
     },
     {
      "code": "XIII.8",
      "no": 8,
      "desc": "Konten yang dirilis bersifat edukatif dan informatif",
      "scale": "A/F",
      "weight": 11.1111
     },
     {
      "code": "XIII.9",
      "no": 9,
      "desc": "Terdapat PIC khusus yang mengelola Akun Sosmed & Google Review",
      "scale": "A/F",
      "weight": 11.1111
     }
    ]
   }
  ],
  "formula": "sum"
 },
 {
  "code": "XIV",
  "title": "PENGECEKAN UNIT BISNIS BRIGHT STORE",
  "bobot": 0.05,
  "groups": [],
  "toggle": {
   "label": "Bila tidak ada Bright Store/Cafe diberikan nilai \"A\"",
   "weight": 100.0
  },
  "parts": [
   {
    "code": "XIV.1",
    "title": "Pemenuhan Barang",
    "groups": [
     {
      "code": "XIV.1.1",
      "title": "Permintaan Barang",
      "items": [
       {
        "code": "XIV.1.1.1",
        "no": 1,
        "desc": "Pengecekan Auto PB oleh SA pada BPOS dan Pengajuan Store Complain",
        "scale": "A/F",
        "weight": 9.09
       },
       {
        "code": "XIV.1.1.2",
        "no": 2,
        "desc": "Jika terdapat tambahan PB, terdapat rekapitulasi permintaan barang tambahan di luar Auto PB sesuai dengan kebutuhan toko",
        "scale": "A/F",
        "weight": 9.091
       },
       {
        "code": "XIV.1.1.3",
        "no": 3,
        "desc": "Terdapat PO untuk produk BKL (roti)  sesuai dengan jadwal dan diberi catatan apabila tidak ada pemesanan",
        "scale": "A/F",
        "weight": 9.091
       }
      ]
     },
     {
      "code": "XIV.1.2",
      "title": "Varian dan Jumlah produk",
      "items": [
       {
        "code": "XIV.1.2.1",
        "no": 1,
        "desc": "Produk yang didisplay sesuai dengan varian dan qty minimal berdasarkan planogram mengacu ketersediaan barang yang ada di toko",
        "scale": "A/F",
        "weight": 9.091
       },
       {
        "code": "XIV.1.2.2",
        "no": 2,
        "desc": "Terdapatnya laporan stockout atas kekurangan varian dan jumlah qty produk sesuai dengan planogram yang diisi setiap hari kerja",
        "scale": "A/F",
        "weight": 9.091
       },
       {
        "code": "XIV.1.2.3",
        "no": 3,
        "desc": "Terdapatnya form monitoring kinerja dari % implemented planogram yang terisi setiap hari",
        "scale": "A/F",
        "weight": 9.091
       }
      ]
     },
     {
      "code": "XIV.1.3",
      "title": "Konsistensi Pelaporan Administrasi",
      "items": [
       {
        "code": "XIV.1.3.1",
        "no": 1,
        "desc": "Terdapatnya BA (berita acara) dari SO General yang dilaksanakan setiap bulan yang telah ditandatangani minimal 2 pihak",
        "scale": "A/F",
        "weight": 9.091
       },
       {
        "code": "XIV.1.3.2",
        "no": 2,
        "desc": "Terdapatnya form rekapitulasi waste, BA waste produk (apabila ditemukan barang rusak, expired, dsb pada saat SO), dan foto mutasi waste pada sistem",
        "scale": "A/F",
        "weight": 9.091
       },
       {
        "code": "XIV.1.3.3",
        "no": 3,
        "desc": "Terdapat administrasi proses disposal untuk barang waste yang telah disetujui oleh RSH",
        "scale": "A/F",
        "weight": 9.091
       },
       {
        "code": "XIV.1.3.4",
        "no": 4,
        "desc": "Terdapatnya form checklist terkait SO Parsial (cycle count) toko",
        "scale": "A/F",
        "weight": 9.091
       },
       {
        "code": "XIV.1.3.5",
        "no": 5,
        "desc": "Terdapatnya form terkait pengajuan promo barang mendekati expired",
        "scale": "A/F",
        "weight": 9.091
       }
      ]
     }
    ]
   },
   {
    "code": "XIV.2",
    "title": "Tampilan Toko",
    "groups": [
     {
      "code": "XIV.2.1",
      "title": "Tampilan Fisik Eksterior",
      "items": [
       {
        "code": "XIV.2.1.1",
        "no": 1,
        "desc": "Neon box bersih dan berfungsi baik (tidak tampak kerusakan secara visual, lampu menyala, tidak kotor, dan tidak kusam)",
        "scale": "A/F",
        "weight": 4.0
       },
       {
        "code": "XIV.2.1.2",
        "no": 2,
        "desc": "Pintu masuk berfungsi baik, kaca bersih, tempelan sticker tidak menghalangi pandangan ke dalam toko",
        "scale": "A/F",
        "weight": 4.0
       },
       {
        "code": "XIV.2.1.3",
        "no": 3,
        "desc": "Terdapat keset dan tempat sampah yang berada dalam kondisi bersih dan tidak dalam kondisi penuh (sampah tidak berceceran)",
        "scale": "A/F",
        "weight": 4.0
       }
      ]
     },
     {
      "code": "XIV.2.2",
      "title": "Tampilan Fisik Interior",
      "items": []
     },
     {
      "code": "XIV.2.2.1",
      "title": "Area Kasir",
      "items": [
       {
        "code": "XIV.2.2.1.1",
        "no": 1,
        "desc": "Meja kasir bersih, rapi dan tidak berdebu. Display & material promosi diletakan sesuai ketentuan",
        "scale": "A/F",
        "weight": 4.0
       },
       {
        "code": "XIV.2.2.1.2",
        "no": 2,
        "desc": "Struk kasir dan plastik belanja (tas spunbound) tersedia pada tempatnya, serta uang kecil tersedia dan tersimpan rapi pada cash drawer",
        "scale": "A/F",
        "weight": 4.0
       },
       {
        "code": "XIV.2.2.1.3",
        "no": 3,
        "desc": "Mesin cash drawer, mesin EDC, dan UPS dalam kondisi aktif dan berfungsi sebagaimana mestinya",
        "scale": "A/F",
        "weight": 4.0
       },
       {
        "code": "XIV.2.2.1.4",
        "no": 4,
        "desc": "Bila ada musik, suara tidak mendominasi saat terjadi percakapan dalam radius jarak ± 2 m dan isi materi (list lagu) sesuai ketentuan yang berlaku dari Bright",
        "scale": "A/F",
        "weight": 4.0
       }
      ]
     },
     {
      "code": "XIV.2.2.2",
      "title": "Selling Area",
      "items": [
       {
        "code": "XIV.2.2.2.1",
        "no": 1,
        "desc": "Display sesuai planogram\nFEFO (first expired first out) dan brand menghadap ke depan",
        "scale": "A/F",
        "weight": 4.0
       },
       {
        "code": "XIV.2.2.2.2",
        "no": 2,
        "desc": "Price card & price rail terpasang sesuai ketentuan (posisi di sebelah kiri produk) dan harga sama dengan sistem. (Khusus untuk chiller dan freezer diperbolehkan untuk menyesuaikan dengan luasan price rail)",
        "scale": "A/F",
        "weight": 4.0
       },
       {
        "code": "XIV.2.2.2.3",
        "no": 3,
        "desc": "Barang display layak jual dan layak digunakan konsumen (tidak expired, kemasan baik, dan tidak berdebu)",
        "scale": "A/F",
        "weight": 4.0
       },
       {
        "code": "XIV.2.2.2.4",
        "no": 4,
        "desc": "Barang floor display tidak menghalangi akses konsumen di selling area (traffic customer) dan berada dalam kondisi teratur",
        "scale": "A/F",
        "weight": 4.0
       },
       {
        "code": "XIV.2.2.2.5",
        "no": 5,
        "desc": "Lantai bersih, bebas dari sampah, dan tidak terdapat perubahan warna yang disebabkan oleh produk kimia",
        "scale": "A/F",
        "weight": 4.0
       },
       {
        "code": "XIV.2.2.2.6",
        "no": 6,
        "desc": "Shelving, dan kolong rak bersih dari debu dan kotoran",
        "scale": "A/C/F",
        "weight": 4.0
       },
       {
        "code": "XIV.2.2.2.7",
        "no": 7,
        "desc": "Lampu di area sales, area kasir, chiller, dan/atau warmer menyala dan berfungsi dengan baik",
        "scale": "A/F",
        "weight": 4.0
       },
       {
        "code": "XIV.2.2.2.8",
        "no": 8,
        "desc": "AC, chiller, dispenser, freezer dan/atau warmer berfungsi dengan baik",
        "scale": "A/F",
        "weight": 4.0
       },
       {
        "code": "XIV.2.2.2.9",
        "no": 9,
        "desc": "AC, chiller, dispenser, freezer dan/atau warmer berada dalam kondisi bersih",
        "scale": "A/F",
        "weight": 4.0
       },
       {
        "code": "XIV.2.2.2.10",
        "no": 10,
        "desc": "Jika terdapat toilet di dalam Bright Store, toilet dan wastafel dalam kondisi bersih, rapi, tidak tercium bau tidak sedap, serta terpelihara baik (tidak ada kerusakan yang terlihat pada perangkat utama toilet seperti: dinding, pintu, jendela, gantungan, gagang pintu, dan kunci)",
        "scale": "A/F",
        "weight": 4.0
       },
       {
        "code": "XIV.2.2.2.11",
        "no": 11,
        "desc": "Tersedia minimal 1 buah alat pemadam api di dalam area Bright Store dengan kondisi layak digunakan (tidak expired, tidak rusak, tidak bocor)",
        "scale": "A/F",
        "weight": 4.0
       }
      ]
     },
     {
      "code": "XIV.2.2.3",
      "title": "Area Gudang",
      "items": [
       {
        "code": "XIV.2.2.3.1",
        "no": 1,
        "desc": "Terdapat segmentasi dari barang waste, food & non food yang diletakan sesuai dengan ketentuan",
        "scale": "A/F",
        "weight": 4.0
       },
       {
        "code": "XIV.2.2.3.2",
        "no": 2,
        "desc": "Barang di luar good stock (barang return & waste), serta barang alokasi antar toko terdata dan difollow up",
        "scale": "A/F",
        "weight": 4.0
       }
      ]
     },
     {
      "code": "XIV.2.2.4",
      "title": "Visual Promosi",
      "items": [
       {
        "code": "XIV.2.2.4.1",
        "no": 1,
        "desc": "Terdapat promotion tag (harga coret), dan media promosi (banner/ wobbler/poster) diletakan sesuai dengan ketentuan setelah media promo diterima di toko selama periode promosi",
        "scale": "A/F",
        "weight": 4.0
       },
       {
        "code": "XIV.2.2.4.2",
        "no": 2,
        "desc": "Rak promosi diletakkan sesuai dengan ketentuan gondola promosi",
        "scale": "A/F",
        "weight": 4.0
       }
      ]
     },
     {
      "code": "XIV.2.3",
      "title": "Additional Facilities & Product Offering",
      "items": [
       {
        "code": "XIV.2.3.1",
        "no": 1,
        "desc": "Tersedia fasilitas Top Up E-Wallet dan fasilitas penukaran voucher**",
        "scale": "A/F",
        "weight": 4.0
       },
       {
        "code": "XIV.2.3.2",
        "no": 2,
        "desc": "Tersedia gondola khusus Merchandise Official Pertamina**",
        "scale": "A/F",
        "weight": 4.0
       },
       {
        "code": "XIV.2.3.3",
        "no": 3,
        "desc": "Tersedia layanan & perlengkapan food service atau Café in Store**",
        "scale": "A/F",
        "weight": 4.0
       }
      ]
     }
    ]
   },
   {
    "code": "XIV.3",
    "title": "Staf Terlatih, Peduli dan Termotivasi",
    "groups": [
     {
      "code": "XIV.3.1",
      "title": "Customer Oriented",
      "items": [
       {
        "code": "XIV.3.1.1",
        "no": 1,
        "desc": "Sapaan selamat datang terdengar pada saat customer masuk, dan SA toko aktif melakukan 3S (Senyum, Sapa, Salam) serta melakukan penawaran produk terutama produk food service/item promosi ke customer pada saat proses pembayaran dan interaktif apabila terdapat pertanyaan dari customer",
        "scale": "A/F",
        "weight": 14.28571
       },
       {
        "code": "XIV.3.1.2",
        "no": 2,
        "desc": "Seluruh SA berpenampilan rapi (untuk pria: berambut pendek dan disisir rapi, untuk wanita: rambut diikat apabila lebih panjang dari bahu, bermake-up natural), seluruh petugas berkuku pendek dan tidak berbau tidak sedap",
        "scale": "A/F",
        "weight": 14.28571
       },
       {
        "code": "XIV.3.1.3",
        "no": 3,
        "desc": "Seluruh SA memakai seragam sesuai ketentuan, kondisi bersih dan memakai ID card (dalam kondisi baik) di bagian badan bagian atas",
        "scale": "A/F",
        "weight": 14.28571
       }
      ]
     },
     {
      "code": "XIV.3.2",
      "title": "Operation Readines",
      "items": [
       {
        "code": "XIV.3.2.1",
        "no": 1,
        "desc": "SA melakukan daily monitoring good sold dan produk melewati shelf life display untuk produk food service",
        "scale": "A/F",
        "weight": 14.28571
       },
       {
        "code": "XIV.3.2.2",
        "no": 2,
        "desc": "SA menjalankan prosedur penanganan cash handling dan administrasinya",
        "scale": "A/F",
        "weight": 14.28571
       },
       {
        "code": "XIV.3.2.3",
        "no": 3,
        "desc": "Terdapat dokumentasi penerimaan barang secara sistem dan fisik sesuai dengan ketentuan, terdapat rekap durasi pelaksanaan penerimaan barang (dari loading in sampai dengan complete receive)",
        "scale": "A/F",
        "weight": 14.28571
       },
       {
        "code": "XIV.3.2.4",
        "no": 4,
        "desc": "SA dapat menjelaskan promo aktif hari ini",
        "scale": "A/F",
        "weight": 14.28571
       }
      ]
     }
    ]
   }
  ]
 },
 {
  "code": "XV",
  "title": "PENGECEKAN SUBSIDI TEPAT DI SPBU",
  "bobot": 0.1,
  "groups": [
   {
    "code": null,
    "title": null,
    "items": [
     {
      "code": "XV.1",
      "no": 1,
      "desc": "Terdapat petugas JBT Monev spv di lokasi",
      "scale": "A/F",
      "weight": 14.286
     },
     {
      "code": "XV.2",
      "no": 2,
      "desc": "Perangkat POS dan CCTV untuk monitoring JBT berfungsi dengan baik",
      "scale": "A/F",
      "weight": 14.286
     },
     {
      "code": "XV.3",
      "no": 3,
      "desc": "Penempatan CCTV sudah mengarah sisi depan dan belakang kendaraan",
      "scale": "A/F",
      "weight": 14.286
     },
     {
      "code": "XV.4",
      "no": 4,
      "desc": "Terdapat laporan pengecekan JBT dan selalu di update",
      "scale": "A/F",
      "weight": 14.286
     },
     {
      "code": "XV.5",
      "no": 5,
      "desc": "Tidak terdapat temuan penyalahgunaan BBM JBT",
      "scale": "A/F",
      "weight": 14.286
     },
     {
      "code": "XV.6",
      "no": 6,
      "desc": "Hasil temuan dilapangan sudah ditindak lanjuti sesuai dengan prosedur",
      "scale": "A/F",
      "weight": 14.286
     },
     {
      "code": "XV.7",
      "no": 7,
      "desc": "Pramuniaga memastikan QR Code JBT sesuai dengan Nopol dan jenis kendaraan",
      "scale": "A/F",
      "weight": 14.286
     }
    ]
   }
  ],
  "toggle": {
   "label": "Bila tidak ada JBT diberikan nilai \"A\"",
   "weight": 100.0
  }
 }
]
