#!/usr/bin/env node
/*
 * اسلام اور سائنس — static site builder (no dependencies)
 * Usage:  node build.js
 * Edit content in src/topics/*.js, src/extras.js, src/figs.js — then run the build.
 * Generated files: *.html, data/*.js, sw.js, sitemap.xml, robots.txt
 */
const fs = require("fs");
const path = require("path");
const ROOT = __dirname;
const CFG = require("./site.config.js");
const figs = require("./src/figs.js");
const extras = require("./src/extras.js");

// ---------------- load topics ----------------
const TOPICS = [];
for (let i = 1; ; i++) {
  const f = path.join(ROOT, "src/topics", String(i).padStart(2, "0") + ".js");
  if (!fs.existsSync(f)) break;
  const t = require(f);
  if (t.num !== i) throw new Error("topic number mismatch in " + f);
  TOPICS.push(t);
}
const N = TOPICS.length;
const slug = (n) => "topic-" + String(n).padStart(2, "0") + ".html";

// ---------------- validation ----------------
let errors = 0;
TOPICS.forEach((t) => {
  ["title", "fullTitle", "intro", "examQ"].forEach((k) => { if (!t[k]) { console.error(`topic ${t.num}: missing ${k}`); errors++; } });
  t.mcq.forEach((m, i) => {
    if (!m.q || !m.c || !m.e || !Array.isArray(m.w) || m.w.length !== 3) { console.error(`topic ${t.num} mcq ${i}: malformed`); errors++; }
    if (new Set([m.c, ...m.w]).size !== 4) { console.error(`topic ${t.num} mcq ${i}: duplicate options`); errors++; }
  });
  t.article.forEach((b) => { if (b.fig && !figs[b.fig]) { console.error(`topic ${t.num}: unknown figure ${b.fig}`); errors++; } });
});
if (errors) { console.error(errors + " validation error(s)"); process.exit(1); }

