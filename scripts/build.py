#!/usr/bin/env python3
"""Gabungkan data/soal/*.json + data/kisi.json menjadi docs/data/bank-soal.json untuk web.

Pemakaian (dari folder repo):  python3 scripts/build.py
Tidak butuh pustaka tambahan.
"""
import datetime
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    kisi = json.load(open(os.path.join(ROOT, "data", "kisi.json"), encoding="utf-8"))
    soal = []
    for t in kisi["topik"]:
        path = os.path.join(ROOT, "data", "soal", t["file"])
        if not os.path.exists(path):
            sys.exit(f"File soal tidak ditemukan: {path}")
        isi = json.load(open(path, encoding="utf-8"))
        for s in isi:
            if s.get("topik") != t["topik"] or s.get("kategori") != t["kategori"]:
                sys.exit(f"{s.get('id')}: topik/kategori tidak cocok dengan data/kisi.json ({t['topik']}/{t['kategori']})")
        soal.extend(isi)
    out = {
        "dibangun": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "ujian": kisi["ujian"],
        "urutan_kategori": kisi["urutan_kategori"],
        "nama_kategori": kisi["nama_kategori"],
        "topik": [{k: t[k] for k in ("topik", "kategori", "jatah")} for t in kisi["topik"]],
        "soal": soal,
    }
    dst_dir = os.path.join(ROOT, "docs", "data")
    os.makedirs(dst_dir, exist_ok=True)
    dst = os.path.join(dst_dir, "bank-soal.json")
    with open(dst, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{dst}: {len(soal)} soal dari {len(kisi['topik'])} topik")


if __name__ == "__main__":
    main()
