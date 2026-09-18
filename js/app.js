(function () {
  "use strict";

  var TOPICS = window.CONTENT.topics; // array of 15 topic objects

  // ---------------- Helpers ----------------
  function el(tag, opts) {
    opts = opts || {};
    var e = document.createElement(tag);
    if (opts.class) e.className = opts.class;
    if (opts.html !== undefined) e.innerHTML = opts.html;
    if (opts.text !== undefined) e.textContent = opts.text;
    if (opts.attrs) {
      for (var k in opts.attrs) e.setAttribute(k, opts.attrs[k]);
    }
    return e;
  }
  function topicByNum(n) {
    n = parseInt(n, 10);
    for (var i = 0; i < TOPICS.length; i++) {
      if (TOPICS[i].num === n) return TOPICS[i];
    }
    return TOPICS[0];
  }

  // Detects genuine quoted Qur'anic / Hadith Arabic inside otherwise-Urdu
  // text (e.g. حدیث "طَلَبُ الْعِلْمِ فَرِيضَةٌ..." کس کتاب میں مروی ہے؟) and
  // renders that quoted span in the Amiri Arabic font for clarity, while
  // leaving the surrounding Urdu (which may itself carry an ordinary izafat
  // kasra, e.g. "علمِ نافع") in the Nastaleeq font untouched. Detection is
  // based on Arabic vowelling marks that Urdu prose does not normally use
  // (fatha/damma/shadda/sukun/tanween/dagger-alif/Qur'anic annotation
  // signs) — the plain izafat kasra (ِ) is deliberately excluded so
  // ordinary Urdu words are never miscategorized.
  var STRONG_ARABIC_RE = /[ًٌٍَُّْٰؐ-ؚۖ-ۭࣔ-࣡]/;
  var QUOTE_RE = /"([^"]+)"/g;

  function appendRichText(container, text) {
    if (text === undefined || text === null) return;
    text = String(text);
    var re = new RegExp(QUOTE_RE.source, "g");
    var lastIndex = 0;
    var m;
    while ((m = re.exec(text)) !== null) {
      var quoted = m[1];
      if (STRONG_ARABIC_RE.test(quoted)) {
        if (m.index > lastIndex) {
          container.appendChild(document.createTextNode(text.slice(lastIndex, m.index)));
        }
        container.appendChild(el("span", { class: "quran", text: m[0] }));
        lastIndex = re.lastIndex;
      }
    }
    if (lastIndex < text.length) {
      container.appendChild(document.createTextNode(text.slice(lastIndex)));
    }
  }

  // ---------------- Sidebar / mobile select builders ----------------
  function buildSidebar(container, activeNum, onPick) {
    container.innerHTML = "";
    TOPICS.forEach(function (t) {
      var btn = el("button", { text: t.num + ". " + t.title });
      if (t.num === activeNum) btn.className = "active";
      btn.addEventListener("click", function () {
        onPick(t.num);
      });
      container.appendChild(btn);
    });
  }
  function buildMobileSelect(select, activeNum, onPick) {
    select.innerHTML = "";
    TOPICS.forEach(function (t) {
      var opt = el("option", { text: t.num + ". " + t.title });
      opt.value = t.num;
      if (t.num === activeNum) opt.selected = true;
      select.appendChild(opt);
    });
    select.onchange = function () {
      onPick(parseInt(select.value, 10));
    };
  }

  // ---------------- Syllabus page ----------------
  function renderSyllabus() {
    var list = document.getElementById("syllabusList");
    list.innerHTML = "";
    TOPICS.forEach(function (t) {
      var item = el("div", { class: "syllabus-item" });
      item.appendChild(el("div", { class: "syllabus-num", text: String(t.num) }));
      item.appendChild(el("div", { class: "syllabus-title", text: t.title }));
      var actions = el("div", { class: "syllabus-actions" });
      var a1 = el("a", { class: "pill pill-article", text: "مضمون" });
      a1.href = "#/articles/" + t.num;
      var a2 = el("a", { class: "pill pill-qa", text: "سوال و جواب" });
      a2.href = "#/qa/" + t.num;
      var a3 = el("a", { class: "pill pill-mcq", text: "MCQs" });
      a3.href = "#/mcq/" + t.num;
      actions.appendChild(a1);
      actions.appendChild(a2);
      actions.appendChild(a3);
      item.appendChild(actions);
      list.appendChild(item);
    });
  }

  // ---------------- Articles page ----------------
  function renderArticle(num) {
    var t = topicByNum(num);
    buildSidebar(document.getElementById("articlesSidebar"), t.num, function (n) {
      location.hash = "#/articles/" + n;
    });
    buildMobileSelect(document.getElementById("articlesSelect"), t.num, function (n) {
      location.hash = "#/articles/" + n;
    });
    var pane = document.getElementById("articlesContent");
    pane.innerHTML = "";
    pane.appendChild(el("h2", { class: "article-title", text: t.num + ". " + t.articleTitle }));
    var body = el("div", { class: "article-body" });
    t.article.forEach(function (b, idx) {
      if (b.type === "heading") {
        var h3 = el("h3");
        appendRichText(h3, b.text);
        body.appendChild(h3);
      } else if (b.type === "quote") {
        var box = el("div", { class: "quote-box" });
        box.appendChild(el("div", { class: "arabic quran", text: b.arabic }));
        box.appendChild(el("div", { class: "translation", text: b.translation }));
        box.appendChild(el("div", { class: "ref", text: b.ref }));
        body.appendChild(box);
      } else {
        var pClass = idx === 0 && b.bold ? "lead" : "";
        var pEl = el("p", { class: pClass });
        appendRichText(pEl, b.text);
        body.appendChild(pEl);
      }
    });
    pane.appendChild(body);
  }

  // ---------------- Q&A page ----------------
  function renderQA(num) {
    var t = topicByNum(num);
    buildSidebar(document.getElementById("qaSidebar"), t.num, function (n) {
      location.hash = "#/qa/" + n;
    });
    buildMobileSelect(document.getElementById("qaSelect"), t.num, function (n) {
      location.hash = "#/qa/" + n;
    });
    var wrap = document.getElementById("qaContent");
    wrap.innerHTML = "";
    t.qa.forEach(function (pair, i) {
      var item = el("div", { class: "qa-item" + (i === 0 ? " open" : "") });
      var q = el("div", { class: "qa-question" });
      var qTextSpan = el("span");
      qTextSpan.appendChild(document.createTextNode((i + 1) + "۔ "));
      appendRichText(qTextSpan, pair.q);
      q.appendChild(qTextSpan);
      q.appendChild(el("span", { class: "arrow", text: "▾" }));
      var a = el("div", { class: "qa-answer" });
      var aP = el("p");
      appendRichText(aP, pair.a);
      a.appendChild(aP);
      q.addEventListener("click", function () {
        item.classList.toggle("open");
      });
      item.appendChild(q);
      item.appendChild(a);
      wrap.appendChild(item);
    });
  }

  function wireQAToolbar() {
    var btn = document.getElementById("qaToggleAll");
    var expanded = false;
    btn.onclick = function () {
      expanded = !expanded;
      var items = document.querySelectorAll("#qaContent .qa-item");
      items.forEach(function (it) {
        if (expanded) it.classList.add("open");
        else it.classList.remove("open");
      });
      btn.textContent = expanded ? "سب بند کریں" : "سب کھولیں";
    };
  }

  // ---------------- MCQ page ----------------
  var mcqState = {}; // topicNum -> {answered: count, correct: count}

  function renderMCQ(num) {
    var t = topicByNum(num);
    buildSidebar(document.getElementById("mcqSidebar"), t.num, function (n) {
      location.hash = "#/mcq/" + n;
    });
    buildMobileSelect(document.getElementById("mcqSelect"), t.num, function (n) {
      location.hash = "#/mcq/" + n;
    });

    if (!mcqState[t.num]) mcqState[t.num] = { answered: 0, correct: 0, total: t.mcq.length };

    var wrap = document.getElementById("mcqContent");
    wrap.innerHTML = "";

    t.mcq.forEach(function (item, i) {
      var card = el("div", { class: "mcq-card" });
      var qline = el("div", { class: "mcq-q" });
      qline.appendChild(el("span", { class: "qnum", text: (i + 1) + "۔" }));
      appendRichText(qline, item.q);
      card.appendChild(qline);

      var optsWrap = el("div", { class: "mcq-options" });
      var letters = ["الف", "ب", "ج", "د"];
      item.options.forEach(function (optText, oi) {
        var btn = el("button", { class: "mcq-opt" });
        btn.appendChild(document.createTextNode("(" + letters[oi] + ") "));
        appendRichText(btn, optText);
        btn.addEventListener("click", function () {
          if (card.classList.contains("answered")) return;
          card.classList.add("answered");
          var allBtns = optsWrap.querySelectorAll(".mcq-opt");
          allBtns.forEach(function (b) {
            b.disabled = true;
          });
          if (oi === item.correctIndex) {
            btn.classList.add("correct");
            mcqState[t.num].correct++;
          } else {
            btn.classList.add("wrong");
            allBtns[item.correctIndex].classList.add("correct");
          }
          mcqState[t.num].answered++;
          updateScore(t.num);
        });
        optsWrap.appendChild(btn);
      });
      card.appendChild(optsWrap);

      var ansLine = el("div", { class: "mcq-answer-line" });
      ansLine.appendChild(document.createTextNode("درست جواب: (" + letters[item.correctIndex] + ") — "));
      appendRichText(ansLine, item.correctText);
      card.appendChild(ansLine);

      wrap.appendChild(card);
    });

    updateScore(t.num);
  }

  function updateScore(num) {
    var s = mcqState[num];
    document.getElementById("mcqScore").textContent = "سکور: " + s.correct + " / " + s.total + " (جواب دیئے: " + s.answered + ")";
  }

  function wireMCQToolbar(currentNumGetter) {
    document.getElementById("mcqReset").onclick = function () {
      var n = currentNumGetter();
      mcqState[n] = { answered: 0, correct: 0, total: topicByNum(n).mcq.length };
      renderMCQ(n);
    };
  }

  // ---------------- Router ----------------
  var currentArticleNum = 1,
    currentQANum = 1,
    currentMCQNum = 1;

  function showPage(id) {
    document.querySelectorAll(".page").forEach(function (p) {
      p.classList.remove("active");
    });
    document.getElementById(id).classList.add("active");
    document.querySelectorAll(".main-nav a").forEach(function (a) {
      a.classList.remove("active");
    });
  }

  function setActiveNav(route) {
    document.querySelectorAll(".main-nav a").forEach(function (a) {
      if (a.dataset.route === route) a.classList.add("active");
      else a.classList.remove("active");
    });
  }

  function route() {
    var hash = location.hash || "#/home";
    var parts = hash.replace(/^#\//, "").split("/");
    var page = parts[0] || "home";
    var topicNum = parts[1] ? parseInt(parts[1], 10) : null;

    // close mobile nav on navigation
    document.getElementById("mainNav").classList.remove("open");

    if (page === "home" || page === "") {
      showPage("page-home");
      setActiveNav("home");
    } else if (page === "syllabus") {
      showPage("page-syllabus");
      setActiveNav("syllabus");
      renderSyllabus();
    } else if (page === "articles") {
      currentArticleNum = topicNum || currentArticleNum || 1;
      showPage("page-articles");
      setActiveNav("articles");
      renderArticle(currentArticleNum);
    } else if (page === "qa") {
      currentQANum = topicNum || currentQANum || 1;
      showPage("page-qa");
      setActiveNav("qa");
      renderQA(currentQANum);
    } else if (page === "mcq") {
      currentMCQNum = topicNum || currentMCQNum || 1;
      showPage("page-mcq");
      setActiveNav("mcq");
      renderMCQ(currentMCQNum);
    } else {
      showPage("page-home");
      setActiveNav("home");
    }
    window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", route);
  window.addEventListener("DOMContentLoaded", function () {
    wireQAToolbar();
    wireMCQToolbar(function () {
      return currentMCQNum;
    });

    document.getElementById("hamburger").addEventListener("click", function () {
      document.getElementById("mainNav").classList.toggle("open");
    });

    route();
  });
})();