// ---------------- helpers ----------------
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const HARAKAT = /[\u064B-\u065F\u0670\u06D6-\u06ED\u08D4-\u08E1]/;
const LATIN = /([A-Za-z][A-Za-z0-9 .,'’:\-()&]*[A-Za-z0-9)])/g;
function rich(s) {
  let h = esc(s);
  h = h.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  h = h.replace(/«([^»]+)»/g, (m, inner) => (HARAKAT.test(inner) ? `<span class="ar">«${inner}»</span>` : m));
  return h;
}
function richBlock(s) {
  // supports "\n" paragraphs and "- " bullet lines (used in Q&A answers)
  const lines = String(s).split("\n");
  let out = "", list = [];
  const flush = () => { if (list.length) { out += "<ul>" + list.map((l) => "<li>" + rich(l) + "</li>").join("") + "</ul>"; list = []; } };
  lines.forEach((l) => { if (/^-\s/.test(l)) list.push(l.replace(/^-\s/, "")); else { flush(); if (l.trim()) out += "<p>" + rich(l) + "</p>"; } });
  flush();
  return out;
}
const plain = (s) => String(s).replace(/\*\*/g, "").replace(/[«»]/g, "");
const words = (s) => plain(s).split(/\s+/).filter(Boolean).length;
let anchorN = 0;
const abs = (p) => (CFG.siteUrl ? CFG.siteUrl.replace(/\/$/, "") + "/" + p : "");

// ---------------- icons ----------------
const I = {
  logo: `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="#fbf6ec" opacity=".15"/><path d="M40 14a20 20 0 1 0 0 36 16 16 0 1 1 0-36z" fill="#fbf6ec"/><circle cx="46" cy="16" r="3.2" fill="#e7b96a"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`,
  theme: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>`,
  menu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>`,
  book: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/></svg>`,
  list: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
  chart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/></svg>`,
  dict: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 4h10a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4z"/><path d="M8 9h6M8 13h4"/></svg>`,
  map: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/></svg>`,
  cards: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="6" width="14" height="14" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v12"/></svg>`,
};

// ---------------- page shell ----------------
const NAV = [
  ["index.html", "ہوم", "home"], ["syllabus.html", "نصاب", "syllabus"], ["glossary.html", "فرہنگ", "glossary"],
  ["timeline.html", "ٹائم لائن و نقشہ", "timeline"], ["exam.html", "فائنل امتحان", "exam"], ["progress.html", "میری پیش رفت", "progress"],
];
function shell({ file, page, title, desc, body, active, extraHead = "", scripts = [], bodyAttrs = "", ogType = "website" }) {
  const full = title === CFG.siteName ? title : `${title} — ${CFG.siteName}`;
  const canonical = abs(file === "index.html" ? "" : file);
  const og = abs("og.png");
  const nav = NAV.map(([h, l, k]) => `<a href="${h}"${k === active ? ' class="active" aria-current="page"' : ""}>${l}</a>`).join("");
  return `<!DOCTYPE html>
<html lang="ur" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(full)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="#0b5750">
${canonical ? `<link rel="canonical" href="${canonical}">` : ""}
<meta property="og:type" content="${ogType}">
<meta property="og:title" content="${esc(full)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:locale" content="ur_PK">
<meta property="og:site_name" content="${esc(CFG.siteName)}">
${canonical ? `<meta property="og:url" content="${canonical}">` : ""}
<meta property="og:image" content="${og || "og.png"}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/svg+xml" href="favicon.svg">
<link rel="apple-touch-icon" href="icons/icon-180.png">
<link rel="manifest" href="manifest.webmanifest">
<link rel="preload" href="fonts/NafeesNastaleeq.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/css/style.css">
<script>(function(){try{var d=document.documentElement,t=localStorage.getItem("isc-theme"),f=localStorage.getItem("isc-fs");if(t)d.setAttribute("data-theme",t);if(f)d.setAttribute("data-fs",f);}catch(e){}})();</script>
${extraHead}
</head>
<body data-page="${page}" ${bodyAttrs}>
<a class="skip" href="#main">مواد پر جائیں</a>
<header class="site-header">
  <div class="header-inner">
    <a class="brand" href="index.html">${I.logo}<span>${esc(CFG.siteName)}</span></a>
    <nav class="main-nav" id="mainNav" aria-label="مرکزی مینو">${nav}</nav>
    <div class="tools">
      <a class="icon-btn" href="search.html" aria-label="تلاش" title="تلاش">${I.search}</a>
      <button class="icon-btn" id="fsDown" type="button" aria-label="فونٹ چھوٹا کریں" title="فونٹ چھوٹا کریں"><span class="fs-label">A−</span></button>
      <button class="icon-btn" id="fsUp" type="button" aria-label="فونٹ بڑا کریں" title="فونٹ بڑا کریں"><span class="fs-label">A+</span></button>
      <button class="icon-btn" id="themeBtn" type="button" aria-label="دن / رات موڈ" title="دن / رات موڈ">${I.theme}</button>
      <button class="icon-btn hamburger" id="hamburger" type="button" aria-label="مینو" aria-expanded="false" aria-controls="mainNav">${I.menu}</button>
    </div>
  </div>
  ${page === "topic" ? '<div class="read-bar" aria-hidden="true"><span></span></div>' : ""}
</header>
<main id="main">
${body}
</main>
<footer class="site-footer">
  <p>${esc(CFG.siteName)} — ${esc(CFG.tagline)}</p>
  <p class="en">Powered by <a href="https://institute.drimranhayat.com/" target="_blank" rel="noopener">Al-Hayat Research Institute of Social Sciences</a> · <a href="https://drimranhayat.com/" target="_blank" rel="noopener">drimranhayat.com</a> · <a href="https://drimranhayat.com/contact" target="_blank" rel="noopener">Contact</a></p>
</footer>
<script src="data/meta.js"></script>
${scripts.map((s) => `<script src="${s}"></script>`).join("\n")}
<script src="assets/js/app.js"></script>
</body>
</html>
`;
}

// ---------------- derived data ----------------
const META = TOPICS.map((t) => {
  const w = t.article.reduce((a, b) => a + (b.p ? words(b.p) : b.list || b.olist ? words((b.list || b.olist).join(" ")) : b.note ? words(b.note) : 0), 0);
  return { num: t.num, title: t.title, fullTitle: t.fullTitle, intro: t.intro, url: slug(t.num), read: Math.max(3, Math.round(w / 140)), mcq: t.mcq.length, qa: t.qa.length, terms: t.terms.length };
});
// balanced answer positions: rotate correct index 0..3 across all questions (runtime also shuffles)
let rot = 0;
const MCQ = [];
TOPICS.forEach((t) => t.mcq.forEach((m, i) => {
  const a = rot++ % 4; const o = m.w.slice(); o.splice(a, 0, m.c);
  MCQ.push({ id: t.num + "-" + i, t: t.num, q: m.q, o, a, e: m.e, l: m.l || 1 });
}));
const stats = { topics: N, mcq: MCQ.length, qa: TOPICS.reduce((a, t) => a + t.qa.length, 0), terms: TOPICS.reduce((a, t) => a + t.terms.length, 0) };

// ---------------- topic pages ----------------
function renderArticle(t) {
  let html = "", toc = [];
  t.article.forEach((b) => {
    if (b.part) { const id = "s" + ++anchorN; toc.push([id, b.part, true]); html += `<h2 id="${id}" class="part-title" style="color:var(--gold);border-bottom:2px solid var(--gold-soft);padding-bottom:4px">${esc(b.part)}</h2>`; }
    else if (b.h) { const id = "s" + ++anchorN; toc.push([id, b.h]); html += `<h2 id="${id}">${rich(b.h)}</h2>`; }
    else if (b.p) html += `<p>${rich(b.p)}</p>`;
    else if (b.list) html += "<ul>" + b.list.map((x) => `<li>${rich(x)}</li>`).join("") + "</ul>";
    else if (b.olist) html += "<ol>" + b.olist.map((x) => `<li>${rich(x)}</li>`).join("") + "</ol>";
    else if (b.note) html += `<div class="note">${rich(b.note)}</div>`;
    else if (b.quote) html += `<blockquote class="quote"><span class="ar" lang="ar">${esc(b.quote.ar)}</span><span class="tr">"${rich(b.quote.ur)}"</span><span class="ref">(${esc(b.quote.ref)})</span></blockquote>`;
    else if (b.fig) html += `<figure class="fig">${figs[b.fig]()}${b.cap ? `<figcaption>${rich(b.cap)}</figcaption>` : ""}</figure>`;
    else if (b.table) html += `<div class="table-wrap"><table><thead><tr>${b.table.head.map((h) => `<th>${rich(h)}</th>`).join("")}</tr></thead><tbody>${b.table.rows.map((r) => "<tr>" + r.map((c) => `<td>${rich(c)}</td>`).join("") + "</tr>").join("")}</tbody></table></div>`;
  });
  return { html, toc };
}
function topicPage(t) {
  anchorN = 0;
  const m = META[t.num - 1];
  const { html: art, toc } = renderArticle(t);
  const prev = t.num > 1 ? META[t.num - 2] : null, next = t.num < N ? META[t.num] : null;
  const cards = [...t.terms.map((x) => ({ f: x.t, b: x.d })), ...t.qa.filter((q) => q.k === "مختصر").map((q) => ({ f: q.q, b: q.a.split("\n")[0] }))];
  const kinds = { مختصر: "teal", تفصیلی: "purple", تجزیاتی: "gold", موازنہ: "ok" };
  const body = `
<div class="wrap">
  <div class="topic-head">
    <div class="crumbs"><a href="index.html">ہوم</a> › <a href="syllabus.html">نصاب</a> › موضوع ${t.num}</div>
    <h1>${t.num}. ${esc(t.fullTitle)}</h1>
    <div class="row">
      <span class="pill teal">${I.clock.replace("<svg", '<svg style="width:14px;height:14px;vertical-align:middle"')} تقریباً ${m.read} منٹ مطالعہ</span>
      <span class="pill">${t.qa.length} سوال و جواب</span><span class="pill">${t.mcq.length} MCQs</span><span class="pill">${t.terms.length} اصطلاحات</span>
      <span class="spacer"></span>
      <label class="small muted" for="topicSelect" style="white-space:nowrap">موضوع بدلیں:</label>
      <select id="topicSelect" style="width:auto;max-width:260px">${META.map((x) => `<option value="${x.url}"${x.num === t.num ? " selected" : ""}>${x.num}. ${esc(x.title)}</option>`).join("")}</select>
    </div>
  </div>
  <div class="tabs" role="tablist" aria-label="موضوع کے حصے">
    <button class="tab" role="tab" data-tab="article" aria-controls="p-article">مضمون</button>
    <button class="tab" role="tab" data-tab="qa" aria-controls="p-qa">سوال و جواب</button>
    <button class="tab" role="tab" data-tab="myths" aria-controls="p-myths">غلط فہمیاں اور غور و فکر</button>
    <button class="tab" role="tab" data-tab="cards" aria-controls="p-cards">فلیش کارڈز</button>
    <button class="tab" role="tab" data-tab="quiz" aria-controls="p-quiz">کوئز (${t.mcq.length})</button>
  </div>

  <section class="panel" id="p-article" role="tabpanel" aria-label="مضمون">
    <div class="layout">
      <div>
        <div class="card objectives"><p class="box-title">اس موضوع کے اہداف: اسے پڑھ کر آپ</p><ul>${t.objectives.map((o) => `<li>${rich(o)}</li>`).join("")}</ul></div>
        <div class="examq"><b>امتحانی سوال:</b> ${rich(t.examQ)}</div>
        <article class="article">${art}</article>
        <div id="article-end"></div>
        <div class="card summary-box section" id="summary"><p class="box-title">اہم نکات (دہرائی کے لیے)</p><ol>${t.summary.map((s) => `<li>${rich(s)}</li>`).join("")}</ol></div>
        <div class="card terms section" id="terms"><p class="box-title">اہم اصطلاحات</p><dl>${t.terms.map((x) => `<dt>${esc(x.t)}</dt><dd>${rich(x.d)}</dd>`).join("")}</dl></div>
        <div class="card readings section" id="readings"><p class="box-title">مزید مطالعہ</p><ul>${t.readings.map((r) => `<li><b>${/[A-Za-z]/.test(r.t) ? `<span class="ltr">${esc(r.t)}</span>` : esc(r.t)}</b> — ${esc(r.a)}<br><span class="muted small">${esc(r.n)}</span></li>`).join("")}</ul></div>
        <div class="done-row"><button class="btn" id="readBtn" type="button">مکمل پڑھ لیا — نشان لگائیں</button><a class="btn gold" href="#quiz" onclick="document.querySelector('[data-tab=quiz]').click();return false;">اب کوئز حل کریں</a></div>
      </div>
      <aside class="aside">
        <nav class="card toc" aria-label="فہرستِ مضامین"><p class="box-title">اس مضمون میں</p>${toc.map(([id, h, part]) => `<a href="#${id}"${part ? ' style="color:var(--gold);font-weight:700"' : ""}>${rich(h)}</a>`).join("")}<a href="#summary">اہم نکات</a><a href="#terms">اصطلاحات</a><a href="#readings">مزید مطالعہ</a></nav>
      </aside>
    </div>
  </section>

  <section class="panel" id="p-qa" role="tabpanel" aria-label="سوال و جواب">
    <div class="row" style="margin-bottom:10px"><p class="muted small" style="margin:0">امتحان کی تیاری کے لیے مختصر اور تفصیلی سوالات۔ سوال پر کلک کر کے جواب دیکھیں۔</p><span class="spacer"></span><button class="btn ghost" id="qaToggle" type="button">سب کھولیں</button></div>
    ${t.qa.map((q, i) => `<details class="qa"${i === 0 ? " open" : ""}><summary><span class="qn">${i + 1}۔</span><span>${rich(q.q)} <span class="pill ${kinds[q.k] || ""} lvl">${esc(q.k)}</span></span><span class="chev" aria-hidden="true">▾</span></summary><div class="ans">${richBlock(q.a)}</div></details>`).join("\n")}
  </section>

  <section class="panel" id="p-myths" role="tabpanel" aria-label="غلط فہمیاں اور غور و فکر">
    <h2 class="section-title">عام غلط فہمیاں اور حقیقت</h2>
    ${t.myths.map((x) => `<div class="myth"><div class="m"><b>غلط فہمی:</b>${rich(x.m)}</div><div class="f"><b>حقیقت:</b>${rich(x.f)}</div></div>`).join("")}
    <div class="card section reflect"><h2 class="section-title">غور و فکر اور کلاس مباحثہ</h2><ol>${t.reflect.map((r) => `<li>${rich(r)}</li>`).join("")}</ol></div>
  </section>

  <section class="panel" id="p-cards" role="tabpanel" aria-label="فلیش کارڈز">
    <p class="muted small">اصطلاحات اور مختصر سوالات کے کارڈ۔ پہلے خود جواب سوچیں، پھر کارڈ پلٹ کر دیکھیں۔</p>
    <div id="cardsRoot"></div>
    <script type="application/json" id="cardsData">${JSON.stringify(cards).replace(/</g, "\\u003c")}</script>
  </section>

  <section class="panel" id="p-quiz" role="tabpanel" aria-label="کوئز">
    <p class="muted small">ہر جواب کے بعد وضاحت ظاہر ہوگی۔ ہر بار آپشنز کی ترتیب بدل جاتی ہے۔ غلط جوابات "میری پیش رفت" میں دہرائی کے لیے محفوظ ہو جاتے ہیں۔</p>
    <div id="quizRoot"></div>
  </section>

  <nav class="pn" aria-label="اگلا اور پچھلا موضوع">
    ${prev ? `<a class="card prev" href="${prev.url}"><small>→ پچھلا موضوع</small>${prev.num}. ${esc(prev.title)}</a>` : "<span></span>"}
    ${next ? `<a class="card next" href="${next.url}"><small>اگلا موضوع ←</small>${next.num}. ${esc(next.title)}</a>` : `<a class="card next" href="exam.html"><small>کورس مکمل ←</small>فائنل امتحان دیں</a>`}
  </nav>
</div>`;
  const ld = { "@context": "https://schema.org", "@type": "LearningResource", name: t.fullTitle, inLanguage: "ur", educationalLevel: "University", description: t.intro, isPartOf: { "@type": "Course", name: CFG.siteName } };
  return shell({ file: slug(t.num), page: "topic", title: `${t.num}. ${t.title}`, desc: t.intro, body, active: "syllabus", scripts: ["data/mcq.js"], bodyAttrs: `data-topic="${t.num}"`, ogType: "article", extraHead: `<script type="application/ld+json">${JSON.stringify(ld)}</script>` });
}

// ---------------- home ----------------
function topicCard(m) {
  return `<a class="card topic-card" data-t="${m.num}" href="${m.url}"><span class="tnum">${m.num}</span><span><h3>${esc(m.title)}</h3><p>${esc(m.intro)}</p><span class="meta"><span class="pill">${m.read} منٹ</span><span class="pill">${m.mcq} MCQs</span><span class="qscore"></span></span></span></a>`;
}
function home() {
  const feats = [
    ["syllabus.html", I.list, "نصاب اور مضامین", "15 موضوعات، آسان اور مربوط زبان میں، خاکوں اور قرآنی حوالوں کے ساتھ"],
    ["syllabus.html", I.book, "سوال و جواب", "ہر موضوع پر مختصر، تفصیلی اور تجزیاتی امتحانی سوالات"],
    ["exam.html", I.check, "فائنل امتحان", "تمام موضوعات سے ملے جلے سوالات، ٹائمر اور نتیجے کے تجزیے کے ساتھ"],
    ["progress.html", I.chart, "میری پیش رفت", "پڑھے گئے موضوعات، کوئز کے نمبر اور غلط سوالات کی دہرائی"],
    ["glossary.html", I.dict, "فرہنگِ اصطلاحات", `${stats.terms} اہم اصطلاحات کی آسان تعریفیں، ایک جگہ`],
    ["timeline.html", I.map, "ٹائم لائن اور نقشہ", "مسلم سائنسدانوں کا زمانہ اور علمی مراکز کا نقشہ"],
    ["search.html", I.search, "تلاش", "پورے کورس میں کوئی بھی لفظ یا نام تلاش کریں"],
    ["syllabus.html", I.cards, "فلیش کارڈز", "اصطلاحات اور اہم نکات کی تیز دہرائی"],
  ];
  const body = `
<div class="wrap">
  <section class="hero">
    <h1>اسلام اور سائنس</h1>
    <p>${esc(CFG.description)}</p>
    <div class="row"><a class="btn gold" href="${META[0].url}">پہلا موضوع شروع کریں</a><a class="btn ghost" href="syllabus.html">مکمل نصاب دیکھیں</a></div>
    <div class="stats">
      <div class="stat"><b>${stats.topics}</b><span>موضوعات</span></div>
      <div class="stat"><b>${stats.qa}</b><span>سوال و جواب</span></div>
      <div class="stat"><b>${stats.mcq}</b><span>MCQs مع وضاحت</span></div>
      <div class="stat"><b>${stats.terms}</b><span>اصطلاحات</span></div>
    </div>
  </section>

  <section class="section card continue" aria-label="پیش رفت">
    <div><p class="box-title" id="contLabel">کورس کا آغاز یہاں سے کریں</p><a id="contLink" href="${META[0].url}"><b id="contTitle">1. ${esc(META[0].title)}</b></a></div>
    <div class="meter" aria-hidden="true"><span data-read-meter style="width:0"></span></div>
    <span class="pill ok">پڑھ لیے: <span data-read-count>0 / ${N}</span></span>
  </section>

  <section class="section"><h2 class="section-title">اس ویب سائٹ پر آپ کیا کر سکتے ہیں</h2>
    <div class="grid grid-4">${feats.map(([h, ic, t, p]) => `<a class="card feature" href="${h}"><span class="fi">${ic}</span><span><h3>${t}</h3><p>${p}</p></span></a>`).join("")}</div>
  </section>

  <section class="section"><h2 class="section-title">کورس کا ڈھانچہ</h2>
    ${extras.units.map((u) => `<div class="unit"><h2>${esc(u.name)}</h2><div class="grid grid-2">${u.topics.map((n) => topicCard(META[n - 1])).join("")}</div></div>`).join("")}
  </section>

  <section class="section card">
    <h2 class="section-title">پڑھنے کا بہترین طریقہ</h2>
    <ol>
      <li>موضوع کے شروع میں <b>اہداف</b> اور <b>امتحانی سوال</b> پڑھیں۔</li>
      <li>مضمون پڑھیں، پھر <b>اہم نکات</b> اور <b>اصطلاحات</b> دہرائیں۔</li>
      <li><b>سوال و جواب</b> میں جواب دیکھنے سے پہلے خود جواب سوچیں۔</li>
      <li><b>غلط فہمیاں</b> والا حصہ پڑھیں اور دوستوں سے <b>غور و فکر</b> کے سوالات پر بات کریں۔</li>
      <li><b>کوئز</b> حل کریں اور غلط جوابات کی وضاحت پڑھیں۔</li>
      <li>آخر میں <b>فائنل امتحان</b> دیں اور <b>میری پیش رفت</b> میں غلط سوالات دہرائیں۔</li>
    </ol>
  </section>
</div>`;
  const ld = { "@context": "https://schema.org", "@type": "Course", name: CFG.siteName, description: CFG.description, inLanguage: "ur", provider: { "@type": "Organization", name: "Al-Hayat Research Institute of Social Sciences", url: "https://institute.drimranhayat.com/" }, hasPart: META.map((m) => ({ "@type": "LearningResource", name: m.fullTitle, url: abs(m.url) || m.url })) };
  return shell({ file: "index.html", page: "home", title: CFG.siteName, desc: CFG.description, body, active: "home", extraHead: `<script type="application/ld+json">${JSON.stringify(ld)}</script>` });
}

// ---------------- syllabus ----------------
function syllabus() {
  const body = `
<div class="wrap">
  <div class="page-head"><h1>نصاب — ${N} موضوعات</h1><p>کورس چار حصوں میں ہے۔ ہر موضوع میں مضمون، سوال و جواب، غلط فہمیاں، فلیش کارڈز اور کوئز شامل ہیں۔</p>
  <div class="row" style="margin-top:8px"><div class="meter" style="max-width:360px"><span data-read-meter style="width:0"></span></div><span class="pill ok">پڑھ لیے: <span data-read-count>0 / ${N}</span></span></div></div>
  ${extras.units.map((u) => `<div class="unit"><h2>${esc(u.name)}</h2><div class="grid grid-2">${u.topics.map((n) => topicCard(META[n - 1])).join("")}</div></div>`).join("")}
</div>`;
  return shell({ file: "syllabus.html", page: "syllabus", title: "نصاب", desc: `اسلام اور سائنس کورس کا مکمل نصاب: ${N} موضوعات۔`, body, active: "syllabus" });
}

// ---------------- exam ----------------
function exam() {
  const body = `
<div class="wrap">
  <div class="page-head"><h1>فائنل امتحان</h1><p>تمام یا منتخب موضوعات سے ملے جلے سوالات۔ ہر بار سوالات اور آپشنز کی ترتیب نئی ہوتی ہے۔</p></div>
  <section id="examSetup" class="card section">
    <p class="box-title">1. سوالات کی تعداد</p>
    <div class="seg" id="examCount" role="group" aria-label="سوالات کی تعداد"><button type="button" data-v="20" aria-pressed="true">20</button><button type="button" data-v="40" aria-pressed="false">40</button><button type="button" data-v="60" aria-pressed="false">60</button><button type="button" data-v="100" aria-pressed="false">100</button></div>
    <p class="box-title" style="margin-top:14px">2. ٹائمر (ہر سوال کے لیے ایک منٹ)</p>
    <div class="seg" id="examTimer" role="group" aria-label="ٹائمر"><button type="button" data-v="1" aria-pressed="true">ٹائمر کے ساتھ</button><button type="button" data-v="0" aria-pressed="false">بغیر ٹائمر</button></div>
    <div class="row" style="margin-top:14px"><p class="box-title" style="margin:0">3. موضوعات</p><button type="button" class="btn ghost" id="examAll">سب منتخب / غیر منتخب</button></div>
    <div class="chk" id="examTopics" style="margin-top:8px"></div>
    <div class="row" style="margin-top:18px"><button type="button" class="btn gold" id="examStart">امتحان شروع کریں</button></div>
  </section>
  <section id="examRun" class="hidden section">
    <div class="quiz-bar"><span id="examProg" class="score"></span><span class="spacer"></span><span id="examTimerOut" class="timer"></span></div>
    <div id="examQ"></div>
    <div class="row"><button type="button" class="btn ghost" id="examPrev">→ پچھلا</button><button type="button" class="btn ghost" id="examNext">اگلا ←</button><span class="spacer"></span><button type="button" class="btn gold" id="examSubmit">امتحان جمع کریں</button></div>
    <div class="card section"><p class="box-title">سوالات کا نقشہ</p><div class="palette" id="examPalette"></div></div>
  </section>
  <section id="examResult" class="hidden section">
    <div id="examSummary"></div>
    <h2 class="section-title section">جوابات کا جائزہ اور وضاحتیں</h2>
    <div id="examReview"></div>
  </section>
</div>`;
  return shell({ file: "exam.html", page: "exam", title: "فائنل امتحان", desc: "اسلام اور سائنس کورس کا فائنل امتحان: ملے جلے سوالات، ٹائمر اور تفصیلی نتیجہ۔", body, active: "exam", scripts: ["data/mcq.js"] });
}

// ---------------- progress ----------------
function progress() {
  const body = `
<div class="wrap">
  <div class="page-head"><h1>میری پیش رفت</h1><p>یہ معلومات صرف آپ کے اسی براؤزر میں محفوظ ہوتی ہیں۔</p></div>
  <div class="stats">
    <div class="stat"><b id="pgRead">0</b><span>پڑھے گئے موضوعات</span></div>
    <div class="stat"><b id="pgQuiz">0</b><span>مکمل کوئز</span></div>
    <div class="stat"><b id="pgAvg">0%</b><span>کوئز کا اوسط</span></div>
    <div class="stat"><b id="pgWrong">0</b><span>دہرائی کے سوال</span></div>
  </div>
  <div class="card section"><div class="row"><span class="box-title" style="margin:0">مجموعی پیش رفت</span><div class="meter"><span id="pgMeter" style="width:0"></span></div></div></div>
  <section class="card section">
    <h2 class="section-title">غلط جوابات کی دہرائی</h2>
    <p class="muted">جن سوالات کے آپ نے غلط جواب دیے، وہ یہاں جمع ہوتے ہیں۔ درست جواب دینے پر سوال فہرست سے نکل جاتا ہے۔</p>
    <button type="button" class="btn gold" id="pgWrongBtn">غلط سوالات کی مشق شروع کریں</button>
  </section>
  <section id="pgReview" class="section hidden"><div id="pgReviewRoot"></div></section>
  <section class="section"><h2 class="section-title">موضوع وار صورتِ حال</h2>
    <div class="table-wrap"><table><thead><tr><th>#</th><th>موضوع</th><th>مطالعہ</th><th>بہترین کوئز</th><th></th></tr></thead><tbody id="pgTable"></tbody></table></div>
  </section>
  <section class="section"><h2 class="section-title">امتحانات کی تاریخ</h2>
    <div class="table-wrap"><table><thead><tr><th>تاریخ</th><th>نمبر</th><th>فیصد</th></tr></thead><tbody id="pgExams"></tbody></table></div>
  </section>
  <div class="row section"><button type="button" class="btn danger" id="pgReset">تمام پیش رفت صاف کریں</button></div>
</div>`;
  return shell({ file: "progress.html", page: "progress", title: "میری پیش رفت", desc: "اسلام اور سائنس کورس میں آپ کی پیش رفت اور غلط سوالات کی دہرائی۔", body, active: "progress", scripts: ["data/mcq.js"] });
}

// ---------------- glossary ----------------
function glossary() {
  const all = [];
  TOPICS.forEach((t) => t.terms.forEach((x) => all.push({ ...x, n: t.num })));
  const collator = new Intl.Collator("ur");
  all.sort((a, b) => collator.compare(a.t, b.t));
  const groups = {};
  all.forEach((x) => { const ch = /[A-Za-z]/.test(x.t[0]) ? "A–Z" : x.t[0]; (groups[ch] = groups[ch] || []).push(x); });
  const keys = Object.keys(groups);
  const body = `
<div class="wrap">
  <div class="page-head"><h1>فرہنگِ اصطلاحات</h1><p>کورس کی تمام اہم اصطلاحات، حروفِ تہجی کی ترتیب سے۔ ہر اصطلاح کے ساتھ متعلقہ موضوع کا لنک ہے۔</p></div>
  <div class="card section"><label for="glFilter" class="box-title">اصطلاح تلاش کریں</label><input type="search" id="glFilter" placeholder="مثلاً: تسخیر، قرنطینہ، ریڈ شفٹ"><p class="muted small" id="glCount" style="margin:6px 0 0">${all.length} اصطلاحات</p>
  <div class="letters">${keys.map((k, i) => `<a href="#g${i}">${esc(k)}</a>`).join("")}</div></div>
  <div class="card">${keys.map((k, i) => `<div class="gl-group" id="g${i}"><h2 class="section-title" style="margin-top:14px">${esc(k)}</h2>${groups[k].map((x) => `<div class="gl-item"><h3>${esc(x.t)} <a class="pill teal" href="${slug(x.n)}#terms">موضوع ${x.n}</a></h3><p>${rich(x.d)}</p></div>`).join("")}</div>`).join("")}</div>
</div>`;
  return shell({ file: "glossary.html", page: "glossary", title: "فرہنگِ اصطلاحات", desc: `اسلام اور سائنس کورس کی ${all.length} اہم اصطلاحات کی آسان تعریفیں۔`, body, active: "glossary" });
}

// ---------------- timeline + map ----------------
function mapSvg() {
  const W = 900, H = 330, lon0 = -12, lon1 = 78, lat0 = 22, lat1 = 48.5;
  const X = (lon) => ((lon - lon0) / (lon1 - lon0)) * W, Y = (lat) => ((lat1 - lat) / (lat1 - lat0)) * H;
  const poly = (pts) => pts.map(([a, b]) => X(a).toFixed(1) + "," + Y(b).toFixed(1)).join(" ");
  const water = {
    atl: [[-12, 48.5], [-4.7, 48.5], [-4.7, 48.4], [-2.5, 47.3], [-1.2, 46.2], [-1.5, 43.4], [-4, 43.5], [-8, 43.7], [-9.3, 43], [-8.8, 41.8], [-8.7, 41], [-9.5, 38.7], [-8.8, 37.9], [-8.9, 37], [-7.4, 37.2], [-6.3, 36.6], [-5.6, 36], [-5.9, 35.8], [-6.8, 34], [-8.5, 33.2], [-9.8, 31], [-9.6, 30], [-11, 28.3], [-12, 27.8]],
    med: [[-5.6, 36], [-4.4, 36.7], [-2.1, 36.7], [-0.7, 37.6], [0.2, 38.8], [-0.3, 39.5], [0.9, 41], [3.2, 42], [3.1, 43.2], [4.8, 43.4], [7, 43.6], [8.8, 44.4], [10.5, 43.2], [12.5, 41.8], [15, 40.2], [15.6, 38.2], [16.5, 38.4], [18.5, 40.1], [16.6, 41.2], [14, 42.3], [12.3, 45.2], [13.6, 45.7], [16, 43.4], [19.4, 41.8], [19.5, 40], [21, 38.5], [21.7, 37], [22.5, 36.4], [24, 38], [22.9, 40.6], [23, 40.4], [26.3, 40.1], [27, 38.4], [28, 36.6], [30.7, 36.8], [34, 36.8], [36.2, 36.6], [35.9, 35.5], [35, 33], [34.5, 31.5], [32.3, 31.3], [29.9, 31.2], [25, 31.6], [20, 30.9], [19, 30.3], [15, 32.4], [11, 33.8], [10, 37.2], [3, 36.8], [-2, 35.1], [-5.2, 35.8]],
    black: [[28, 41.3], [29.1, 41.2], [31, 41.1], [35, 42], [38, 41], [41.5, 41.5], [41.7, 42.7], [39, 44.5], [37.5, 45.2], [35, 45], [33.5, 44.5], [32.5, 45.4], [30.5, 46.5], [29.7, 45.3], [28.6, 44], [28, 42.5]],
    casp: [[49, 46.6], [47, 45], [47.5, 43], [49.5, 40.5], [49, 38.5], [50.5, 37], [53.9, 37], [53.9, 39], [53, 40], [53, 42], [51, 44], [53, 45.5], [51, 47]],
    red: [[32.5, 29.9], [33.8, 27.5], [35.5, 24], [36.8, 22], [39.2, 22], [38, 24.5], [36.2, 26.8], [34.6, 28.2]],
    gulf: [[48, 30], [50, 29.9], [51.5, 27.9], [54, 26.8], [56.3, 27.2], [56.5, 26.3], [56.2, 25.3], [54.5, 24.2], [52, 24], [51.6, 26.2], [50.1, 26.2], [48.7, 27.5]],
    arab: [[56.5, 26.3], [57.3, 25.7], [61.6, 25.2], [66.6, 25.4], [68.5, 23.7], [70, 22.5], [72.6, 22.2], [72.8, 22], [59.8, 22], [59.8, 22.5], [58.5, 23.6], [56.4, 24.8]],
  };
  const sicily = [[12.4, 38.1], [15.6, 38.3], [15.1, 36.7], [12.4, 37.6]];
  const regions = [[-4.5, 39.2, "اندلس"], [3, 31.5, "مغرب"], [29.5, 27, "مصر"], [43.5, 31.2, "عراق"], [38, 34.8, "شام"], [34, 39, "اناطولیہ"], [53, 33, "فارس"], [63, 42.8, "ماوراء النہر"], [71.5, 29, "برصغیر"], [45, 24.5, "جزیرۂ عرب"]];
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="اسلامی تہذیب کے علمی مراکز کا نقشہ"><rect width="${W}" height="${H}" class="land"/>`;
  Object.values(water).forEach((p) => (s += `<polygon points="${poly(p)}" class="water"/>`));
  s += `<polygon points="${poly(sicily)}" class="land" stroke="var(--line)"/>`;
  regions.forEach(([a, b, n]) => (s += `<text x="${X(a)}" y="${Y(b)}" class="region" text-anchor="middle">${n}</text>`));
  extras.centers.forEach((c) => {
    s += `<circle cx="${X(c.lon).toFixed(1)}" cy="${Y(c.lat).toFixed(1)}" r="8" class="dot" tabindex="0" role="button" aria-label="${esc(c.n)}" data-n="${esc(c.n)}" data-d="${esc(c.d)}" data-url="${slug(c.t)}"/>`;
    s += `<text x="${X(c.lon).toFixed(1)}" y="${(Y(c.lat) - 13).toFixed(1)}" class="lbl" text-anchor="middle">${esc(c.n)}</text>`;
  });
  return s + "</svg>";
}
function timeline() {
  const fields = [...new Set(extras.timeline.map((e) => e.f))];
  const body = `
<div class="wrap">
  <div class="page-head"><h1>ٹائم لائن اور نقشہ</h1><p>مسلم سائنسدانوں کا زمانہ، اہم تاریخی واقعات اور علمی مراکز۔ کسی نام یا مقام پر کلک کر کے متعلقہ موضوع پڑھیں۔</p></div>
  <section class="section"><h2 class="section-title">علمی مراکز کا نقشہ</h2>
    <div class="map-wrap"><div class="map">${mapSvg()}</div><div class="map-info card" id="mapInfo"><p class="muted" style="margin:0">نقشے پر کسی سنہری نقطے پر کلک کریں۔</p></div></div>
    <p class="muted small">نقشہ تقریبی ہے اور صرف تعلیمی مقصد کے لیے بنایا گیا ہے۔</p>
  </section>
  <section class="section"><h2 class="section-title">ٹائم لائن (751ء تا 1938ء)</h2>
    <div class="filters" role="group" aria-label="شعبہ منتخب کریں"><button type="button" data-f="all" aria-pressed="true">سب</button>${fields.map((f) => `<button type="button" data-f="${esc(f)}" aria-pressed="false">${esc(f)}</button>`).join("")}</div>
    <div class="tl">${extras.timeline.map((e) => `<div class="tl-item${e.ev ? " ev" : ""}" data-f="${esc(e.f)}"><div class="card"><h3><span class="yr">${e.y === e.e ? e.y : e.y + "–" + e.e}</span> <a href="${slug(e.t)}">${esc(e.name)}</a> <span class="pill ${e.ev ? "gold" : "teal"}">${esc(e.f)}</span> <span class="pill">${esc(e.city)}</span></h3><p>${rich(e.d)}</p></div></div>`).join("")}</div>
  </section>
</div>`;
  return shell({ file: "timeline.html", page: "timeline", title: "ٹائم لائن اور نقشہ", desc: "مسلم سائنسدانوں کی ٹائم لائن اور اسلامی تہذیب کے علمی مراکز کا نقشہ۔", body, active: "timeline" });
}

// ---------------- search ----------------
function searchIndex() {
  const idx = [];
  TOPICS.forEach((t) => {
    anchorN = 0;
    let cur = { id: "", h: t.title }, buf = [];
    const flush = () => { if (buf.length) idx.push({ t: t.num, k: "a", title: `${t.num}. ${t.title} — ${plain(cur.h)}`, text: plain(buf.join(" ")), url: slug(t.num) + (cur.id ? "#" + cur.id : "#article") }); buf = []; };
    t.article.forEach((b) => {
      if (b.part || b.h) { flush(); cur = { id: "s" + ++anchorN, h: b.part || b.h }; }
      else if (b.p) buf.push(b.p); else if (b.note) buf.push(b.note); else if (b.list || b.olist) buf.push((b.list || b.olist).join(" "));
      else if (b.quote) buf.push(b.quote.ur + " " + b.quote.ref); else if (b.table) buf.push(b.table.rows.map((r) => r.join(" ")).join(" "));
    });
    flush();
    t.qa.forEach((q) => idx.push({ t: t.num, k: "q", title: plain(q.q), text: plain(q.a).replace(/\n- /g, " · "), url: slug(t.num) + "#qa" }));
    t.terms.forEach((x) => idx.push({ t: t.num, k: "t", title: x.t, text: plain(x.d), url: slug(t.num) + "#terms" }));
    t.myths.forEach((x) => idx.push({ t: t.num, k: "m", title: plain(x.m), text: plain(x.f), url: slug(t.num) + "#myths" }));
  });
  return idx;
}
function search() {
  const body = `
<div class="wrap">
  <div class="page-head"><h1>تلاش</h1><p>پورے کورس میں مضامین، سوال و جواب، اصطلاحات اور غلط فہمیوں میں تلاش کریں۔</p></div>
  <div class="card section"><label for="q" class="box-title">تلاش کا لفظ</label><input type="search" id="q" placeholder="مثلاً: ابن الہیثم، قرنطینہ، بگ بینگ، مقاصدِ شریعت" autocomplete="off"></div>
  <div class="card" id="results" aria-live="polite"></div>
</div>`;
  return shell({ file: "search.html", page: "search", title: "تلاش", desc: "اسلام اور سائنس کورس کے تمام مواد میں تلاش۔", body, active: "", scripts: ["data/search.js"] });
}

function notFound() {
  const body = `<div class="wrap"><div class="page-head" style="text-align:center;padding:60px 0"><h1>صفحہ نہیں ملا</h1><p>یہ صفحہ موجود نہیں۔ <a href="index.html">ہوم پیج</a> یا <a href="syllabus.html">نصاب</a> پر جائیں۔</p></div></div>`;
  return shell({ file: "404.html", page: "404", title: "صفحہ نہیں ملا", desc: "صفحہ نہیں ملا", body, active: "" });
}

// ---------------- write everything ----------------
function write(f, s) { fs.mkdirSync(path.dirname(path.join(ROOT, f)), { recursive: true }); fs.writeFileSync(path.join(ROOT, f), s); }
const pages = { "index.html": home(), "syllabus.html": syllabus(), "exam.html": exam(), "progress.html": progress(), "glossary.html": glossary(), "timeline.html": timeline(), "search.html": search(), "404.html": notFound() };
TOPICS.forEach((t) => (pages[slug(t.num)] = topicPage(t)));
// remove stale topic pages
fs.readdirSync(ROOT).filter((f) => /^topic-\d+\.html$/.test(f) && !pages[f]).forEach((f) => fs.unlinkSync(path.join(ROOT, f)));
Object.entries(pages).forEach(([f, s]) => write(f, s));
write("data/meta.js", "window.TOPICS_META=" + JSON.stringify(META) + ";\n");
write("data/mcq.js", "window.MCQ=" + JSON.stringify(MCQ) + ";\n");
write("data/search.js", "window.SEARCH=" + JSON.stringify(searchIndex()) + ";\n");

// service worker with precache list + version hash
const precache = ["./", ...Object.keys(pages), "data/meta.js", "data/mcq.js", "data/search.js", "assets/css/style.css", "assets/js/app.js", "favicon.svg", "manifest.webmanifest", "fonts/NafeesNastaleeq.woff2", "fonts/Amiri-Regular.woff2", "fonts/Amiri-Bold.woff2", "icons/icon-192.png", "icons/icon-512.png"];
const crypto = require("crypto");
const ver = crypto.createHash("md5").update(precache.map((f) => { try { return fs.readFileSync(path.join(ROOT, f === "./" ? "index.html" : f)); } catch (e) { return ""; } }).join("|")).digest("hex").slice(0, 10);
write("sw.js", `// Generated by build.js — offline support
const CACHE = "isc-${ver}";
const FILES = ${JSON.stringify(precache)};
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((r) => r || fetch(e.request).then((res) => { const cp = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, cp)); return res; }).catch(() => caches.match("404.html"))));
});
`);
if (CFG.siteUrl) {
  const u = CFG.siteUrl.replace(/\/$/, "");
  write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Object.keys(pages).filter((f) => f !== "404.html").map((f) => `  <url><loc>${u}/${f === "index.html" ? "" : f}</loc></url>`).join("\n")}\n</urlset>\n`);
  write("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${u}/sitemap.xml\n`);
} else {
  write("robots.txt", "User-agent: *\nAllow: /\n");
  try { fs.unlinkSync(path.join(ROOT, "sitemap.xml")); } catch (e) {}
}
console.log(`Built ${Object.keys(pages).length} pages · ${N} topics · ${MCQ.length} MCQs · ${stats.qa} Q&A · ${stats.terms} terms`);
