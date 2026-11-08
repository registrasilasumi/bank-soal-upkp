/* Latihan UPKP — aplikasi statis tanpa framework.
 * Data: data/bank-soal.json (dibangun oleh scripts/build.py).
 * Progres disimpan di localStorage perangkat ini saja.
 */
(function () {
  "use strict";

  var KUNCI = {
    stat: "upkp.stat.v1",        // { id: {n, b, t, k} } n=dikerjakan, b=benar, t=terakhir(ms), k=terakhir benar?
    salah: "upkp.salah.v1",      // [id, ...]
    sim: "upkp.sim.v1",          // simulasi yang sedang berjalan
    riwayat: "upkp.riwayat.v1",  // [{waktu, skor, benar, ambang, perKategori}]
    pengaturan: "upkp.pengaturan.v1" // {tema, ambang}
  };
  var HURUF = ["A", "B", "C", "D", "E"];

  var BANK = null;     // data bank-soal.json
  var IDX = {};        // id -> soal
  var app = document.getElementById("app");
  var timerHandle = null;
  var sesi = null;     // sesi latihan/review yang sedang berjalan

  /* ---------- Penyimpanan aman ---------- */
  function baca(k, bawaan) {
    try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : bawaan; } catch (e) { return bawaan; }
  }
  function tulis(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; }
  }
  function hapus(k) { try { localStorage.removeItem(k); } catch (e) {} }

  /* ---------- Utilitas ---------- */
  function el(tag, attrs, anak) {
    var n = document.createElement(tag);
    if (attrs) for (var a in attrs) {
      if (a === "class") n.className = attrs[a];
      else if (a === "text") n.textContent = attrs[a];
      else if (a.slice(0, 2) === "on") n.addEventListener(a.slice(2), attrs[a]);
      else if (attrs[a] !== false && attrs[a] != null) n.setAttribute(a, attrs[a] === true ? "" : attrs[a]);
    }
    (anak || []).forEach(function (c) { if (c != null) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }
  function kosongkan() { stopTimer(); app.innerHTML = ""; window.scrollTo(0, 0); }
  function acak(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function persen(a, b) { return b ? Math.round((a / b) * 100) : 0; }
  function fmtWaktu(ms) {
    var s = Math.max(0, Math.round(ms / 1000)), m = Math.floor(s / 60), d = s % 60;
    return (m < 10 ? "0" : "") + m + ":" + (d < 10 ? "0" : "") + d;
  }
  function fmtTanggal(ms) {
    try { return new Date(ms).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }); } catch (e) { return new Date(ms).toISOString(); }
  }
  function stopTimer() { if (timerHandle) { clearInterval(timerHandle); timerHandle = null; } }

  /* ---------- Statistik & daftar salah ---------- */
  function catat(id, benar) {
    var st = baca(KUNCI.stat, {});
    var r = st[id] || { n: 0, b: 0 };
    r.n += 1; if (benar) r.b += 1; r.t = Date.now(); r.k = !!benar;
    st[id] = r; tulis(KUNCI.stat, st);
    var sl = baca(KUNCI.salah, []);
    var ada = sl.indexOf(id);
    if (!benar && ada < 0) sl.push(id);
    if (benar && ada >= 0) sl.splice(ada, 1);
    tulis(KUNCI.salah, sl);
  }

  /* ---------- Tema ---------- */
  function terapkanTema() {
    var p = baca(KUNCI.pengaturan, {});
    var t = p.tema || "auto";
    if (t === "auto") delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
    var ikon = { auto: "◐", light: "☀", dark: "☾" }[t];
    document.getElementById("ikon-tema").textContent = ikon;
    document.getElementById("btn-tema").setAttribute("title", "Tema: " + ({ auto: "ikut sistem", light: "terang", dark: "gelap" }[t]));
  }
  document.getElementById("btn-tema").addEventListener("click", function () {
    var p = baca(KUNCI.pengaturan, {});
    var urut = ["auto", "light", "dark"];
    p.tema = urut[(urut.indexOf(p.tema || "auto") + 1) % 3];
    tulis(KUNCI.pengaturan, p); terapkanTema();
  });

  /* ---------- Komponen soal ---------- */
  function metaSoal(s, nomor) {
    var chips = [];
    if (nomor) chips.push(el("span", { class: "chip", text: nomor }));
    chips.push(el("span", { class: "chip", text: s.kategori + " · " + s.topik }));
    if (s.subtopik) chips.push(el("span", { class: "chip", text: s.subtopik }));
    chips.push(el("span", { class: "chip", text: s.tingkat }));
    if (s.di_luar_materi) chips.push(el("span", { class: "chip warn", text: "di luar materi" }));
    return el("div", { class: "q-meta" }, chips);
  }
  function kotakPembahasan(s, benar) {
    return el("div", { class: "pembahasan " + (benar ? "ok" : "bad"), role: "status" }, [
      el("p", {}, [el("span", { class: "hasil-badge " + (benar ? "ok" : "bad"), text: benar ? "Benar. " : "Kurang tepat. " }), "Kunci: " + s.jawaban + ". " + s.opsi[s.jawaban]]),
      el("p", { text: s.pembahasan }),
      s.sumber ? el("p", { class: "sumber", text: "Sumber: " + s.sumber }) : null,
      s.di_luar_materi ? el("p", { class: "sumber", text: "Catatan: soal ini dibuat dari pengetahuan umum yang baku, bukan dari rangkuman." }) : null
    ]);
  }

  /* ---------- Beranda ---------- */
  function viewBeranda() {
    kosongkan();
    var st = baca(KUNCI.stat, {}), dikerjakan = Object.keys(st).filter(function (id) { return IDX[id]; }).length;
    var sim = baca(KUNCI.sim, null);
    app.appendChild(el("section", { class: "card" }, [
      el("h1", { text: "Bank Soal UPKP Kemenimipas" }),
      el("p", { class: "muted", text: BANK.soal.length + " soal dari " + BANK.topik.length + " topik kisi-kisi UPKP D3 s.d. S2 (SE Kepala BKN 10/2024). Format ujian: " + BANK.ujian.jumlah_soal + " soal, " + BANK.ujian.durasi_menit + " menit, benar = " + BANK.ujian.nilai_benar + " poin." }),
      el("div", { class: "bar", "aria-label": "Progres" }, [el("i", { style: "width:" + persen(dikerjakan, BANK.soal.length) + "%" })]),
      el("p", { class: "small muted", text: "Sudah dikerjakan " + dikerjakan + " dari " + BANK.soal.length + " soal." })
    ]));
    if (sim && !sim.selesai) {
      app.appendChild(el("div", { class: "notice" }, ["Ada simulasi yang belum selesai. ", el("a", { href: "#simulasi", text: "Lanjutkan" })]));
      app.appendChild(el("div", { style: "height:12px" }));
    }
    var menu = [
      ["#latihan", "Latihan per topik", "Pilih topik, subtopik, dan tingkat. Pembahasan langsung muncul."],
      ["#simulasi", "Simulasi UPKP", "100 soal sesuai kisi-kisi, timer 90 menit, skor per kategori."],
      ["#review", "Review kesalahan", baca(KUNCI.salah, []).length + " soal yang pernah salah. Ulangi sampai benar."],
      ["#statistik", "Statistik progres", "Akurasi per topik, riwayat simulasi, ekspor/impor progres."]
    ];
    app.appendChild(el("div", { class: "grid-2" }, menu.map(function (m) {
      return el("a", { class: "card", href: m[0], style: "text-decoration:none;color:inherit;margin:0" }, [el("h2", { text: m[1] }), el("p", { class: "muted small", text: m[2] })]);
    })));
  }

  /* ---------- Latihan ---------- */
  function daftarTopik() { return BANK.topik.map(function (t) { return t.topik; }); }
  function viewLatihan() {
    kosongkan();
    var p = baca(KUNCI.pengaturan, {});
    var selTopik = el("select", { id: "f-topik" }, [el("option", { value: "", text: "Semua topik" })].concat(daftarTopik().map(function (t) { return el("option", { value: t, text: t }); })));
    var selSub = el("select", { id: "f-sub" });
    var selTingkat = el("select", { id: "f-tingkat" }, [["", "Semua tingkat"], ["mudah", "Mudah"], ["sedang", "Sedang"], ["sulit", "Sulit"]].map(function (o) { return el("option", { value: o[0], text: o[1] }); }));
    var selJumlah = el("select", { id: "f-jumlah" }, [["10", "10 soal"], ["20", "20 soal"], ["50", "50 soal"], ["0", "Semua"]].map(function (o) { return el("option", { value: o[0], text: o[1] }); }));
    var cbBaru = el("input", { type: "checkbox", id: "f-baru" });
    var cbLuar = el("input", { type: "checkbox", id: "f-luar", checked: true });
    var info = el("p", { class: "small muted" });

    if (p.latihan) { selTopik.value = p.latihan.topik || ""; selTingkat.value = p.latihan.tingkat || ""; selJumlah.value = p.latihan.jumlah || "10"; }
    function isiSub() {
      var subs = {};
      BANK.soal.forEach(function (s) { if (!selTopik.value || s.topik === selTopik.value) subs[s.subtopik] = 1; });
      selSub.innerHTML = "";
      selSub.appendChild(el("option", { value: "", text: "Semua subtopik" }));
      Object.keys(subs).sort().forEach(function (s) { selSub.appendChild(el("option", { value: s, text: s })); });
      if (p.latihan && p.latihan.sub && subs[p.latihan.sub]) selSub.value = p.latihan.sub;
      hitung();
    }
    function saring() {
      var st = baca(KUNCI.stat, {});
      return BANK.soal.filter(function (s) {
        return (!selTopik.value || s.topik === selTopik.value) && (!selSub.value || s.subtopik === selSub.value) &&
          (!selTingkat.value || s.tingkat === selTingkat.value) && (cbLuar.checked || !s.di_luar_materi) && (!cbBaru.checked || !st[s.id]);
      });
    }
    function hitung() { info.textContent = saring().length + " soal cocok dengan pilihan ini."; }
    selTopik.addEventListener("change", function () { p.latihan = null; isiSub(); });
    [selSub, selTingkat, cbBaru, cbLuar].forEach(function (x) { x.addEventListener("change", hitung); });

    app.appendChild(el("section", { class: "card stack" }, [
      el("h1", { text: "Latihan per topik" }),
      el("p", { class: "muted small", text: "Jawaban langsung dibahas setelah dipilih. Soal yang salah masuk ke Review." }),
      el("div", { class: "grid-2" }, [
        el("label", { class: "field" }, [el("span", { text: "Topik" }), selTopik]),
        el("label", { class: "field" }, [el("span", { text: "Subtopik" }), selSub]),
        el("label", { class: "field" }, [el("span", { text: "Tingkat" }), selTingkat]),
        el("label", { class: "field" }, [el("span", { text: "Jumlah" }), selJumlah])
      ]),
      el("label", { class: "check" }, [cbBaru, el("span", { text: "Hanya soal yang belum pernah dikerjakan" })]),
      el("label", { class: "check" }, [cbLuar, el("span", { text: "Sertakan soal di luar materi rangkuman" })]),
      info,
      el("button", { class: "btn primary block", type: "button", onclick: function () {
        var daftar = acak(saring()), n = parseInt(selJumlah.value, 10);
        if (!daftar.length) { info.textContent = "Tidak ada soal yang cocok. Ubah pilihan."; return; }
        if (n) daftar = daftar.slice(0, n);
        p.latihan = { topik: selTopik.value, sub: selSub.value, tingkat: selTingkat.value, jumlah: selJumlah.value };
        tulis(KUNCI.pengaturan, p);
        mulaiSesi(daftar.map(function (s) { return s.id; }), "latihan");
      } }, ["Mulai latihan"])
    ]));
    isiSub();
  }

  function mulaiSesi(ids, mode) {
    sesi = { ids: ids, i: 0, benar: 0, salah: [], mode: mode, dijawab: false };
    tampilSoalSesi();
  }
  function tampilSoalSesi() {
    kosongkan();
    var s = IDX[sesi.ids[sesi.i]];
    var kartu = el("section", { class: "card" });
    var tombol = [];
    var lanjut = el("button", { class: "btn primary block hidden", type: "button", onclick: function () {
      sesi.i += 1; if (sesi.i >= sesi.ids.length) ringkasanSesi(); else tampilSoalSesi();
    } }, [sesi.i + 1 >= sesi.ids.length ? "Lihat hasil" : "Soal berikutnya"]);
    var wadahBahas = el("div");
    var daftarOpsi = el("ul", { class: "opsi" }, HURUF.map(function (h) {
      var b = el("button", { type: "button", "data-h": h, onclick: function () {
        if (sesi.dijawab) return;
        sesi.dijawab = true;
        var benar = h === s.jawaban;
        tombol.forEach(function (t) {
          t.disabled = true;
          if (t.dataset.h === s.jawaban) t.classList.add("benar");
          else if (t.dataset.h === h) t.classList.add("salah");
        });
        catat(s.id, benar);
        if (benar) sesi.benar += 1; else sesi.salah.push(s.id);
        wadahBahas.appendChild(kotakPembahasan(s, benar));
        lanjut.classList.remove("hidden");
        lanjut.focus();
      } }, [el("span", { class: "huruf", text: h }), el("span", { text: s.opsi[h] })]);
      tombol.push(b);
      return el("li", {}, [b]);
    }));
    sesi.dijawab = false;
    kartu.appendChild(metaSoal(s, (sesi.mode === "review" ? "Review " : "Soal ") + (sesi.i + 1) + "/" + sesi.ids.length));
    kartu.appendChild(el("p", { class: "q-text", text: s.pertanyaan }));
    kartu.appendChild(daftarOpsi);
    kartu.appendChild(wadahBahas);
    app.appendChild(el("div", { class: "bar", style: "margin-bottom:12px" }, [el("i", { style: "width:" + persen(sesi.i, sesi.ids.length) + "%" })]));
    app.appendChild(kartu);
    app.appendChild(lanjut);
    app.appendChild(el("div", { class: "row", style: "margin-top:10px" }, [
      el("button", { class: "btn", type: "button", onclick: function () { ringkasanSesi(); } }, ["Akhiri sesi"])
    ]));
  }
  function ringkasanSesi() {
    kosongkan();
    var dikerjakan = sesi.benar + sesi.salah.length;
    var kartu = el("section", { class: "card stack" }, [
      el("h1", { text: sesi.mode === "review" ? "Hasil review" : "Hasil latihan" }),
      el("p", { class: "skor-besar", text: persen(sesi.benar, dikerjakan) + "%" }),
      el("p", { class: "muted", text: sesi.benar + " benar dari " + dikerjakan + " soal yang dijawab." }),
      sesi.salah.length ? el("p", { class: "small", text: sesi.salah.length + " soal yang salah sudah masuk daftar Review." }) : el("div", { class: "notice ok", text: "Semua jawaban benar." }),
      el("div", { class: "row" }, [
        el("a", { class: "btn primary", href: sesi.mode === "review" ? "#review" : "#latihan" }, [sesi.mode === "review" ? "Kembali ke Review" : "Latihan lagi"]),
        sesi.salah.length ? el("button", { class: "btn", type: "button", onclick: function () { mulaiSesi(acak(sesi.salah), "review"); } }, ["Ulangi yang salah"]) : null
      ])
    ]);
    app.appendChild(kartu);
  }

  /* ---------- Simulasi ---------- */
  function susunSimulasi() {
    var urutKat = BANK.urutan_kategori;
    var topik = BANK.topik.slice().sort(function (a, b) { return urutKat.indexOf(a.kategori) - urutKat.indexOf(b.kategori); });
    var ids = [];
    topik.forEach(function (t) {
      var pool = acak(BANK.soal.filter(function (s) { return s.topik === t.topik; }));
      pool.slice(0, t.jatah).forEach(function (s) { ids.push(s.id); });
    });
    return ids;
  }
  function viewSimulasi() {
    kosongkan();
    var sim = baca(KUNCI.sim, null);
    if (sim && !sim.selesai) {
      var sisa = sim.mulai + sim.durasi - Date.now();
      if (sisa <= 0) { selesaiSimulasi(sim, true); return; }
      app.appendChild(el("section", { class: "card stack" }, [
        el("h1", { text: "Simulasi sedang berjalan" }),
        el("p", { class: "muted", text: "Terjawab " + Object.keys(sim.jawaban).length + " dari " + sim.ids.length + " soal. Sisa waktu " + fmtWaktu(sisa) + " (waktu tetap berjalan)." }),
        el("div", { class: "row" }, [
          el("button", { class: "btn primary", type: "button", onclick: function () { kerjakanSimulasi(sim); } }, ["Lanjutkan"]),
          el("button", { class: "btn danger", type: "button", onclick: function () {
            if (confirm("Buang simulasi ini? Jawaban tidak akan dinilai.")) { hapus(KUNCI.sim); viewSimulasi(); }
          } }, ["Buang simulasi"])
        ])
      ]));
      return;
    }
    var p = baca(KUNCI.pengaturan, {});
    var inpAmbang = el("input", { type: "number", min: "0", max: String(BANK.ujian.jumlah_soal * BANK.ujian.nilai_benar), step: "5", inputmode: "numeric", placeholder: "mis. 300", value: p.ambang != null ? p.ambang : "" });
    var baris = BANK.topik.map(function (t) {
      var ada = BANK.soal.filter(function (s) { return s.topik === t.topik; }).length;
      return el("tr", {}, [el("td", { text: t.kategori }), el("td", { text: t.topik }), el("td", { class: "num", text: String(t.jatah) }), el("td", { class: "num muted", text: String(ada) })]);
    });
    var total = BANK.topik.reduce(function (a, t) { return a + t.jatah; }, 0);
    app.appendChild(el("section", { class: "card stack" }, [
      el("h1", { text: "Simulasi UPKP" }),
      el("p", { class: "muted small", text: total + " soal acak sesuai kisi-kisi, " + BANK.ujian.durasi_menit + " menit. Jawaban tersimpan setelah menekan \"Simpan & Lanjutkan\". Kotak hijau = sudah dijawab, merah = belum. Skor = jumlah benar × " + BANK.ujian.nilai_benar + "." }),
      el("label", { class: "field" }, [el("span", { text: "Nilai ambang batas (ditetapkan PPK instansi; boleh dikosongkan)" }), inpAmbang]),
      el("div", { class: "tbl-wrap" }, [el("table", {}, [
        el("thead", {}, [el("tr", {}, [el("th", { text: "Tes" }), el("th", { text: "Materi" }), el("th", { class: "num", text: "Soal" }), el("th", { class: "num", text: "Bank" })])]),
        el("tbody", {}, baris)
      ])]),
      el("button", { class: "btn primary block", type: "button", onclick: function () {
        var v = inpAmbang.value.trim();
        p.ambang = v === "" ? null : Math.max(0, parseInt(v, 10) || 0);
        tulis(KUNCI.pengaturan, p);
        var simBaru = { ids: susunSimulasi(), jawaban: {}, mulai: Date.now(), durasi: BANK.ujian.durasi_menit * 60000, pos: 0, ambang: p.ambang, selesai: false };
        tulis(KUNCI.sim, simBaru);
        kerjakanSimulasi(simBaru);
      } }, ["Mulai simulasi"])
    ]));
    var riw = baca(KUNCI.riwayat, []);
    if (riw.length) {
      app.appendChild(el("section", { class: "card" }, [el("h2", { text: "Riwayat terakhir" }), tabelRiwayat(riw.slice(-5).reverse())]));
    }
  }
  function kerjakanSimulasi(sim) {
    kosongkan();
    var pending = null;
    var timerEl = el("span", { class: "timer", "aria-live": "off" });
    var hitungEl = el("span", { class: "small muted" });
    var kepala = el("div", { class: "sim-head" }, [el("div", {}, [el("div", { class: "small muted", text: "Sisa waktu" }), timerEl]), hitungEl,
      el("button", { class: "btn", type: "button", onclick: function () { navWrap.classList.toggle("hidden"); window.scrollTo(0, 0); } }, ["Nomor soal"])]);
    var navWrap = el("section", { class: "card hidden" });
    var badan = el("section", { class: "card" });
    var aksi = el("div", { class: "stack" });
    app.appendChild(kepala); app.appendChild(navWrap); app.appendChild(badan); app.appendChild(aksi);

    function simpan() { tulis(KUNCI.sim, sim); }
    function tik() {
      var sisa = sim.mulai + sim.durasi - Date.now();
      timerEl.textContent = fmtWaktu(sisa);
      timerEl.classList.toggle("kritis", sisa < 5 * 60000);
      if (sisa <= 0) { stopTimer(); alert("Waktu habis. Jawaban yang sudah tersimpan akan dinilai."); selesaiSimulasi(sim, true); }
    }
    function gambarNav() {
      navWrap.innerHTML = "";
      navWrap.appendChild(el("div", { class: "nav-grid" }, sim.ids.map(function (id, i) {
        return el("button", { type: "button", class: (sim.jawaban[i] ? "terjawab" : "") + (i === sim.pos ? " kini" : ""), "aria-label": "Soal " + (i + 1) + (sim.jawaban[i] ? " (terjawab)" : " (belum)"), onclick: function () { sim.pos = i; simpan(); navWrap.classList.add("hidden"); gambarNav(); gambarSoal(); } }, [String(i + 1)]);
      })));
      navWrap.appendChild(el("div", { class: "legend" }, [
        el("span", {}, [el("i", { style: "background:var(--ok-soft);border:1px solid var(--ok)" }), "terjawab"]),
        el("span", {}, [el("i", { style: "background:var(--bad-soft);border:1px solid var(--bad)" }), "belum dijawab"])
      ]));
      var n = Object.keys(sim.jawaban).length;
      hitungEl.textContent = n + "/" + sim.ids.length + " terjawab";
    }
    function gambarSoal() {
      var i = sim.pos, s = IDX[sim.ids[i]];
      pending = sim.jawaban[i] || null;
      badan.innerHTML = "";
      badan.appendChild(el("div", { class: "q-meta" }, [el("span", { class: "chip", text: "Soal " + (i + 1) + " dari " + sim.ids.length }), el("span", { class: "chip", text: s.kategori })]));
      badan.appendChild(el("p", { class: "q-text", text: s.pertanyaan }));
      var tombol = [];
      badan.appendChild(el("ul", { class: "opsi" }, HURUF.map(function (h) {
        var b = el("button", { type: "button", class: pending === h ? "pilih" : "", "aria-pressed": pending === h ? "true" : "false", onclick: function () {
          pending = h;
          tombol.forEach(function (t) { var on = t.dataset.h === h; t.classList.toggle("pilih", on); t.setAttribute("aria-pressed", on ? "true" : "false"); });
        }, "data-h": h }, [el("span", { class: "huruf", text: h }), el("span", { text: s.opsi[h] })]);
        tombol.push(b);
        return el("li", {}, [b]);
      })));
      if (sim.jawaban[i]) badan.appendChild(el("p", { class: "small muted", style: "margin-top:10px", text: "Jawaban tersimpan: " + sim.jawaban[i] }));
      aksi.innerHTML = "";
      aksi.appendChild(el("button", { class: "btn primary block", type: "button", onclick: function () {
        if (pending) sim.jawaban[i] = pending;
        var berikut = -1;
        for (var k = 1; k <= sim.ids.length; k++) { var j = (i + k) % sim.ids.length; if (!sim.jawaban[j]) { berikut = j; break; } }
        if (berikut < 0) berikut = Math.min(i + 1, sim.ids.length - 1);
        sim.pos = (i + 1 < sim.ids.length && !sim.jawaban[i + 1]) ? i + 1 : berikut;
        simpan(); gambarNav(); gambarSoal();
      } }, ["Simpan & Lanjutkan"]));
      aksi.appendChild(el("div", { class: "row between" }, [
        el("button", { class: "btn", type: "button", disabled: i === 0, onclick: function () { sim.pos = i - 1; simpan(); gambarNav(); gambarSoal(); } }, ["‹ Sebelumnya"]),
        el("button", { class: "btn", type: "button", disabled: !sim.jawaban[i], onclick: function () { delete sim.jawaban[i]; simpan(); gambarNav(); gambarSoal(); } }, ["Kosongkan jawaban"]),
        el("button", { class: "btn", type: "button", disabled: i === sim.ids.length - 1, onclick: function () { sim.pos = i + 1; simpan(); gambarNav(); gambarSoal(); } }, ["Lewati ›"])
      ]));
      var belum = sim.ids.length - Object.keys(sim.jawaban).length;
      aksi.appendChild(el("button", { class: "btn danger block", type: "button", onclick: function () {
        var pesan = belum ? "Masih ada " + belum + " soal belum dijawab (bernilai 0). Selesaikan ujian sekarang?" : "Selesaikan ujian dan lihat skor?";
        if (confirm(pesan)) selesaiSimulasi(sim, false);
      } }, ["Selesai ujian"]));
      window.scrollTo(0, 0);
    }
    gambarNav(); gambarSoal(); tik();
    timerHandle = setInterval(tik, 1000);
  }
  function nilaiSimulasi(sim) {
    var perKat = {}, perTopik = {}, benar = 0;
    sim.ids.forEach(function (id, i) {
      var s = IDX[id]; if (!s) return;
      var ok = sim.jawaban[i] === s.jawaban;
      if (ok) benar += 1;
      [[perKat, s.kategori], [perTopik, s.topik]].forEach(function (pr) {
        var o = pr[0][pr[1]] || (pr[0][pr[1]] = { n: 0, b: 0, kosong: 0 });
        o.n += 1; if (ok) o.b += 1; if (!sim.jawaban[i]) o.kosong += 1;
      });
    });
    return { benar: benar, skor: benar * BANK.ujian.nilai_benar, perKat: perKat, perTopik: perTopik };
  }
  function selesaiSimulasi(sim, habis) {
    stopTimer();
    if (!sim.selesai) {
      sim.selesai = true; sim.selesaiPada = Date.now(); sim.waktuHabis = !!habis;
      sim.ids.forEach(function (id, i) { if (sim.jawaban[i]) catat(id, sim.jawaban[i] === IDX[id].jawaban); else { var sl = baca(KUNCI.salah, []); if (sl.indexOf(id) < 0) { sl.push(id); tulis(KUNCI.salah, sl); } } });
      var n = nilaiSimulasi(sim);
      var riw = baca(KUNCI.riwayat, []);
      riw.push({ waktu: sim.selesaiPada, skor: n.skor, benar: n.benar, jumlah: sim.ids.length, ambang: sim.ambang, perKategori: n.perKat });
      tulis(KUNCI.riwayat, riw.slice(-50));
      hapus(KUNCI.sim);
    }
    hasilSimulasi(sim);
  }
  function hasilSimulasi(sim) {
    kosongkan();
    var n = nilaiSimulasi(sim), maks = sim.ids.length * BANK.ujian.nilai_benar;
    var status = null;
    if (sim.ambang != null) status = n.skor >= sim.ambang
      ? el("div", { class: "notice ok", text: "Memenuhi ambang batas " + sim.ambang + " (selisih +" + (n.skor - sim.ambang) + ")." })
      : el("div", { class: "notice bad", text: "Belum memenuhi ambang batas " + sim.ambang + " (kurang " + (sim.ambang - n.skor) + " poin = " + Math.ceil((sim.ambang - n.skor) / BANK.ujian.nilai_benar) + " soal)." });
    app.appendChild(el("section", { class: "card stack" }, [
      el("h1", { text: "Hasil simulasi" }),
      sim.waktuHabis ? el("p", { class: "small muted", text: "Selesai karena waktu habis." }) : null,
      el("p", {}, [el("span", { class: "skor-besar", text: String(n.skor) }), el("span", { class: "muted", text: " / " + maks })]),
      el("p", { class: "muted", text: n.benar + " benar dari " + sim.ids.length + " soal (" + persen(n.benar, sim.ids.length) + "%)." }),
      status
    ]));
    function tabel(judul, data, urut) {
      return el("section", { class: "card" }, [el("h2", { text: judul }), el("div", { class: "tbl-wrap" }, [el("table", {}, [
        el("thead", {}, [el("tr", {}, [el("th", { text: judul.indexOf("kategori") >= 0 ? "Tes" : "Topik" }), el("th", { class: "num", text: "Benar" }), el("th", { class: "num", text: "Kosong" }), el("th", { class: "num", text: "Nilai" }), el("th", { class: "num", text: "%" })])]),
        el("tbody", {}, urut.filter(function (k) { return data[k]; }).map(function (k) {
          var o = data[k];
          return el("tr", {}, [el("td", { text: k + (BANK.nama_kategori[k] ? " — " + BANK.nama_kategori[k] : "") }), el("td", { class: "num", text: o.b + "/" + o.n }), el("td", { class: "num", text: String(o.kosong) }), el("td", { class: "num", text: o.b * BANK.ujian.nilai_benar + "/" + o.n * BANK.ujian.nilai_benar }), el("td", { class: "num", text: persen(o.b, o.n) + "%" })]);
        }))
      ])])]);
    }
    app.appendChild(tabel("Skor per kategori", n.perKat, BANK.urutan_kategori));
    app.appendChild(tabel("Skor per topik", n.perTopik, daftarTopik()));
    var daftar = el("section", { class: "card" }, [el("h2", { text: "Pembahasan" }), el("p", { class: "small muted", text: "Soal yang salah atau kosong sudah masuk daftar Review." })]);
    sim.ids.forEach(function (id, i) {
      var s = IDX[id], j = sim.jawaban[i], ok = j === s.jawaban;
      var d = el("details", { class: "review-item" }, [
        el("summary", {}, [el("span", { class: "hasil-badge " + (ok ? "ok" : "bad"), text: (i + 1) + ". " + (ok ? "✓ " : j ? "✗ " : "– ") }), s.pertanyaan.length > 90 ? s.pertanyaan.slice(0, 90) + "…" : s.pertanyaan]),
        metaSoal(s),
        el("p", { class: "q-text", text: s.pertanyaan }),
        el("ul", { class: "opsi" }, HURUF.map(function (h) {
          return el("li", {}, [el("button", { type: "button", disabled: true, class: h === s.jawaban ? "benar" : (h === j ? "salah" : "") }, [el("span", { class: "huruf", text: h }), el("span", { text: s.opsi[h] })])]);
        })),
        el("p", { class: "small", style: "margin-top:8px", text: "Jawaban Anda: " + (j || "kosong") }),
        kotakPembahasan(s, ok)
      ]);
      daftar.appendChild(d);
    });
    app.appendChild(daftar);
    app.appendChild(el("div", { class: "row" }, [el("a", { class: "btn primary", href: "#simulasi" }, ["Simulasi lagi"]), el("a", { class: "btn", href: "#review" }, ["Ke Review"])]));
  }

  /* ---------- Review kesalahan ---------- */
  function viewReview() {
    kosongkan();
    var sl = baca(KUNCI.salah, []).filter(function (id) { return IDX[id]; });
    var kartu = el("section", { class: "card stack" }, [
      el("h1", { text: "Review kesalahan" }),
      el("p", { class: "muted small", text: "Soal yang pernah dijawab salah (atau kosong di simulasi). Soal keluar dari daftar setelah dijawab benar." })
    ]);
    if (!sl.length) {
      kartu.appendChild(el("div", { class: "notice ok", text: "Belum ada soal di daftar review." }));
      app.appendChild(kartu); return;
    }
    var perTopik = {};
    sl.forEach(function (id) { var t = IDX[id].topik; perTopik[t] = (perTopik[t] || 0) + 1; });
    var sel = el("select", {}, [el("option", { value: "", text: "Semua topik (" + sl.length + ")" })].concat(daftarTopik().filter(function (t) { return perTopik[t]; }).map(function (t) { return el("option", { value: t, text: t + " (" + perTopik[t] + ")" }); })));
    kartu.appendChild(el("label", { class: "field" }, [el("span", { text: "Topik" }), sel]));
    kartu.appendChild(el("button", { class: "btn primary block", type: "button", onclick: function () {
      var ids = sl.filter(function (id) { return !sel.value || IDX[id].topik === sel.value; });
      mulaiSesi(acak(ids), "review");
    } }, ["Ulangi sampai benar"]));
    kartu.appendChild(el("button", { class: "btn danger", type: "button", onclick: function () {
      if (confirm("Kosongkan seluruh daftar review?")) { tulis(KUNCI.salah, []); viewReview(); }
    } }, ["Kosongkan daftar"]));
    app.appendChild(kartu);
    var daftar = el("section", { class: "card" }, [el("h2", { text: "Daftar soal" })]);
    sl.forEach(function (id) {
      var s = IDX[id];
      daftar.appendChild(el("details", { class: "review-item" }, [
        el("summary", { text: s.topik + " · " + (s.pertanyaan.length > 80 ? s.pertanyaan.slice(0, 80) + "…" : s.pertanyaan) }),
        el("p", { class: "q-text", text: s.pertanyaan }),
        kotakPembahasan(s, false)
      ]));
    });
    app.appendChild(daftar);
  }

  /* ---------- Statistik ---------- */
  function tabelRiwayat(riw) {
    return el("div", { class: "tbl-wrap" }, [el("table", {}, [
      el("thead", {}, [el("tr", {}, [el("th", { text: "Waktu" }), el("th", { class: "num", text: "Skor" }), el("th", { class: "num", text: "Benar" }), el("th", { class: "num", text: "Ambang" })])]),
      el("tbody", {}, riw.map(function (r) {
        var lulus = r.ambang != null ? (r.skor >= r.ambang ? " ✓" : " ✗") : "";
        return el("tr", {}, [el("td", { text: fmtTanggal(r.waktu) }), el("td", { class: "num", text: r.skor + lulus }), el("td", { class: "num", text: r.benar + "/" + r.jumlah }), el("td", { class: "num", text: r.ambang != null ? String(r.ambang) : "–" })]);
      }))
    ])]);
  }
  function viewStatistik() {
    kosongkan();
    var st = baca(KUNCI.stat, {});
    var agg = {}, totN = 0, totB = 0, unik = 0;
    BANK.topik.forEach(function (t) { agg[t.topik] = { kategori: t.kategori, bank: 0, unik: 0, n: 0, b: 0 }; });
    BANK.soal.forEach(function (s) {
      var a = agg[s.topik]; a.bank += 1;
      var r = st[s.id]; if (r) { a.unik += 1; a.n += r.n; a.b += r.b; unik += 1; totN += r.n; totB += r.b; }
    });
    app.appendChild(el("section", { class: "card" }, [
      el("h1", { text: "Statistik progres" }),
      el("p", { class: "muted", text: unik + " dari " + BANK.soal.length + " soal sudah dikerjakan. " + totN + " jawaban, akurasi " + persen(totB, totN) + "%." }),
      el("div", { class: "bar" }, [el("i", { style: "width:" + persen(unik, BANK.soal.length) + "%" })])
    ]));
    app.appendChild(el("section", { class: "card" }, [el("h2", { text: "Per topik" }), el("div", { class: "tbl-wrap" }, [el("table", {}, [
      el("thead", {}, [el("tr", {}, [el("th", { text: "Topik" }), el("th", { class: "num", text: "Dikerjakan" }), el("th", { class: "num", text: "Akurasi" })])]),
      el("tbody", {}, daftarTopik().map(function (t) {
        var a = agg[t];
        return el("tr", {}, [
          el("td", {}, [el("div", { text: t }), el("div", { class: "bar", style: "margin-top:4px" }, [el("i", { style: "width:" + persen(a.unik, a.bank) + "%" })]), el("div", { class: "small muted", text: a.kategori })]),
          el("td", { class: "num", text: a.unik + "/" + a.bank }),
          el("td", { class: "num", text: a.n ? persen(a.b, a.n) + "%" : "–" })
        ]);
      }))
    ])])]));
    var riw = baca(KUNCI.riwayat, []);
    app.appendChild(el("section", { class: "card" }, [el("h2", { text: "Riwayat simulasi" }), riw.length ? tabelRiwayat(riw.slice().reverse()) : el("p", { class: "muted small", text: "Belum ada simulasi." })]));

    var inpFile = el("input", { type: "file", accept: "application/json,.json", class: "hidden" });
    inpFile.addEventListener("change", function () {
      var f = inpFile.files && inpFile.files[0]; if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        try {
          var d = JSON.parse(rd.result);
          if (!d || d.aplikasi !== "bank-soal-upkp" || typeof d.stat !== "object") throw new Error("format");
          if (!confirm("Ganti progres di perangkat ini dengan isi file?")) return;
          tulis(KUNCI.stat, d.stat || {}); tulis(KUNCI.salah, d.salah || []); tulis(KUNCI.riwayat, d.riwayat || []);
          alert("Progres berhasil diimpor."); viewStatistik();
        } catch (e) { alert("File tidak dikenali sebagai ekspor progres aplikasi ini."); }
      };
      rd.readAsText(f);
    });
    app.appendChild(el("section", { class: "card stack" }, [
      el("h2", { text: "Data progres" }),
      el("p", { class: "small muted", text: "Progres tersimpan di browser perangkat ini. Ekspor untuk cadangan atau pindah perangkat." }),
      el("div", { class: "row" }, [
        el("button", { class: "btn", type: "button", onclick: function () {
          var data = { aplikasi: "bank-soal-upkp", versi: 1, diekspor: new Date().toISOString(), stat: baca(KUNCI.stat, {}), salah: baca(KUNCI.salah, []), riwayat: baca(KUNCI.riwayat, []) };
          var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
          var a = el("a", { href: URL.createObjectURL(blob), download: "progres-upkp-" + new Date().toISOString().slice(0, 10) + ".json" });
          document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
        } }, ["Ekspor JSON"]),
        el("button", { class: "btn", type: "button", onclick: function () { inpFile.click(); } }, ["Impor JSON"]),
        inpFile,
        el("button", { class: "btn danger", type: "button", onclick: function () {
          if (confirm("Hapus semua statistik, daftar review, dan riwayat simulasi di perangkat ini? Tindakan ini tidak bisa dibatalkan.")) {
            hapus(KUNCI.stat); hapus(KUNCI.salah); hapus(KUNCI.riwayat); hapus(KUNCI.sim); viewStatistik();
          }
        } }, ["Reset progres"])
      ])
    ]));
  }

  /* ---------- Router ---------- */
  function rute() {
    var h = (location.hash || "#beranda").slice(1);
    document.querySelectorAll(".tabs a").forEach(function (a) { a.classList.toggle("aktif", a.dataset.tab === h); });
    if (h === "latihan") viewLatihan();
    else if (h === "simulasi") viewSimulasi();
    else if (h === "review") viewReview();
    else if (h === "statistik") viewStatistik();
    else viewBeranda();
  }

  terapkanTema();
  fetch("data/bank-soal.json", { cache: "no-cache" })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (d) {
      BANK = d;
      d.soal.forEach(function (s) { IDX[s.id] = s; });
      window.addEventListener("hashchange", rute);
      // Tautan ke tab yang sedang aktif tidak memicu hashchange; render ulang secara manual.
      document.addEventListener("click", function (e) {
        var a = e.target.closest && e.target.closest('a[href^="#"]');
        if (a && a.getAttribute("href") === (location.hash || "#beranda")) { e.preventDefault(); rute(); }
      });
      rute();
    })
    .catch(function () {
      app.innerHTML = "";
      app.appendChild(el("div", { class: "notice bad", text: "Bank soal gagal dimuat. Jika membuka file langsung dari komputer, jalankan server lokal (python3 -m http.server di folder docs) lalu buka http://localhost:8000." }));
    });
})();
