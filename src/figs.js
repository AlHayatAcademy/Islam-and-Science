// Inline SVG diagrams. Colours come from CSS variables so they work in light and dark mode.
// Classes: fg-ink (text), fg-soft (muted text), fg-line (strokes), fg-a/fg-b/fg-c (accent fills), fg-card (box fill)
const T = (x, y, s, cls = "fg-ink", size = 16, extra = "") =>
  `<text x="${x}" y="${y}" class="${cls}" font-size="${size}" text-anchor="middle" ${extra}>${s}</text>`;
const box = (x, y, w, h, cls = "fg-card", r = 12) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" class="${cls}"/>`;
const arrowDefs = `<defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="fg-arrowhead"/></marker></defs>`;
const svg = (w, h, body, label) =>
  `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">${arrowDefs}${body}</svg>`;
const line = (x1, y1, x2, y2, extra = "") => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="fg-line" marker-end="url(#ah)" ${extra}/>`;
const path = (d, extra = "") => `<path d="${d}" class="fg-line" fill="none" marker-end="url(#ah)" ${extra}/>`;

module.exports = {
  method: () => {
    const cx = 300, cy = 190, R = 130;
    const steps = [`مشاہدہ و سوال`, `مفروضہ`, `تجربہ`, `تجزیہ`, `تکرار و اشاعت`];
    let b = "";
    const pts = steps.map((s, i) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / steps.length;
      return [cx + R * Math.cos(a), cy + R * Math.sin(a)];
    });
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      const k = 1.18;
      const qx = cx + (mx - cx) * k, qy = cy + (my - cy) * k;
      const sx = x1 + (x2 - x1) * 0.28, sy = y1 + (y2 - y1) * 0.28, ex = x1 + (x2 - x1) * 0.72, ey = y1 + (y2 - y1) * 0.72;
      b += path(`M${sx},${sy} Q${qx},${qy} ${ex},${ey}`);
    }
    pts.forEach(([x, y], i) => {
      b += box(x - 70, y - 24, 140, 48, i === 0 ? "fg-a" : "fg-card");
      b += T(x, y + 6, `${i + 1}. ${steps[i]}`, i === 0 ? "fg-on-a" : "fg-ink", 16);
    });
    b += T(cx, cy - 4, `سائنسی`, "fg-soft", 17) + T(cx, cy + 22, `طریقۂ کار`, "fg-soft", 17);
    return svg(600, 380, b, `سائنسی طریقۂ کار کے پانچ مراحل کا دائرہ`);
  },

  models: () => {
    const items = [
      [`تصادم`, `دونوں دشمن`, `ڈریپر، وائٹ`],
      [`علیحدگی`, `الگ دائرے`, `گولڈ (NOMA)`],
      [`مکالمہ`, `باہم گفتگو`, `اسلام کے قریب`],
      [`انضمام`, `مکمل امتزاج`, `احتیاط ضروری`],
    ];
    let b = "";
    const w = 132, gap = 12, x0 = 600 - 18 - w;
    items.forEach((it, i) => {
      const x = x0 - i * (w + gap);
      const hl = i === 2;
      b += box(x, 40, w, 150, hl ? "fg-a" : "fg-card");
      b += T(x + w / 2, 80, it[0], hl ? "fg-on-a" : "fg-ink", 20, 'font-weight="700"');
      b += T(x + w / 2, 122, it[1], hl ? "fg-on-a" : "fg-soft", 15);
      b += T(x + w / 2, 160, it[2], hl ? "fg-on-a" : "fg-soft", 14);
    });
    b += `<line x1="570" y1="222" x2="30" y2="222" class="fg-line" marker-end="url(#ah)"/>`;
    b += T(540, 250, `دوری`, "fg-soft", 14) + T(60, 250, `قربت`, "fg-soft", 14);
    return svg(600, 270, b, `ایان باربر کے چار نمونے: تصادم، علیحدگی، مکالمہ، انضمام`);
  },

  check: () => {
    const steps = [
      [`1. دعوے کا درجہ`, `قطعی؟ نظریہ؟ مفروضہ؟`],
      [`2. متعلقہ نص`, `آیت/حدیث اور اس کا درجہ`],
      [`3. تضاد کی نوعیت`, `حقیقی یا ظاہری؟`],
      [`4. فیصلہ`, `تعبیر پر غور یا انتظار`],
    ];
    let b = "";
    steps.forEach((s, i) => {
      const y = 20 + i * 88;
      b += box(150, y, 300, 64, i === 3 ? "fg-a" : "fg-card");
      b += T(300, y + 28, s[0], i === 3 ? "fg-on-a" : "fg-ink", 18, 'font-weight="700"');
      b += T(300, y + 52, s[1], i === 3 ? "fg-on-a" : "fg-soft", 14);
      if (i < 3) b += line(300, y + 66, 300, y + 86);
    });
    return svg(600, 380, b, `سائنسی دعوے کو پرکھنے کے چار مراحل`);
  },

  causality: () => {
    const cols = [
      [`غزالی (اشعری)`, `آگ ← (عادتِ الٰہی) ← جلنا`, `تعلق لازمی نہیں`, `اللہ ہر لمحہ خالق`],
      [`درمیانی مؤقف`, `آگ میں اثر ← اللہ کے حکم سے`, `اسباب حقیقی`, `مگر اللہ کے تابع`],
      [`ابن رشد`, `آگ کی فطرت ← جلنا`, `اشیاء کی خاصیتیں`, `اللہ کی رکھی ہوئی`],
    ];
    let b = "";
    const w = 180, gap = 15, x0 = 600 - 15 - w;
    cols.forEach((c, i) => {
      const x = x0 - i * (w + gap);
      b += box(x, 20, w, 190, i === 1 ? "fg-a-soft" : "fg-card");
      b += T(x + w / 2, 55, c[0], "fg-ink", 18, 'font-weight="700"');
      b += T(x + w / 2, 100, c[1], "fg-soft", 13);
      b += T(x + w / 2, 145, c[2], "fg-ink", 15);
      b += T(x + w / 2, 180, c[3], "fg-soft", 14);
    });
    b += box(150, 228, 300, 44, "fg-a") + T(300, 257, `تینوں: کائنات میں قابلِ اعتماد نظم ہے`, "fg-on-a", 15);
    return svg(600, 290, b, `علیت پر غزالی، درمیانی مؤقف اور ابن رشد کا موازنہ`);
  },

  translation: () => {
    let b = "";
    const src = [[`یونانی`, 480, 40], [`فارسی`, 480, 110], [`ہندی`, 480, 180]];
    src.forEach(([s, x, y]) => { b += box(x, y, 100, 44) + T(x + 50, y + 29, s, "fg-ink", 16); });
    b += box(250, 85, 150, 64, "fg-a") + T(325, 114, `بغداد`, "fg-on-a", 20, 'font-weight="700"') + T(325, 138, `بیت الحکمہ`, "fg-on-a", 13);
    src.forEach(([, x, y]) => { b += line(x - 2, y + 22, 402, 117); });
    b += box(60, 30, 130, 44) + T(125, 58, `طلیطلہ / صقلیہ`, "fg-ink", 15);
    b += box(60, 160, 130, 44, "fg-b") + T(125, 188, `یورپ (لاطینی)`, "fg-on-b", 15);
    b += path(`M250,105 Q210,60 192,52`);
    b += line(125, 76, 125, 158);
    b += T(325, 190, `ترجمہ + تنقید + اضافہ`, "fg-soft", 14);
    b += T(125, 235, `بارہویں صدی کے تراجم`, "fg-soft", 13);
    return svg(600, 250, b, `علم کا سفر: یونانی، فارسی اور ہندی علوم سے بغداد، پھر طلیطلہ اور صقلیہ کے راستے یورپ تک`);
  },

  vision: () => {
    let b = "";
    // sun
    b += `<circle cx="520" cy="60" r="30" class="fg-b"/>` + T(520, 115, `روشنی کا ماخذ`, "fg-soft", 14);
    // object
    b += box(270, 160, 90, 70, "fg-card", 8) + T(315, 202, `چیز`, "fg-ink", 16);
    // eye
    b += `<ellipse cx="90" cy="195" rx="46" ry="26" class="fg-card"/><circle cx="72" cy="195" r="12" class="fg-a"/>` + T(90, 250, `آنکھ`, "fg-soft", 15);
    b += line(495, 80, 362, 170);
    b += line(268, 195, 140, 195);
    b += T(430, 150, `① روشنی چیز پر پڑتی ہے`, "fg-ink", 14);
    b += T(205, 180, `② منعکس ہو کر آنکھ میں`, "fg-ink", 14);
    b += `<line x1="60" y1="60" x2="170" y2="150" class="fg-line fg-dash"/>` + `<line x1="60" y1="150" x2="170" y2="60" class="fg-line fg-dash"/>`;
    b += T(115, 45, `✗ آنکھ سے شعاعیں نہیں نکلتیں`, "fg-soft", 13);
    return svg(600, 270, b, `ابن الہیثم کا نظریۂ بصارت: روشنی چیز سے منعکس ہو کر آنکھ میں داخل ہوتی ہے`);
  },

  biruni: () => {
    let b = "";
    const cx = 200, cy = 330, R = 190;
    b += `<path d="M${cx - R},${cy} A${R},${R} 0 0 1 ${cx + R},${cy}" class="fg-line" fill="none"/>`;
    const px = cx, py = cy - R; // mountain base at top of circle
    const h = 55;
    b += `<polygon points="${px - 22},${py + 4} ${px},${py - h} ${px + 22},${py + 4}" class="fg-b"/>`;
    // tangent point
    const ang = Math.acos(R / (R + h));
    const tx = cx + R * Math.sin(ang), ty = cy - R * Math.cos(ang);
    b += `<line x1="${px}" y1="${py - h}" x2="${tx + 60}" y2="${ty + 60 * (ty - (py - h)) / (tx - px)}" class="fg-line"/>`;
    b += `<line x1="${px}" y1="${py - h}" x2="${px + 230}" y2="${py - h}" class="fg-line fg-dash"/>`;
    b += `<line x1="${cx}" y1="${cy}" x2="${tx}" y2="${ty}" class="fg-line fg-dash"/>`;
    b += `<line x1="${cx}" y1="${cy}" x2="${px}" y2="${py - h}" class="fg-line fg-dash"/>`;
    b += `<circle cx="${cx}" cy="${cy}" r="4" class="fg-a"/>`;
    b += T(px - 32, py - h + 4, `h`, "fg-ink", 18);
    b += T(cx - 16, cy - 90, `R`, "fg-ink", 18) + T(tx - 30, ty + 70, `R`, "fg-ink", 18);
    b += T(px + 120, py - h - 10, `افق کی سیدھ`, "fg-soft", 13);
    b += T(px + 70, py - h + 30, `جھکاؤ کا زاویہ`, "fg-ink", 13);
    b += T(470, 120, `R = h·cos α ÷ (1 − cos α)`, "fg-ink", 16, 'direction="ltr"');
    b += T(470, 160, `h: پہاڑی کی اونچائی`, "fg-soft", 14) + T(470, 185, `α: افق کے جھکاؤ کا زاویہ`, "fg-soft", 14);
    b += T(470, 225, `نتیجہ: تقریباً 6,300 کلومیٹر سے زائد`, "fg-ink", 14);
    b += T(470, 250, `(آج کی قدر ≈ 6,371 کلومیٹر)`, "fg-soft", 13);
    return svg(600, 340, b, `البیرونی کا طریقہ: پہاڑی کی اونچائی اور افق کے جھکاؤ کے زاویے سے زمین کا رداس`);
  },

  tusi: () => {
    let b = "";
    const cx = 200, cy = 160, R = 110, r = 55;
    b += `<circle cx="${cx}" cy="${cy}" r="${R}" class="fg-line" fill="none"/>`;
    const th = 0.7; // small circle centre angle
    const sx = cx + (R - r) * Math.cos(th), sy = cy - (R - r) * Math.sin(th);
    b += `<circle cx="${sx}" cy="${sy}" r="${r}" class="fg-a-soft"/>`;
    // point P moves on horizontal diameter: x = cx + R cos th
    const Px = cx + R * Math.cos(th), Py = cy;
    b += `<line x1="${cx - R}" y1="${cy}" x2="${cx + R}" y2="${cy}" class="fg-line fg-dash"/>`;
    b += `<circle cx="${Px}" cy="${Py}" r="6" class="fg-b"/>` + T(Px, Py + 26, `P`, "fg-ink", 16);
    b += `<circle cx="${sx}" cy="${sy}" r="3" class="fg-ink-fill"/>`;
    b += `<path d="M${cx - R + 10},${cy + 18} L${cx + R - 10},${cy + 18}" class="fg-line" marker-end="url(#ah)" marker-start="url(#ah)"/>`;
    b += T(470, 90, `بڑا دائرہ: رداس R`, "fg-ink", 15);
    b += T(470, 120, `چھوٹا دائرہ: رداس R/2`, "fg-ink", 15);
    b += T(470, 160, `چھوٹا دائرہ اندر گھومتا ہے`, "fg-soft", 14);
    b += T(470, 188, `نقطہ P صرف سیدھی لکیر پر`, "fg-soft", 14);
    b += T(470, 214, `آگے پیچھے حرکت کرتا ہے`, "fg-soft", 14);
    return svg(600, 300, b, `طوسی جوڑا: چھوٹا دائرہ بڑے دائرے کے اندر گھومتا ہے اور نقطہ سیدھی لکیر پر حرکت کرتا ہے`);
  },

  pulmonary: () => {
    const heart = (x, label, galen) => {
      let b = "";
      b += box(x, 70, 220, 150, "fg-card", 20);
      b += `<line x1="${x + 110}" y1="78" x2="${x + 110}" y2="212" class="fg-wall"/>`;
      b += T(x + 165, 150, `دایاں`, "fg-ink", 15) + T(x + 55, 150, `بایاں`, "fg-ink", 15);
      b += T(x + 110, 262, label, "fg-ink", 15, 'font-weight="700"');
      if (galen) {
        b += `<circle cx="${x + 110}" cy="120" r="4" class="fg-hole"/><circle cx="${x + 110}" cy="145" r="4" class="fg-hole"/><circle cx="${x + 110}" cy="170" r="4" class="fg-hole"/>`;
        b += line(x + 150, 145, x + 72, 145);
        b += T(x + 110, 55, `دیوار کے "سوراخ" (غلط)`, "fg-soft", 13);
      } else {
        b += box(x + 60, 8, 100, 34, "fg-a", 16) + T(x + 110, 31, `پھیپھڑے`, "fg-on-a", 14);
        b += path(`M${x + 170},90 Q${x + 180},40 ${x + 150},30`);
        b += path(`M${x + 70},30 Q${x + 40},40 ${x + 50},90`);
        b += T(x + 110, 238, `دیوار ٹھوس، کوئی سوراخ نہیں`, "fg-soft", 12);
      }
      return b;
    };
    return svg(600, 280, heart(330, `ابن النفیس (تقریباً 1242ء)`, false) + heart(50, `جالینوس (دوسری صدی)`, true), `جالینوس کا نظریہ بمقابلہ ابن النفیس کا ریوی دورانِ خون`);
  },

  expansion: () => {
    let b = "";
    b += `<path d="M560,150 C420,150 380,60 40,40 L40,260 C380,240 420,150 560,150 Z" class="fg-a-soft"/>`;
    b += `<circle cx="560" cy="150" r="9" class="fg-b"/>`;
    const labels = [[560, `گرم اور گنجان ابتدا`], [470, `ہلکے عناصر`], [370, `CMB (≈ 3.8 لاکھ سال)`], [250, `ستارے، کہکشائیں`], [90, `آج (13.8 ارب سال)`]];
    labels.forEach(([x, s], i) => { b += `<line x1="${x}" y1="275" x2="${x}" y2="285" class="fg-line"/>` + T(x, 305, s, "fg-ink", 13); });
    b += `<line x1="575" y1="280" x2="30" y2="280" class="fg-line" marker-end="url(#ah)"/>`;
    [[200, 110], [160, 190], [120, 140], [260, 170], [300, 120], [80, 90], [90, 210]].forEach(([x, y]) => { b += `<circle cx="${x}" cy="${y}" r="3.5" class="fg-ink-fill"/>`; });
    b += T(320, 30, `وقت کے ساتھ خلا کا پھیلاؤ ←`, "fg-soft", 14);
    return svg(600, 320, b, `بگ بینگ ماڈل: گرم اور گنجان ابتدا سے آج کی پھیلتی کائنات تک`);
  },

  evolution: () => {
    const items = [`مکمل انکار`, `انسانی استثنا`, `آدم کا استثنا`, `کوئی استثنا نہیں`];
    let b = `<line x1="570" y1="120" x2="30" y2="120" class="fg-line" marker-end="url(#ah)"/>`;
    items.forEach((s, i) => {
      const x = 510 - i * 150;
      b += `<circle cx="${x}" cy="120" r="12" class="${i === 1 || i === 2 ? "fg-a" : "fg-card"}"/>`;
      b += T(x, 80, s, "fg-ink", 15, 'font-weight="700"');
      b += T(x, 160, `${i + 1}`, "fg-soft", 14);
    });
    b += T(510, 200, `ارتقا کسی جاندار میں نہیں`, "fg-soft", 12) + T(360, 200, `انسان خاص تخلیق`, "fg-soft", 12) + T(210, 200, `صرف آدم و حوا خاص`, "fg-soft", 12) + T(60, 200, `جسم ارتقائی، روح الٰہی`, "fg-soft", 12);
    b += T(300, 30, `ارتقا کی کم قبولیت ← → زیادہ قبولیت`, "fg-soft", 14);
    return svg(600, 220, b, `ارتقا پر مسلم علماء کے چار مؤقف`);
  },

  maqasid: () => {
    const cx = 300, cy = 170;
    const items = [`دین`, `جان`, `عقل`, `نسل`, `مال`];
    let b = `<circle cx="${cx}" cy="${cy}" r="62" class="fg-a"/>` + T(cx, cy - 4, `مقاصدِ`, "fg-on-a", 17) + T(cx, cy + 22, `شریعت`, "fg-on-a", 17);
    items.forEach((s, i) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      const x = cx + 125 * Math.cos(a), y = cy + 125 * Math.sin(a);
      b += `<line x1="${cx + 64 * Math.cos(a)}" y1="${cy + 64 * Math.sin(a)}" x2="${cx + 92 * Math.cos(a)}" y2="${cy + 92 * Math.sin(a)}" class="fg-line"/>`;
      b += `<circle cx="${x}" cy="${y}" r="36" class="fg-card"/>` + T(x, y - 2, `حفظِ`, "fg-soft", 12) + T(x, y + 18, s, "fg-ink", 17, 'font-weight="700"');
    });
    return svg(600, 340, b, `مقاصدِ شریعت: دین، جان، عقل، نسل اور مال کی حفاظت`);
  },
};
