# Bank Soal UPKP / Penyesuaian Ijazah — Kemenimipas

Bank soal latihan untuk **Ujian Penyesuaian Kenaikan Pangkat (UPKP) / Penyesuaian Ijazah 2026** di lingkungan Kementerian Imigrasi dan Pemasyarakatan, jenjang ijazah **D3 s.d. S2** (kisi-kisi Lampiran III SE Kepala BKN Nomor 10 Tahun 2024), lengkap dengan web latihan yang bisa dipakai di HP.

- **561 soal pilihan ganda** (A–E) di 12 topik kisi-kisi, masing-masing dengan pembahasan dan rujukan sumber.
- **Web statis** di `docs/` (tanpa server/backend, siap GitHub Pages): latihan per topik, simulasi CAT 100 soal 90 menit, review kesalahan, statistik progres.
- **Validasi otomatis** (`scripts/validate`) yang dijalankan GitHub Action setiap push.

> ⚠️ **Catatan penting.** Isi soal bersumber dari **rangkuman pribadi** dan **teks peraturan resmi** yang diekstrak otomatis dari PDF. Ekstraksi bisa keliru dan peraturan bisa berubah. **Cek ke JDIH Kemenimipas atau [peraturan.bpk.go.id](https://peraturan.bpk.go.id) sebelum menjadikannya rujukan resmi.** Ringkasan pemeriksaan akurasi ada di [`CATATAN_VERIFIKASI.md`](CATATAN_VERIFIKASI.md).

## Struktur kisi-kisi UPKP (D3 s.d. S2)

Format: 100 soal, 90 menit, metode CAT BKN. Jawaban benar = 5, salah/kosong = 0 (maksimal 500). Nilai ambang batas ditetapkan PPK instansi penyelenggara, jadi di web angkanya bisa diisi sendiri.

| Tes | Materi | Soal di ujian | Soal di bank |
|---|---|---:|---:|
| TWK – Tes Wawasan Kebangsaan | Pancasila | 10 | 41 |
| | UUD 1945 | 10 | 50 |
| | Sejarah Indonesia | 5 | 31 |
| | Bahasa Indonesia | 5 | 32 |
| TKT – Tes Kompetensi Teknis | Peraturan Kepegawaian | 10 | 64 |
| | Pelayanan Publik | 5 | 27 |
| | Good Governance | 5 | 27 |
| | Kebijakan Publik | 5 | 25 |
| TSI – Tes Substansi Instansi | Renstra / RPJMD | 15 | 76 |
| | SOTK | 15 | 124 |
| TKP – Tes Kompetensi Penunjang | Bahasa Inggris | 10 | 42 |
| | Literasi Digital | 5 | 22 |
| **Total** | | **100** | **561** |

TSI (Renstra + SOTK) bernilai 30% dari total, jadi dua topik itu dibuat paling banyak dan paling dalam.

## Cara memakai web

**Lewat GitHub Pages** (bila repo dibuat public dan Pages diaktifkan dari folder `docs/` di branch `main`): buka `https://<username>.github.io/bank-soal-upkp/` di HP, lalu "Tambahkan ke Layar Utama" agar terasa seperti aplikasi.

**Di komputer sendiri** (file harus dibuka lewat server lokal, bukan klik dua kali):

```bash
python3 -m http.server 8000 --directory docs
```

lalu buka <http://localhost:8000>.

Menu:

1. **Latihan** — pilih topik, subtopik, tingkat, dan jumlah soal. Setelah memilih jawaban, kunci dan pembahasan langsung muncul. Bisa memilih "hanya soal yang belum pernah dikerjakan" dan menyembunyikan soal di luar materi.
2. **Simulasi** — 100 soal acak sesuai distribusi kisi-kisi, timer 90 menit, tombol *Simpan & Lanjutkan*, grid nomor soal (hijau = terjawab, merah = belum), skor akhir (benar × 5), perbandingan dengan ambang batas, serta skor per kategori (TWK/TKT/TSI/TKP) dan per topik. Simulasi yang terputus bisa dilanjutkan (waktu tetap berjalan).
3. **Review** — semua soal yang pernah salah (atau kosong di simulasi). Soal keluar dari daftar setelah dijawab benar.
4. **Statistik** — jumlah dikerjakan dan akurasi per topik, riwayat simulasi, serta tombol **Ekspor JSON**, **Impor JSON**, dan **Reset**.

Progres disimpan di `localStorage` browser perangkat itu saja. Gunakan Ekspor/Impor untuk pindah perangkat.

## Struktur repo

```
README.md
CATATAN_VERIFIKASI.md     hasil pemeriksaan akurasi
sumber/                   bahan rujukan dalam Markdown (lihat sumber/PETA_TOPIK.md)
data/kisi.json            distribusi soal simulasi + target minimal per topik
data/soal/*.json          bank soal, satu file per topik
docs/                     web latihan (index.html, style.css, app.js, data/bank-soal.json)
scripts/build.py          gabungkan data/soal → docs/data/bank-soal.json
scripts/validate          pemeriksaan bank soal (dipakai CI)
scripts/docx2md.py        konverter .docx → Markdown (pengganti pandoc)
.github/workflows/        GitHub Action validasi
```

Isi `sumber/`:

- Tiga rangkuman pribadi (dikonversi dari .docx).
- Teks resmi hasil ekstraksi PDF: Permen Imipas 1/2024 (Organisasi dan Tata Kerja), Permen Imipas 11/2025 (Renstra 2025–2029), SE Kepala BKN 10/2024, UU 20/2023 (ASN), PP 94/2021 (Disiplin PNS).
- Transkrip slide materi (Pancasila, UUD, Sejarah, Kepegawaian).
- `PETA_TOPIK.md`: peta topik ke bagian sumber dan daftar ketidakkonsistenan yang sengaja tidak dijadikan kunci soal.

File asli (.docx, .pdf, gambar) tidak dimasukkan ke repo.

## Format soal

Setiap file `data/soal/<topik>.json` berisi array objek:

```json
{
  "id": "sotk-001",
  "kategori": "TSI",
  "topik": "SOTK",
  "subtopik": "Dasar Hukum",
  "tingkat": "mudah",
  "pertanyaan": "…",
  "opsi": {"A": "…", "B": "…", "C": "…", "D": "…", "E": "…"},
  "jawaban": "B",
  "pembahasan": "1–3 kalimat: kenapa benar, kenapa pengecoh salah",
  "sumber": "nama file di sumber/ + bagian/pasal",
  "di_luar_materi": false
}
```

`di_luar_materi: true` menandai soal yang dibuat dari pengetahuan umum yang baku (Bahasa Inggris, sebagian PUEBI/KBBI, sebagian Literasi Digital) karena rangkuman tidak memuatnya.

## Cara menambah atau mengubah soal

1. Edit file yang sesuai di `data/soal/`. Lanjutkan penomoran `id` (mis. `sotk-125`). `topik` dan `kategori` harus sama persis dengan `data/kisi.json`.
2. Pastikan fakta ada di `sumber/` dan isi field `sumber`. Bila tidak ada di sumber, jangan buat soalnya (kecuali topik yang boleh `di_luar_materi`).
3. Sebar kunci jawaban merata A–E (validasi gagal bila satu huruf > 25% dalam satu file) dan jangan biarkan opsi benar selalu yang terpanjang.
4. Bangun ulang data web dan jalankan validasi:

   ```bash
   python3 scripts/build.py
   ```

   ```bash
   python3 scripts/validate
   ```

5. Commit perubahan `data/soal/` **dan** `docs/data/bank-soal.json` bersama-sama. GitHub Action akan gagal bila keduanya tidak sinkron.

Mengubah distribusi simulasi atau target jumlah soal cukup lewat `data/kisi.json`.

## Validasi

`scripts/validate` gagal bila ada field wajib kosong, jawaban bukan A–E, `id` atau pertanyaan duplikat, opsi tidak tepat 5 atau ada yang kembar, `sumber` kosong pada soal yang bukan `di_luar_materi`, topik/kategori tidak cocok dengan `data/kisi.json`, jumlah soal per topik di bawah target, satu huruf kunci > 25% per file, atau `docs/data/bank-soal.json` tidak sinkron. Skrip juga memberi peringatan bila opsi benar terlalu sering jauh lebih panjang dari opsi lain.

## Lisensi dan privasi

Repo ini untuk belajar pribadi. Jangan pernah menambahkan dokumen pribadi (ijazah, transkrip, SK, SKP, makalah, atau apa pun yang memuat NIP); pola-pola itu sudah diblokir di `.gitignore`.
