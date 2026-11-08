# Catatan Verifikasi Akurasi

Tanggal pemeriksaan: 8 November 2026.

## Cara pemeriksaan

- Pemeriksaan dilakukan oleh **4 subagent terpisah** yang tidak ikut membuat soal dan tidak melihat proses pembuatannya. Masing-masing diminta mencari sendiri fakta di `sumber/` tanpa memercayai field `pembahasan` atau `sumber` pada soal, lalu memberi status **benar / salah / ragu** beserta kutipan bukti.
- Sampel yang dicek:
  - **semua** soal yang memuat angka, nomor pasal, jumlah, tahun, tanggal, atau eselon (252 soal);
  - **seluruh 124 soal SOTK** (bobot terbesar);
  - ditambah sampel acak dari soal lain.
- Untuk soal `di_luar_materi` (Bahasa Inggris, sebagian PUEBI/KBBI, sebagian Literasi Digital) pemeriksa mengecek kebenaran kebahasaan/pengetahuan baku dan memastikan hanya satu opsi yang benar.
- Semua soal hitungan (skor UPKP, Nilai Akhir Ujian Dinas Tk. II) dihitung ulang.

| Kelompok | Dicek | Benar | Salah | Ragu |
|---|---:|---:|---:|---:|
| SOTK | 124 | 124 | 0 | 0 |
| Renstra | 62 | 62 | 0 | 0 |
| TKT (Kepegawaian, Pelayanan Publik, Good Governance, Kebijakan Publik) | 83 | 83 | 0 | 0 |
| TWK + TKP (Pancasila, UUD, Sejarah, B. Indonesia, B. Inggris, Literasi Digital) | 107 | 107 | 0 | 0 |
| **Total** | **376 dari 561 (67%)** | **376** | **0** | **0** |

## Koreksi

**Kunci jawaban yang dikoreksi: 0.** Ada 5 perbaikan redaksi (kunci tidak berubah):

- `sejarah-008`: "tujuh kali pergantian kabinet" → "tujuh kabinet yang silih berganti" (tujuh kabinet = enam kali pergantian).
- `renstra-073`: KUHP baru disebut "perubahan regulasi", bukan "faktor eksternal", sesuai konteks Renstra.
- `renstra-069`: rujukan data WBK/WBBM diperjelas.
- `kepegawaian-029`: pembahasan diberi catatan masa peralihan Pasal 42 ayat (2) PP 94/2021.
- `sotk-043`: pembahasan tidak lagi menggeneralisasi "Subbag TU selalu di bawah subdirektorat pertama" (tidak berlaku di Dit. TI dan Kerja Sama Pemasyarakatan, Pasal 344).

Sebelum pemeriksaan, saat penyusunan juga sudah dilakukan:
- penghapusan 1 soal yang kuncinya bergantung pada penamaan "TPI Darat"/"TPI Perbatasan Darat";
- penghapusan 6 soal yang kembar makna dengan soal di topik lain;
- perpanjangan 212 pengecoh agar opsi benar tidak mudah ditebak dari panjangnya.

## Hal yang masih ragu atau perlu dicek ke sumber resmi

1. **Batas jumlah unit dan Staf Khusus** (`sotk-020` s.d. `sotk-023`): hanya bersumber dari rangkuman Pasal 7 Perpres 157/2024. Teks Perpres tidak ada di `sumber/`.
2. **Kanwil Tipe A/B dan eselonnya** (`sotk-103` s.d. `sotk-106`, `sotk-109`, `sotk-118`): hanya dari rangkuman Permen Imipas 2–5/2024. Teksnya tidak ada di `sumber/`.
3. **Pengampu arah kebijakan** (`renstra-050`): hanya terbaca dari teks Gambar 3.5 hasil ekstraksi; sebaiknya dicek visual di PDF Renstra.
4. **Teks UU 20/2023 dan PP 94/2021 berasal dari OCR** yang sebagian kalimatnya teracak. Kata kunci cocok, tetapi definisi Disiplin PNS (Pasal 1 angka 4) tidak terbaca utuh; kunci `kepegawaian-026` didukung Pasal 3.
5. **Pembahasan beberapa soal** (asas pelayanan publik, karakteristik good governance, tahap siklus kebijakan) memuat penjelasan definisi yang tidak ada di rangkuman. Sumber hanya memuat nama asas/karakteristik/tahapnya; kunci tetap pasti dari skenario soal.
6. **Ketidakkonsistenan di sumber** yang sengaja tidak dijadikan kunci soal: lihat daftar di `sumber/PETA_TOPIK.md` (penamaan bagian SDM Pasal 35/36, TPI Darat, Bagian Umum Sekretariat Itjen, nama Subdit Kerja Sama Ditjen PAS, hitungan ayat UUD, bunyi visi/misi di Gambar 3.5 Renstra, tanggal pembentukan kementerian, jumlah pegawai Ditjen Imigrasi, jumlah satker PAS, "penurunan pangkat" vs "penurunan jabatan", dan slide Kepegawaian berbasis UU 5/2014).
7. 185 soal sisanya (33%) tidak masuk sampel pemeriksaan independen. Mayoritas berupa soal konsep tanpa angka di topik yang sampelnya 100% benar.
