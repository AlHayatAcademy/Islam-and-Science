/* اسلام اور سائنس — site script (no dependencies) */
(function () {
  "use strict";

  // ---------------- Storage (per-browser progress) ----------------
  var KEY = "isc-progress-v2";
  var mem = null;
  function load() {
    if (mem) return mem;
    try { mem = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { mem = {}; }
    mem.read = mem.read || {}; mem.quiz = mem.quiz || {}; mem.wrong = mem.wrong || {}; mem.exams = mem.exams || [];
    return mem;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) {} }
  function pref(k, v) {
    try { if (v === undefined) return localStorage.getItem("isc-" + k); localStorage.setItem("isc-" + k, v); } catch (e) { return null; }
  }

  // ---------------- Helpers ----------------
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var HARAKAT = /[ً-ٰٟۖ-ۭࣔ-࣡]/;
  function rich(s) {
    var h = esc(s);
    h = h.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    h = h.replace(/«([^»]+)»/g, function (m, inner) { return HARAKAT.test(inner) ? '<span class="ar">«' + inner + "»</span>" : m; });
    return h;
  }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  var LETTERS = ["الف", "ب", "ج", "د"];
  var LEVELS = { 1: ["یادداشت", "teal"], 2: ["فہم", "purple"], 3: ["تجزیہ و اطلاق", "gold"] };
  function toast(msg) {
    var t = $(".toast"); if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("show"); clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove("show"); }, 2200);
  }
  function meta() { return window.TOPICS_META || []; }
  function topicTitle(n) { var m = meta()[n - 1]; return m ? m.title : ""; }
  function pct(a, b) { return b ? Math.round((a / b) * 100) : 0; }
  function fmtDate(ts) { var d = new Date(ts); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }

  // ---------------- Global UI ----------------
  function initChrome() {
    var html = document.documentElement;
    var hb = $("#hamburger"), nav = $("#mainNav");
    if (hb && nav) hb.addEventListener("click", function () { var o = nav.classList.toggle("open"); hb.setAttribute("aria-expanded", o ? "true" : "false"); });
    var th = $("#themeBtn");
    if (th) th.addEventListener("click", function () {
      var cur = html.getAttribute("data-theme");
      if (!cur) cur = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      var nx = cur === "dark" ? "light" : "dark"; html.setAttribute("data-theme", nx); pref("theme", nx);
      toast(nx === "dark" ? "رات کا موڈ" : "دن کا موڈ");
    });
    function setFs(v) { v = Math.max(1, Math.min(4, v)); html.setAttribute("data-fs", String(v)); pref("fs", String(v)); }
    var up = $("#fsUp"), dn = $("#fsDown");
    if (up) up.addEventListener("click", function () { setFs(+(html.getAttribute("data-fs") || 2) + 1); });
    if (dn) dn.addEventListener("click", function () { setFs(+(html.getAttribute("data-fs") || 2) - 1); });
    if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
      window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
    }
  }

  // ---------------- Quiz engine ----------------
  function optionOrder(q, doShuffle) { var idx = [0, 1, 2, 3]; return doShuffle ? shuffle(idx) : idx; }
  // q: {id,t,q,o:[4],a,e,l}
  function mcqCard(q, n, onAnswer, opts) {
    opts = opts || {};
    var card = document.createElement("div"); card.className = "mcq"; card.dataset.id = q.id;
    var lv = LEVELS[q.l] || LEVELS[1];
    var head = '<div class="q"><span class="qn">' + n + "۔</span><span>" + rich(q.q) +
      ' <span class="pill ' + lv[1] + ' lvl">' + lv[0] + "</span>" + (opts.showTopic ? ' <span class="pill lvl">موضوع ' + q.t + "</span>" : "") + "</span></div>";
    var order = optionOrder(q, opts.shuffle !== false);
    var o = '<div class="opts" role="group">';
    order.forEach(function (oi, k) { o += '<button type="button" class="opt" data-oi="' + oi + '"><span class="ol">(' + LETTERS[k] + ")</span><span>" + rich(q.o[oi]) + "</span></button>"; });
    o += "</div>";
    var ex = '<div class="explain" aria-live="polite"><b>وضاحت:</b> ' + rich(q.e) + "</div>";
    card.innerHTML = head + o + ex;
    $$(".opt", card).forEach(function (b) {
      b.addEventListener("click", function () {
        if (card.classList.contains("answered")) return;
        var oi = +b.dataset.oi, ok = oi === q.a;
        card.classList.add("answered");
        $$(".opt", card).forEach(function (x) { x.disabled = true; if (+x.dataset.oi === q.a) x.classList.add("correct"); });
        if (!ok) b.classList.add("wrong");
        onAnswer && onAnswer(q, ok);
      });
    });
    return card;
  }
  function recordAnswer(q, ok) {
    var s = load();
    if (ok) delete s.wrong[q.id]; else s.wrong[q.id] = (s.wrong[q.id] || 0) + 1;
    save();
  }
  function practiceQuiz(root, questions, cfg) {
    cfg = cfg || {};
    var state = { answered: 0, correct: 0, list: questions.slice() };
    root.innerHTML = "";
    var bar = document.createElement("div"); bar.className = "quiz-bar";
    bar.innerHTML = '<span class="score" aria-live="polite"></span><span class="spacer"></span>' +
      '<button type="button" class="btn ghost" data-act="shuffle">ترتیب بدلیں</button>' +
      (cfg.allowWrongOnly ? '<button type="button" class="btn ghost" data-act="wrong">صرف غلط دوبارہ</button>' : "") +
      '<button type="button" class="btn" data-act="reset">دوبارہ شروع کریں</button>';
    var list = document.createElement("div");
    var res = document.createElement("div"); res.className = "card result hidden";
    root.appendChild(bar); root.appendChild(list); root.appendChild(res);
    function upd() {
      $(".score", bar).textContent = "سکور: " + state.correct + " / " + state.list.length + "  ·  جواب دیے: " + state.answered;
    }
    function finish() {
      var p = pct(state.correct, state.list.length);
      res.classList.remove("hidden");
      res.innerHTML = '<div class="big">' + p + '%</div><p>آپ نے ' + state.list.length + " میں سے " + state.correct + " سوالات کے درست جواب دیے۔</p><p class=\"muted\">" +
        (p >= 80 ? "شاندار! آپ اس موضوع پر اچھی گرفت رکھتے ہیں۔" : p >= 60 ? "اچھی کوشش! غلط سوالات کی وضاحتیں دوبارہ پڑھیں۔" : "مضمون اور خلاصہ دوبارہ پڑھ کر پھر کوشش کریں۔") + "</p>";
      cfg.onFinish && cfg.onFinish(state.correct, state.list.length);
    }
    function render(qs) {
      state.list = qs; state.answered = 0; state.correct = 0; list.innerHTML = ""; res.classList.add("hidden");
      if (!qs.length) { list.innerHTML = '<p class="empty">کوئی سوال موجود نہیں۔</p>'; upd(); return; }
      qs.forEach(function (q, i) {
        list.appendChild(mcqCard(q, i + 1, function (qq, ok) {
          state.answered++; if (ok) state.correct++; recordAnswer(qq, ok); upd();
          if (state.answered === state.list.length) finish();
        }, { showTopic: cfg.showTopic }));
      });
      upd();
    }
    bar.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      if (b.dataset.act === "reset") render(questions.slice());
      if (b.dataset.act === "shuffle") render(shuffle(questions));
      if (b.dataset.act === "wrong") {
        var w = load().wrong, qs = questions.filter(function (q) { return w[q.id]; });
        if (!qs.length) { toast("اس موضوع میں کوئی غلط سوال محفوظ نہیں"); return; }
        render(qs);
      }
      root.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    render(questions.slice());
  }

  // ---------------- Topic page ----------------
  function initTopic() {
    var num = +document.body.dataset.topic;
    var s = load();
    s.last = num; save();
    var tabs = $$(".tab"), panels = $$(".panel");
    function show(id, push) {
      if (!$("#p-" + id)) id = "article";
      tabs.forEach(function (t) { var on = t.dataset.tab === id; t.setAttribute("aria-selected", on ? "true" : "false"); t.tabIndex = on ? 0 : -1; if (on && t.scrollIntoView) { var tb = t.parentNode; tb.scrollLeft = t.offsetLeft - (tb.clientWidth - t.clientWidth) / 2; } });
      panels.forEach(function (p) { p.classList.toggle("active", p.id === "p-" + id); });
      if (push) history.replaceState(null, "", "#" + id);
      if (id === "quiz") ensureQuiz();
      if (id === "cards") ensureCards();
      $(".read-bar").style.display = id === "article" ? "" : "none";
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { show(t.dataset.tab, true); window.scrollTo({ top: $(".tabs").offsetTop - 70, behavior: "smooth" }); });
      t.addEventListener("keydown", function (e) {
        var k = e.key, j = i;
        if (k === "ArrowLeft") j = (i + 1) % tabs.length; else if (k === "ArrowRight") j = (i - 1 + tabs.length) % tabs.length; else return;
        e.preventDefault(); tabs[j].focus(); tabs[j].click();
      });
    });
    var h = (location.hash || "").slice(1);
    var sec = h && $("#" + CSS.escape(h));
    if (sec && !sec.classList.contains("panel") && $("#p-article").contains(sec)) { show("article"); setTimeout(function () { sec.scrollIntoView(); }, 50); }
    else show(h || "article");

    // reading bar + auto mark read
    var bar = $(".read-bar span"), art = $("#p-article");
    var endMark = $("#article-end");
    function onScroll() {
      if (!art.classList.contains("active")) return;
      var r = art.getBoundingClientRect(), vh = window.innerHeight;
      var p = Math.min(1, Math.max(0, (vh - r.top) / (r.height + vh * 0.2)));
      bar.style.width = (p * 100).toFixed(1) + "%";
      if (endMark && endMark.getBoundingClientRect().top < vh && !load().read[num]) { setRead(true, true); }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    var rb = $("#readBtn");
    function paintRead() { var r = !!load().read[num]; rb.textContent = r ? "✓ پڑھ لیا (نشان ہٹائیں)" : "مکمل پڑھ لیا — نشان لگائیں"; rb.classList.toggle("ghost", r); }
    function setRead(v, auto) { var st = load(); if (v) st.read[num] = Date.now(); else delete st.read[num]; save(); paintRead(); if (auto) toast("یہ موضوع \"پڑھ لیا\" میں شامل ہو گیا"); }
    rb.addEventListener("click", function () { setRead(!load().read[num]); });
    paintRead();

    // QA toggle all
    var qt = $("#qaToggle");
    if (qt) qt.addEventListener("click", function () {
      var ds = $$("#p-qa details"), open = !ds.every(function (d) { return d.open; });
      ds.forEach(function (d) { d.open = open; }); qt.textContent = open ? "سب بند کریں" : "سب کھولیں";
    });

    // topic select
    var sel = $("#topicSelect");
    if (sel) sel.addEventListener("change", function () { location.href = sel.value; });

    var quizDone = false;
    function ensureQuiz() {
      if (quizDone) return; quizDone = true;
      var qs = (window.MCQ || []).filter(function (q) { return q.t === num; });
      practiceQuiz($("#quizRoot"), qs, {
        allowWrongOnly: true,
        onFinish: function (c, tot) {
          var st = load(), prev = st.quiz[num] || {};
          st.quiz[num] = { best: Math.max(prev.best || 0, pct(c, tot)), last: pct(c, tot), at: Date.now() }; save();
        },
      });
    }
    var cardsDone = false;
    function ensureCards() {
      if (cardsDone) return; cardsDone = true;
      var data = JSON.parse($("#cardsData").textContent);
      var i = 0, order = data.slice();
      var stage = $("#cardsRoot");
      stage.innerHTML = '<div class="fc-stage"><div class="flash" tabindex="0" role="button" aria-label="کارڈ پلٹیں"><div class="flash-inner"><div class="flash-face flash-front"></div><div class="flash-face flash-back"></div></div></div>' +
        '<div class="fc-hint">کارڈ پر کلک کریں یا اسپیس دبائیں تاکہ جواب دیکھیں</div><div class="row"><button class="btn ghost" data-a="prev">پچھلا</button><span class="pill" id="fcCount"></span><button class="btn ghost" data-a="next">اگلا</button><button class="btn gold" data-a="shuffle">ترتیب بدلیں</button></div></div>';
      var fl = $(".flash", stage);
      function paint() {
        fl.classList.remove("flipped");
        $(".flash-front", stage).innerHTML = rich(order[i].f);
        $(".flash-back", stage).innerHTML = rich(order[i].b);
        $("#fcCount").textContent = (i + 1) + " / " + order.length;
      }
      fl.addEventListener("click", function () { fl.classList.toggle("flipped"); });
      fl.addEventListener("keydown", function (e) { if (e.key === " " || e.key === "Enter") { e.preventDefault(); fl.classList.toggle("flipped"); } if (e.key === "ArrowLeft") { i = (i + 1) % order.length; paint(); } if (e.key === "ArrowRight") { i = (i - 1 + order.length) % order.length; paint(); } });
      stage.addEventListener("click", function (e) {
        var b = e.target.closest("button"); if (!b) return;
        if (b.dataset.a === "next") i = (i + 1) % order.length;
        if (b.dataset.a === "prev") i = (i - 1 + order.length) % order.length;
        if (b.dataset.a === "shuffle") { order = shuffle(data); i = 0; }
        paint();
      });
      paint();
    }
  }

  // ---------------- Home & syllabus ----------------
  function paintProgressBits() {
    var s = load(), M = meta(), readN = Object.keys(s.read).length;
    $$("[data-read-count]").forEach(function (el) { el.textContent = readN + " / " + M.length; });
    $$("[data-read-meter]").forEach(function (el) { el.style.width = pct(readN, M.length) + "%"; });
    $$(".topic-card[data-t]").forEach(function (c) {
      var n = +c.dataset.t; if (s.read[n]) c.classList.add("done");
      var q = s.quiz[n]; var slot = $(".qscore", c);
      if (slot) slot.innerHTML = s.read[n] ? '<span class="pill ok">✓ پڑھ لیا</span>' + (q ? ' <span class="pill gold">کوئز: ' + q.best + "%</span>" : "") : (q ? '<span class="pill gold">کوئز: ' + q.best + "%</span>" : "");
    });
    var cont = $("#continue");
    if (cont) {
      var next = s.last || 1;
      if (s.read[next]) { for (var k = 1; k <= M.length; k++) if (!s.read[k]) { next = k; break; } }
      var m = M[next - 1];
      $("#contTitle").textContent = next + ". " + m.title;
      $("#contLink").href = m.url;
      $("#contLabel").textContent = readN ? "جہاں چھوڑا تھا وہیں سے جاری رکھیں" : "کورس کا آغاز یہاں سے کریں";
    }
  }

  // ---------------- Exam ----------------
  function initExam() {
    var ALL = window.MCQ || [], M = meta();
    var setup = $("#examSetup"), run = $("#examRun"), res = $("#examResult");
    var tbox = $("#examTopics");
    tbox.innerHTML = M.map(function (m) { return '<label><input type="checkbox" value="' + m.num + '" checked> ' + m.num + ". " + esc(m.title) + "</label>"; }).join("");
    var count = 20, timed = true;
    function seg(id, cb) { $$("#" + id + " button").forEach(function (b) { b.addEventListener("click", function () { $$("#" + id + " button").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); }); cb(b.dataset.v); }); }); }
    seg("examCount", function (v) { count = +v; });
    seg("examTimer", function (v) { timed = v === "1"; });
    $("#examAll").addEventListener("click", function () { var cbs = $$("#examTopics input"), all = cbs.every(function (c) { return c.checked; }); cbs.forEach(function (c) { c.checked = !all; }); });
    var Q = [], ans = [], cur = 0, t0 = 0, tick = null, limit = 0;
    $("#examStart").addEventListener("click", function () {
      var sel = $$("#examTopics input").filter(function (c) { return c.checked; }).map(function (c) { return +c.value; });
      if (!sel.length) { toast("کم از کم ایک موضوع منتخب کریں"); return; }
      // stratified random pick across selected topics
      var pool = {}; sel.forEach(function (t) { pool[t] = shuffle(ALL.filter(function (q) { return q.t === t; })); });
      Q = []; var n = Math.min(count, sel.reduce(function (a, t) { return a + pool[t].length; }, 0)); var k = 0;
      while (Q.length < n) { var t = sel[k % sel.length]; if (pool[t].length) Q.push(pool[t].pop()); k++; }
      Q = shuffle(Q).map(function (q) { var ord = shuffle([0, 1, 2, 3]); return { src: q, ord: ord }; });
      ans = Q.map(function () { return -1; }); cur = 0; t0 = Date.now(); limit = timed ? Q.length * 60 : 0;
      setup.classList.add("hidden"); res.classList.add("hidden"); run.classList.remove("hidden");
      buildPalette(); paintQ();
      clearInterval(tick);
      if (limit) { tick = setInterval(paintTimer, 500); } paintTimer();
      window.scrollTo({ top: 0 });
    });
    function paintTimer() {
      var el = $("#examTimerOut"), sp = Math.floor((Date.now() - t0) / 1000);
      if (!limit) { el.textContent = "⏱ " + mmss(sp); return; }
      var left = limit - sp; el.textContent = "⏱ " + mmss(Math.max(0, left)); el.classList.toggle("low", left < 60);
      if (left <= 0) { clearInterval(tick); toast("وقت ختم! امتحان جمع کر دیا گیا"); submit(); }
    }
    function mmss(s) { return ("0" + Math.floor(s / 60)).slice(-2) + ":" + ("0" + (s % 60)).slice(-2); }
    function buildPalette() {
      $("#examPalette").innerHTML = Q.map(function (_, i) { return '<button type="button" data-i="' + i + '">' + (i + 1) + "</button>"; }).join("");
    }
    $("#examPalette").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) { cur = +b.dataset.i; paintQ(); } });
    function paintQ() {
      var item = Q[cur], q = item.src, lv = LEVELS[q.l] || LEVELS[1];
      $("#examQ").innerHTML = '<div class="mcq"><div class="q"><span class="qn">' + (cur + 1) + "۔</span><span>" + rich(q.q) + ' <span class="pill ' + lv[1] + ' lvl">' + lv[0] + '</span> <span class="pill lvl">موضوع ' + q.t + "</span></span></div>" +
        '<div class="opts">' + item.ord.map(function (oi, k) { return '<button type="button" class="opt' + (ans[cur] === oi ? " chosen" : "") + '" data-oi="' + oi + '" aria-pressed="' + (ans[cur] === oi) + '"><span class="ol">(' + LETTERS[k] + ")</span><span>" + rich(q.o[oi]) + "</span></button>"; }).join("") + "</div></div>";
      $$("#examQ .opt").forEach(function (b) { b.addEventListener("click", function () { ans[cur] = +b.dataset.oi; paintQ(); }); });
      $$("#examPalette button").forEach(function (b, i) { b.classList.toggle("ans", ans[i] >= 0); b.classList.toggle("cur", i === cur); });
      $("#examProg").textContent = "سوال " + (cur + 1) + " از " + Q.length + " · جواب دیے: " + ans.filter(function (a) { return a >= 0; }).length;
      $("#examPrev").disabled = cur === 0; $("#examNext").disabled = cur === Q.length - 1;
    }
    $("#examPrev").addEventListener("click", function () { if (cur > 0) { cur--; paintQ(); } });
    $("#examNext").addEventListener("click", function () { if (cur < Q.length - 1) { cur++; paintQ(); } });
    var subBtn = $("#examSubmit"), armed = false;
    subBtn.addEventListener("click", function () {
      var un = ans.filter(function (a) { return a < 0; }).length;
      if (un && !armed) { armed = true; subBtn.textContent = un + " سوال باقی ہیں — پھر بھی جمع کریں؟"; setTimeout(function () { armed = false; subBtn.textContent = "امتحان جمع کریں"; }, 4000); return; }
      submit();
    });
    function submit() {
      clearInterval(tick); armed = false; subBtn.textContent = "امتحان جمع کریں";
      var dur = Math.floor((Date.now() - t0) / 1000), correct = 0, per = {}, st = load();
      Q.forEach(function (it, i) {
        var q = it.src, ok = ans[i] === q.a; if (ok) correct++;
        per[q.t] = per[q.t] || [0, 0]; per[q.t][1]++; if (ok) per[q.t][0]++;
        if (ok) delete st.wrong[q.id]; else st.wrong[q.id] = (st.wrong[q.id] || 0) + 1;
      });
      st.exams.unshift({ at: Date.now(), c: correct, n: Q.length, s: dur }); st.exams = st.exams.slice(0, 30); save();
      run.classList.add("hidden"); res.classList.remove("hidden");
      var p = pct(correct, Q.length), grade = p >= 90 ? "A+" : p >= 80 ? "A" : p >= 70 ? "B" : p >= 60 ? "C" : p >= 50 ? "D" : "F";
      var bars = Object.keys(per).sort(function (a, b) { return a - b; }).map(function (t) {
        var v = per[t], pp = pct(v[0], v[1]);
        return '<div class="bar-row"><span>' + t + ". " + esc(topicTitle(+t)) + '</span><div class="meter"><span style="width:' + pp + '%"></span></div><span class="num">' + v[0] + "/" + v[1] + "</span></div>";
      }).join("");
      $("#examSummary").innerHTML = '<div class="card result"><div class="big">' + p + '%</div><p><b>گریڈ: <span class="ltr">' + grade + "</span></b> · " + Q.length + " میں سے " + correct + " درست · وقت: <span class=\"ltr\">" + mmss(dur) + "</span></p>" +
        '<div class="row" style="justify-content:center"><button class="btn" id="examAgain">نیا امتحان</button><a class="btn ghost" href="progress.html">میری پیش رفت</a></div></div>' +
        '<div class="card section bars"><h2 class="section-title">موضوع وار کارکردگی</h2>' + bars + "</div>";
      $("#examAgain").addEventListener("click", function () { res.classList.add("hidden"); setup.classList.remove("hidden"); window.scrollTo({ top: 0 }); });
      var rv = $("#examReview"); rv.innerHTML = "";
      Q.forEach(function (it, i) {
        var q = it.src, card = mcqCard(q, i + 1, null, { showTopic: true, shuffle: false });
        card.classList.add("answered");
        $$(".opt", card).forEach(function (b) { b.disabled = true; var oi = +b.dataset.oi; if (oi === q.a) b.classList.add("correct"); else if (oi === ans[i]) b.classList.add("wrong"); });
        if (ans[i] < 0) card.insertAdjacentHTML("afterbegin", '<span class="pill">جواب نہیں دیا</span>');
        rv.appendChild(card);
      });
      window.scrollTo({ top: 0 });
    }
  }

  // ---------------- Progress ----------------
  function initProgress() {
    var s = load(), M = meta();
    var readN = Object.keys(s.read).length;
    var qs = Object.keys(s.quiz).map(function (k) { return s.quiz[k].best; });
    var avg = qs.length ? Math.round(qs.reduce(function (a, b) { return a + b; }, 0) / qs.length) : 0;
    $("#pgRead").textContent = readN + " / " + M.length;
    $("#pgQuiz").textContent = qs.length + " / " + M.length;
    $("#pgAvg").textContent = avg + "%";
    $("#pgWrong").textContent = Object.keys(s.wrong).length;
    $("#pgMeter").style.width = pct(readN, M.length) + "%";
    $("#pgTable").innerHTML = M.map(function (m) {
      var q = s.quiz[m.num];
      return "<tr><td>" + m.num + '</td><td><a href="' + m.url + '">' + esc(m.title) + "</a></td><td>" + (s.read[m.num] ? '<span class="pill ok">✓ پڑھ لیا</span>' : '<span class="pill">باقی</span>') + "</td><td>" + (q ? '<span class="ltr">' + q.best + "%</span>" : "—") + '</td><td><a href="' + m.url + '#quiz">کوئز</a></td></tr>';
    }).join("");
    var ex = s.exams;
    $("#pgExams").innerHTML = ex.length ? ex.map(function (e) { return "<tr><td><span class=\"ltr\">" + fmtDate(e.at) + "</span></td><td><span class=\"ltr\">" + e.c + " / " + e.n + "</span></td><td><span class=\"ltr\">" + pct(e.c, e.n) + "%</span></td></tr>"; }).join("") : '<tr><td colspan="3" class="empty">ابھی تک کوئی امتحان نہیں دیا گیا۔ <a href="exam.html">فائنل امتحان</a></td></tr>';
    var wbtn = $("#pgWrongBtn");
    wbtn.addEventListener("click", function () {
      var W = load().wrong, list = (window.MCQ || []).filter(function (q) { return W[q.id]; });
      if (!list.length) { toast("کوئی غلط سوال محفوظ نہیں — بہت خوب!"); return; }
      $("#pgReview").classList.remove("hidden");
      practiceQuiz($("#pgReviewRoot"), shuffle(list), { showTopic: true });
      $("#pgReview").scrollIntoView({ behavior: "smooth" });
    });
    var rst = $("#pgReset"), armed = false;
    rst.addEventListener("click", function () {
      if (!armed) { armed = true; rst.textContent = "یقینی ہیں؟ دوبارہ کلک کریں"; setTimeout(function () { armed = false; rst.textContent = "تمام پیش رفت صاف کریں"; }, 4000); return; }
      try { localStorage.removeItem(KEY); } catch (e) {} mem = null; location.reload();
    });
  }

  // ---------------- Glossary ----------------
  function norm(s) {
    return String(s).replace(/[ً-ٰٟۖ-ۭ]/g, "").replace(/[يى]/g, "ی").replace(/ك/g, "ک").replace(/[ةه]/g, "ہ").replace(/[أإآ]/g, "ا").replace(/ۂ/g, "ہ").replace(/ؤ/g, "و").replace(/\s+/g, " ").toLowerCase();
  }
  function initGlossary() {
    var inp = $("#glFilter"), items = $$(".gl-item");
    inp.addEventListener("input", function () {
      var v = norm(inp.value.trim()), n = 0;
      items.forEach(function (it) { var ok = !v || norm(it.textContent).indexOf(v) >= 0; it.classList.toggle("hidden", !ok); if (ok) n++; });
      $$(".gl-group").forEach(function (g) { g.classList.toggle("hidden", !$$(".gl-item:not(.hidden)", g).length); });
      $("#glCount").textContent = n + " اصطلاحات";
    });
  }

  // ---------------- Search ----------------
  function initSearch() {
    var idx = window.SEARCH || [], inp = $("#q"), out = $("#results");
    var prepared = idx.map(function (r) { return { r: r, n: norm(r.title + " " + r.text) }; });
    function snippet(text, words) {
      var nt = norm(text), pos = -1;
      for (var i = 0; i < words.length && pos < 0; i++) pos = nt.indexOf(words[i]);
      var start = Math.max(0, pos - 60), s = text.slice(start, start + 220);
      var h = esc((start > 0 ? "… " : "") + s + (start + 220 < text.length ? " …" : ""));
      words.forEach(function (w) { if (w.length < 2) return; try { h = h.replace(new RegExp("(" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "g"), "<mark>$1</mark>"); } catch (e) {} });
      return h;
    }
    var KIND = { a: "مضمون", q: "سوال و جواب", t: "اصطلاح", m: "غلط فہمی", s: "خلاصہ" };
    function run() {
      var v = inp.value.trim(); var words = norm(v).split(" ").filter(function (w) { return w.length > 1; });
      try { history.replaceState(null, "", v ? "?q=" + encodeURIComponent(v) : location.pathname); } catch (e) {}
      if (!words.length) { out.innerHTML = '<p class="empty">کوئی لفظ لکھیں، مثلاً "ابن الہیثم"، "قرنطینہ" یا "بگ بینگ"۔</p>'; return; }
      var hits = [];
      prepared.forEach(function (p) {
        var sc = 0; for (var i = 0; i < words.length; i++) { var k = p.n.indexOf(words[i]); if (k < 0) return; sc += 10 - Math.min(9, k / 200); if (norm(p.r.title).indexOf(words[i]) >= 0) sc += 15; }
        if (p.r.k === "t") sc += 5; hits.push([sc, p.r]);
      });
      hits.sort(function (a, b) { return b[0] - a[0]; });
      out.innerHTML = '<p class="muted small">' + hits.length + " نتائج</p>" + hits.slice(0, 60).map(function (h) {
        var r = h[1];
        return '<a class="sr" href="' + r.url + '"><h3>' + esc(r.title) + ' <span class="pill">' + KIND[r.k] + '</span> <span class="pill teal">موضوع ' + r.t + "</span></h3><p>" + snippet(r.text, words) + "</p></a>";
      }).join("") || '<p class="empty">کوئی نتیجہ نہیں ملا۔ کوئی اور لفظ آزمائیں۔</p>';
    }
    var t; inp.addEventListener("input", function () { clearTimeout(t); t = setTimeout(run, 150); });
    var q0 = new URLSearchParams(location.search).get("q"); if (q0) inp.value = q0;
    run(); inp.focus();
  }

  // ---------------- Timeline & map ----------------
  function initTimeline() {
    $$(".filters button").forEach(function (b) {
      b.addEventListener("click", function () {
        $$(".filters button").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        var f = b.dataset.f; $$(".tl-item").forEach(function (it) { it.classList.toggle("hidden", f !== "all" && it.dataset.f !== f); });
      });
    });
    var info = $("#mapInfo");
    function pick(el) {
      $$(".map .dot").forEach(function (d) { d.classList.toggle("sel", d === el); });
      info.innerHTML = "<h3 class=\"box-title\">" + esc(el.dataset.n) + "</h3><p>" + esc(el.dataset.d) + '</p><a href="' + el.dataset.url + '">متعلقہ موضوع پڑھیں ←</a>';
    }
    $$(".map .dot").forEach(function (d) {
      d.addEventListener("click", function () { pick(d); });
      d.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(d); } });
    });
  }

  // ---------------- Boot ----------------
  document.addEventListener("DOMContentLoaded", function () {
    initChrome();
    var p = document.body.dataset.page;
    try {
      if (p === "topic") initTopic();
      if (p === "home" || p === "syllabus") paintProgressBits();
      if (p === "exam") initExam();
      if (p === "progress") initProgress();
      if (p === "glossary") initGlossary();
      if (p === "search") initSearch();
      if (p === "timeline") initTimeline();
    } catch (e) { if (window.console) console.error(e); }
  });
})();
