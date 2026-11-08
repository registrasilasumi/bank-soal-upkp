#!/usr/bin/env python3
"""Konversi .docx ke Markdown sederhana (pengganti pandoc, hanya pustaka bawaan Python).

Menangani: heading (Heading1..6 / Judul), paragraf, daftar (numPr), tabel, tebal/miring.
Pemakaian: python3 scripts/docx2md.py input.docx output.md
"""
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def run_text(r):
    parts = []
    for node in r:
        tag = node.tag.replace(W, "")
        if tag == "t":
            parts.append(node.text or "")
        elif tag == "tab":
            parts.append("\t")
        elif tag in ("br", "cr"):
            parts.append(" ")
    txt = "".join(parts)
    if not txt.strip():
        return txt
    rpr = r.find(W + "rPr")
    bold = rpr is not None and rpr.find(W + "b") is not None and rpr.find(W + "b").get(W + "val") not in ("0", "false")
    ital = rpr is not None and rpr.find(W + "i") is not None and rpr.find(W + "i").get(W + "val") not in ("0", "false")
    lead = txt[: len(txt) - len(txt.lstrip())]
    trail = txt[len(txt.rstrip()):]
    core = txt.strip()
    if bold:
        core = f"**{core}**"
    if ital:
        core = f"*{core}*"
    return lead + core + trail


def para_text(p):
    out = []
    for node in p.iter():
        if node.tag == W + "r":
            out.append(run_text(node))
    txt = "".join(out)
    txt = txt.replace("****", "")
    return txt.strip()


def para_style(p):
    ppr = p.find(W + "pPr")
    if ppr is None:
        return None, None
    st = ppr.find(W + "pStyle")
    style = st.get(W + "val") if st is not None else None
    num = ppr.find(W + "numPr")
    lvl = None
    if num is not None:
        il = num.find(W + "ilvl")
        lvl = int(il.get(W + "val")) if il is not None else 0
    return style, lvl


def heading_level(style):
    if not style:
        return None
    s = style.lower()
    if s in ("title", "judul"):
        return 1
    m = re.match(r"(heading|judul)\s*(\d)", s)
    if m:
        return int(m.group(2))
    return None


def cell_text(tc):
    paras = [para_text(p) for p in tc.iter(W + "p")]
    return "<br>".join(x for x in paras if x).replace("|", "\\|")


def table_md(tbl):
    rows = []
    for tr in tbl.findall(W + "tr"):
        rows.append([cell_text(tc) for tc in tr.findall(W + "tc")])
    if not rows:
        return ""
    width = max(len(r) for r in rows)
    rows = [r + [""] * (width - len(r)) for r in rows]
    lines = ["| " + " | ".join(rows[0]) + " |", "|" + "---|" * width]
    for r in rows[1:]:
        lines.append("| " + " | ".join(r) + " |")
    return "\n".join(lines)


def convert(path):
    with zipfile.ZipFile(path) as z:
        root = ET.fromstring(z.read("word/document.xml"))
    body = root.find(W + "body")
    out = []
    for el in body:
        tag = el.tag.replace(W, "")
        if tag == "p":
            txt = para_text(el)
            if not txt:
                continue
            style, lvl = para_style(el)
            h = heading_level(style)
            if h:
                out.append("#" * h + " " + txt.replace("**", ""))
            elif lvl is not None or (style and "list" in style.lower()):
                out.append("  " * (lvl or 0) + "- " + txt)
            else:
                out.append(txt)
            out.append("")
        elif tag == "tbl":
            out.append(table_md(el))
            out.append("")
    md = "\n".join(out)
    # rapatkan baris kosong ganda di antara butir daftar
    md = re.sub(r"(\n\s*- [^\n]*)\n\n(?=\s*- )", r"\1\n", md)
    md = re.sub(r"(\n\s*- [^\n]*)\n\n(?=\s*- )", r"\1\n", md)
    return md.strip() + "\n"


if __name__ == "__main__":
    src, dst = sys.argv[1], sys.argv[2]
    with open(dst, "w", encoding="utf-8") as f:
        f.write(convert(src))
