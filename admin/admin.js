// ໜ້າ admin ກາງ: ສະຖິຕິຄົນເຂົ້າ, feedback, ສະພາບເຊີບເວີ ແລະ ຄວາມປອດໄພ ຂອງທຸກເວັບ (ເມນູດ້ານຂ້າງ)
(() => {
  const $ = (id) => document.getElementById(id);
  const API = "/api/admin";
  const MONTHS = ["ມ.ກ.", "ກ.ພ.", "ມ.ນ.", "ມ.ສ.", "ພ.ພ.", "ມິ.ຖ.", "ກ.ລ.", "ສ.ຫ.", "ກ.ຍ.", "ຕ.ລ.", "ພ.ຈ.", "ທ.ວ."];
  const WEEKDAYS = ["ອາທິດ", "ຈັນ", "ອັງຄານ", "ພຸດ", "ພະຫັດ", "ສຸກ", "ເສົາ"];
  const DEVICE_NAMES = { mobile: "📱 ມືຖື", desktop: "💻 ຄອມ", tablet: "📟 ແທັບເລັດ" };
  // ຊື່ ແລະ ສີຂອງແຕ່ລະເວັບ — ສີຕິດກັບເວັບ (ບໍ່ປ່ຽນຕາມອັນດັບ), ເວັບທີ່ບໍ່ຢູ່ນີ້ໃຊ້ສີເທົາ
  const SITES = {
    lotto: ["🎲", "ສຸ່ມຫວຍ", 1], fakhan: ["🛍️", "ຝາກຮ້ານ", 2], hangan: ["💸", "HanGan", 3], festival: ["🪷", "ເທດສະການ", 4],
    electic: ["☀️", "TAWAN Solar", 5], oneday: ["🏋️", "oneday", 6], emenu: ["🍽️", "E-Menu", 7], room: ["🛋️", "ລອງຈັດຫ້ອງ", 8],
  };
  const EVENT_NAMES = { generate: "ສຸ່ມ" };
  const siteIcon = (id) => SITES[id]?.[0] || "🌐";
  const siteName = (id) => SITES[id]?.[1] || id;
  const siteColor = (id) => (SITES[id] ? `var(--s${SITES[id][2]})` : "var(--muted)");
  const PERIODS = [7, 30, 90];

  let statsData = null, feedbackItems = [], serverData = null;
  let view = "overview", period = 30, fbOnlyUnread = false, fbSite = "all";
  let serverTimer = null;
  try {
    view = localStorage.getItem("admin.view") || view;
    period = +localStorage.getItem("admin.period") || period;
  } catch {}
  const save = (k, v) => { try { localStorage.setItem(k, v); } catch {} };

  const onSite = ["vongpasith.site", "lotto-ramdom.online", "localhost", "127.0.0.1"].includes(location.hostname);
  if (!onSite) { $("offline").hidden = false; return; }

  // ສ້າງ element ແບບປອດໄພ (ໃຊ້ textContent ກັນ script ຈາກ feedback)
  function el(tag, cls, ...kids) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    for (const k of kids) if (k != null && k !== false) e.append(k instanceof Node ? k : String(k));
    return e;
  }
  const NS = "http://www.w3.org/2000/svg";
  function svg(tag, attrs = {}, text) {
    const n = document.createElementNS(NS, tag);
    for (const [a, v] of Object.entries(attrs)) n.setAttribute(a, v);
    if (text !== undefined) n.textContent = text;
    return n;
  }
  const fmt = (n) => (n || 0).toLocaleString("en-US");
  const short = (n) => (n >= 10000 ? (n / 1000).toFixed(n >= 100000 ? 0 : 1) + "k" : fmt(n));

  async function api(path, body) {
    const res = await fetch(API + path, body === undefined
      ? { credentials: "same-origin" }
      : { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.status === 401 && path !== "/login") { showLogin(); throw new Error("login"); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }
  function showLogin() {
    $("app").hidden = true;
    $("loginView").hidden = false;
    $("password").focus();
  }

  // ---------- ລວມຂໍ້ມູນລາຍວັນ ----------
  function lastDays(end, n) {
    const out = [];
    const t = new Date(end + "T00:00:00Z");
    for (let i = n - 1; i >= 0; i--) out.push(new Date(t - i * 86400_000).toISOString().slice(0, 10));
    return out;
  }
  const shiftDay = (d, n) => new Date(new Date(d + "T00:00:00Z").getTime() + n * 86400_000).toISOString().slice(0, 10);
  const dayLabel = (d) => { const [, m, day] = d.split("-"); return `${+day} ${MONTHS[+m - 1]}`; };
  function addMap(to, from = {}, prefix = "") {
    for (const [k, v] of Object.entries(from)) to[prefix + k] = (to[prefix + k] || 0) + v;
  }
  // ຄົນທີ່ເຂົ້າ 2 ເວັບ ນັບເປັນ 2
  function daysFor(ids, prefixPages) {
    const out = {};
    for (const id of ids) {
      for (const [date, d] of Object.entries(statsData.sites[id].days)) {
        const o = (out[date] ||= { views: 0, uniques: 0, feedback: 0, events: {}, devices: {}, refs: {}, pages: {} });
        o.views += d.views || 0;
        o.uniques += d.uniques || 0;
        o.feedback += d.feedback || 0;
        addMap(o.events, d.events);
        addMap(o.devices, d.devices);
        addMap(o.refs, d.refs);
        addMap(o.pages, d.pages, prefixPages ? siteIcon(id) + " " : "");
      }
    }
    return out;
  }
  const sum = (days, keys, field) => keys.reduce((s, k) => s + (days[k]?.[field] || 0), 0);
  function merge(days, keys, field) {
    const m = {};
    for (const k of keys) addMap(m, days[k]?.[field]);
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }

  // ---------- tooltip ----------
  const tip = $("tip");
  function showTip(e, title, rows) {
    tip.replaceChildren(el("div", "t", title), ...rows.map(([color, name, value]) => {
      const i = el("i");
      i.style.background = color;
      return el("div", "r", color ? i : "", el("span", "", name), el("b", "", value));
    }));
    tip.hidden = false;
    const r = tip.getBoundingClientRect();
    let x = e.clientX + 14, y = e.clientY + 14;
    if (x + r.width > innerWidth - 8) x = e.clientX - r.width - 14;
    if (y + r.height > innerHeight - 8) y = e.clientY - r.height - 14;
    tip.style.left = Math.max(8, x) + "px";
    tip.style.top = Math.max(8, y) + "px";
  }
  const hideTip = () => { tip.hidden = true; };

  // ---------- ກຣາຟ ----------
  // ຄ່າສູງສຸດຂອງແກນ = 4 ຂັ້ນ ທີ່ເປັນເລກງາມ ແລະ ເປັນຈຳນວນເຕັມ
  function niceMax(v) {
    const raw = Math.max(1, v / 4), p = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 3, 4, 5, 6, 8, 10].map((m) => m * p).find((s) => s >= raw && Number.isInteger(s)) || Math.ceil(raw);
    return step * 4;
  }
  // ສີ່ຫຼ່ຽມມົນສະເພາະດ້ານເທິງ (ປາຍແທ່ງ) ຕິດກັບເສັ້ນຖານ
  function topRounded(x, y, w, h, r) {
    r = Math.min(r, w / 2, h);
    return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
  }
  function frame(box, H) {
    const W = Math.max(280, Math.round(box.clientWidth || 600));
    const s = svg("svg", { viewBox: `0 0 ${W} ${H}`, role: "img" });
    return { W, H, s };
  }
  function yAxis(s, W, top, bottom, max, left, fmtY = short) {
    for (let i = 0; i <= 4; i++) {
      const v = (max / 4) * i, y = bottom - ((bottom - top) * i) / 4;
      s.append(svg("line", { x1: left, x2: W, y1: y, y2: y, class: i ? "grid-line" : "axis-line" }));
      s.append(svg("text", { x: left - 8, y: y + 4, "text-anchor": "end" }, fmtY(v)));
    }
  }
  function xLabels(s, labels, xAt, H, every) {
    labels.forEach((l, i) => {
      if (i % every && i !== labels.length - 1) return;
      if (i !== labels.length - 1 && labels.length - 1 - i < every / 2) return;
      s.append(svg("text", { x: xAt(i), y: H - 4, "text-anchor": "middle" }, l));
    });
  }

  // ແທ່ງ (ຊ້ອນກັນໄດ້) — series: [{name, color, values}]
  function barChart(box, { labels, tipTitles, series, H = 240, fmtY }) {
    const { W, s } = frame(box, H);
    const left = 40, top = 8, bottom = H - 24;
    const totals = labels.map((_, i) => series.reduce((a, se) => a + (se.values[i] || 0), 0));
    const max = niceMax(Math.max(...totals, 1));
    yAxis(s, W, top, bottom, max, left, fmtY);
    const n = labels.length, slot = (W - left) / n, bw = Math.max(2, Math.min(28, slot - (n > 60 ? 1 : 3)));
    const xAt = (i) => left + slot * i + slot / 2;
    const yv = (v) => ((bottom - top) * v) / max;
    labels.forEach((_, i) => {
      let y = bottom;
      const segs = series.filter((se) => se.values[i] > 0);
      segs.forEach((se, j) => {
        const h = yv(se.values[i]);
        const gap = j > 0 && h > 3 ? 2 : 0; // ຊ່ອງ 2px ລະຫວ່າງຊັ້ນ
        const last = j === segs.length - 1;
        const x = xAt(i) - bw / 2;
        s.append(last
          ? svg("path", { d: topRounded(x, y - h, bw, h - gap, 4), fill: se.color })
          : svg("rect", { x, y: y - h, width: bw, height: Math.max(0, h - gap), fill: se.color }));
        y -= h;
      });
    });
    const every = Math.ceil(n / Math.max(2, Math.floor((W - left) / 56)));
    xLabels(s, labels, xAt, H, every);
    // ພື້ນທີ່ hover ທັງຖັນ (ໃຫຍ່ກວ່າແທ່ງ)
    const hl = svg("rect", { y: top, height: bottom - top, width: slot, fill: "var(--text)", opacity: 0, rx: 4 });
    s.append(hl);
    const hit = svg("rect", { x: left, y: 0, width: W - left, height: H, fill: "transparent" });
    hit.addEventListener("pointermove", (e) => {
      const r = s.getBoundingClientRect();
      const i = Math.min(n - 1, Math.max(0, Math.floor(((e.clientX - r.left) * (W / r.width) - left) / slot)));
      hl.setAttribute("x", left + slot * i);
      hl.setAttribute("opacity", 0.05);
      const rows = series.filter((se) => se.values[i]).map((se) => [se.color, se.name, fmt(se.values[i])]);
      if (series.length > 1) rows.push(["", "ລວມ", fmt(totals[i])]);
      showTip(e, (tipTitles || labels)[i], rows.length ? rows : [["", "ບໍ່ມີ", "0"]]);
    });
    hit.addEventListener("pointerleave", () => { hl.setAttribute("opacity", 0); hideTip(); });
    s.append(hit);
    box.replaceChildren(s);
  }

  // ເສັ້ນ + ພື້ນ — series: [{name, color, values, area}], ມີເສັ້ນຊີ້ + tooltip
  function lineChart(box, { labels, tipTitles, series, H = 240, max: fixedMax, fmtY, fmtV = fmt }) {
    const { W, s } = frame(box, H);
    const left = 40, top = 8, bottom = H - 24, right = W - 6;
    const n = labels.length;
    const max = fixedMax || niceMax(Math.max(1, ...series.flatMap((se) => se.values.filter((v) => v != null))));
    yAxis(s, W, top, bottom, max, left, fmtY);
    const xAt = (i) => (n === 1 ? (left + right) / 2 : left + ((right - left) * i) / (n - 1));
    const yAt = (v) => bottom - ((bottom - top) * Math.min(v, max)) / max;
    for (const se of series) {
      const pts = se.values.map((v, i) => (v == null ? null : [xAt(i), yAt(v)])).filter(Boolean);
      if (!pts.length) continue;
      const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("");
      if (se.area) {
        const id = "g" + Math.random().toString(36).slice(2, 8);
        const grad = svg("linearGradient", { id, x1: 0, x2: 0, y1: 0, y2: 1 });
        grad.append(svg("stop", { offset: "0%", "stop-color": se.color, "stop-opacity": 0.28 }), svg("stop", { offset: "100%", "stop-color": se.color, "stop-opacity": 0 }));
        s.append(grad);
        s.append(svg("path", { d: `${d}L${pts.at(-1)[0]},${bottom}L${pts[0][0]},${bottom}Z`, fill: `url(#${id})` }));
      }
      s.append(svg("path", { d, fill: "none", stroke: se.color, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" }));
    }
    const every = Math.ceil(n / Math.max(2, Math.floor((right - left) / 64)));
    xLabels(s, labels, xAt, H, every);
    const cross = svg("line", { y1: top, y2: bottom, class: "cross", opacity: 0 });
    const dots = series.map((se) => svg("circle", { r: 4.5, fill: se.color, stroke: "var(--surface)", "stroke-width": 2, opacity: 0 }));
    s.append(cross, ...dots);
    const hit = svg("rect", { x: left, y: 0, width: right - left, height: H, fill: "transparent" });
    hit.addEventListener("pointermove", (e) => {
      const r = s.getBoundingClientRect();
      const x = (e.clientX - r.left) * (W / r.width);
      const i = n === 1 ? 0 : Math.min(n - 1, Math.max(0, Math.round(((x - left) / (right - left)) * (n - 1))));
      cross.setAttribute("x1", xAt(i)); cross.setAttribute("x2", xAt(i)); cross.setAttribute("opacity", 1);
      series.forEach((se, j) => {
        const v = se.values[i];
        dots[j].setAttribute("opacity", v == null ? 0 : 1);
        if (v != null) { dots[j].setAttribute("cx", xAt(i)); dots[j].setAttribute("cy", yAt(v)); }
      });
      showTip(e, (tipTitles || labels)[i], series.map((se) => [se.color, se.name, se.values[i] == null ? "—" : fmtV(se.values[i])]));
    });
    hit.addEventListener("pointerleave", () => { cross.setAttribute("opacity", 0); dots.forEach((d) => d.setAttribute("opacity", 0)); hideTip(); });
    s.append(hit);
    box.replaceChildren(s);
  }

  function sparkline(values, color, w = 200, h = 36) {
    const s = svg("svg", { viewBox: `0 0 ${w} ${h}`, preserveAspectRatio: "none", "aria-hidden": "true" });
    if (values.length < 2) return s;
    const max = Math.max(1, ...values), pad = 3;
    const pts = values.map((v, i) => [(w * i) / (values.length - 1), h - pad - ((h - pad * 2) * v) / max]);
    const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("");
    s.append(svg("path", { d: `${d}L${w},${h}L0,${h}Z`, fill: color, opacity: 0.12 }));
    s.append(svg("path", { d, fill: "none", stroke: color, "stroke-width": 2, "vector-effect": "non-scaling-stroke", "stroke-linejoin": "round" }));
    return s;
  }

  function hbars(rows, { color = "var(--s1)", total } = {}) {
    if (!rows.length) return el("div", "empty", "ຍັງບໍ່ມີຂໍ້ມູນ");
    const max = Math.max(1, ...rows.map((r) => r[1]));
    const all = total ?? rows.reduce((a, r) => a + r[1], 0);
    return el("div", "hbars", ...rows.map(([name, v]) => {
      const fill = el("div", "fill");
      fill.style.width = `${(v / max) * 100}%`;
      fill.style.background = color;
      const nm = el("span", "name", name);
      nm.title = name;
      return el("div", "hbar",
        el("div", "top", nm, el("span", "num", fmt(v), all ? el("small", "", Math.round((v / all) * 100) + "%") : "")),
        el("div", "track", fill));
    }));
  }

  function splitBar(rows, colors) {
    const total = rows.reduce((a, r) => a + r[1], 0);
    if (!total) return el("div", "empty", "ຍັງບໍ່ມີຂໍ້ມູນ");
    const bar = el("div", "split");
    const legend = el("div", "split-legend");
    rows.forEach(([name, v], i) => {
      const seg = el("div");
      seg.style.width = `${(v / total) * 100}%`;
      seg.style.background = colors[i % colors.length];
      seg.title = `${name}: ${fmt(v)}`;
      bar.append(seg);
      const sw = el("i");
      sw.style.background = colors[i % colors.length];
      legend.append(el("div", "row", sw, el("span", "", name), el("b", "", fmt(v)), el("small", "", Math.round((v / total) * 100) + "%")));
    });
    return el("div", "", bar, legend);
  }

  // ---------- ສ່ວນປະກອບ ----------
  function card(title, sub, ...body) {
    return el("section", "card", el("div", "card-head", el("h2", "", title), sub ? el("span", "muted", sub) : ""), ...body);
  }
  function deltaEl(cur, prev) {
    if (!prev && !cur) return el("span", "delta flat", "—");
    if (!prev) return el("span", "delta up", "▲ ໃໝ່");
    const p = Math.round(((cur - prev) / prev) * 100);
    return el("span", "delta " + (p > 0 ? "up" : p < 0 ? "down" : "flat"), `${p > 0 ? "▲" : p < 0 ? "▼" : "•"} ${Math.abs(p)}%`);
  }
  function kpi(label, value, foot, spark) {
    const box = el("section", "card kpi", el("div", "label", label), el("div", "value", value));
    if (foot) box.append(el("div", "foot", ...[].concat(foot)));
    if (spark) box.append(el("div", "spark", spark));
    return box;
  }
  const legend = (items) => el("div", "legend", ...items.map(([color, name, line]) => {
    const i = el("i", line ? "line" : "");
    i.style.background = color;
    return el("span", "", i, name);
  }));
  const chartBox = () => el("div", "chart");
  // ວາດກຣາຟຫຼັງຈາກ element ຢູ່ໃນໜ້າແລ້ວ (ຕ້ອງຮູ້ຄວາມກວ້າງ)
  let drawQueue = [];
  const later = (fn) => drawQueue.push(fn);
  function flushDraw() { const q = drawQueue; drawQueue = []; q.forEach((f) => f()); }

  // ---------- ໜ້າສະຖິຕິ (ພາບລວມ / ແຕ່ລະເວັບ) ----------
  function periodData(ids, prefixPages) {
    const { today } = statsData;
    const days = daysFor(ids, prefixPages);
    const keys = lastDays(today, period);
    const prevKeys = lastDays(shiftDay(today, -period), period);
    return { today, days, keys, prevKeys };
  }
  function weekdayRows(days, keys) {
    const tot = Array(7).fill(0), cnt = Array(7).fill(0);
    for (const k of keys) {
      const w = new Date(k + "T00:00:00Z").getUTCDay();
      tot[w] += days[k]?.uniques || 0;
      cnt[w]++;
    }
    return [1, 2, 3, 4, 5, 6, 0].map((w) => [WEEKDAYS[w], cnt[w] ? Math.round(tot[w] / cnt[w]) : 0]);
  }
  function statKpis(days, keys, prevKeys, unread, totalFb) {
    const u = sum(days, keys, "uniques"), pu = sum(days, prevKeys, "uniques");
    const v = sum(days, keys, "views"), pv = sum(days, prevKeys, "views");
    const today = statsData.today;
    const ev = merge(days, keys, "events").map(([k, n]) => `${EVENT_NAMES[k] || k} ${fmt(n)}`).join(" · ");
    return el("div", "grid g4",
      kpi("👥 ຄົນເຂົ້າ", fmt(u), [deltaEl(u, pu), `ທຽບ ${period} ມື້ກ່ອນ`], sparkline(keys.map((k) => days[k]?.uniques || 0), "var(--s1)")),
      kpi("📄 ເປີດໜ້າ", fmt(v), [deltaEl(v, pv), ev || `${(u ? v / u : 0).toFixed(1)} ໜ້າ/ຄົນ`], sparkline(keys.map((k) => days[k]?.views || 0), "var(--s2)")),
      kpi("📅 ມື້ນີ້", fmt(days[today]?.uniques), [`${fmt(days[today]?.views)} ເທື່ອ`, `ສະເລ່ຍ ${fmt(Math.round(u / period))}/ມື້`]),
      kpi("💬 Feedback", fmt(totalFb), [unread ? el("span", "delta down", `ຍັງບໍ່ອ່ານ ${fmt(unread)}`) : "ອ່ານໝົດແລ້ວ ✓", `${fmt(sum(days, keys, "feedback"))} ໃນ ${period} ມື້`]),
    );
  }
  function trafficCards(days, keys) {
    const devRows = merge(days, keys, "devices").map(([k, v]) => [DEVICE_NAMES[k] || k, v]);
    const refRows = merge(days, keys, "refs").slice(0, 8).map(([k, v]) => [k === "direct" ? "ພິມເອງ / ບໍ່ຮູ້" : k, v]);
    const wd = chartBox();
    later(() => barChart(wd, { labels: weekdayRows(days, keys).map((r) => r[0].slice(0, 3)), tipTitles: weekdayRows(days, keys).map((r) => "ວັນ" + r[0] + " (ສະເລ່ຍ)"), series: [{ name: "ຄົນເຂົ້າ", color: "var(--s1)", values: weekdayRows(days, keys).map((r) => r[1]) }], H: 180 }));
    return [
      el("div", "grid g2",
        card("ອຸປະກອນ", `${period} ມື້`, splitBar(devRows, ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)"])),
        card("ມາຈາກໃສ", `${period} ມື້`, hbars(refRows, { color: "var(--s3)" }))),
      el("div", "grid g2",
        card("ໜ້າທີ່ເປີດຫຼາຍ", `${period} ມື້`, hbars(merge(days, keys, "pages").slice(0, 10), { color: "var(--s7)" })),
        card("ຄົນເຂົ້າຕາມວັນໃນອາທິດ", "ສະເລ່ຍຕໍ່ມື້", wd)),
    ];
  }

  function renderOverview() {
    const ids = Object.keys(statsData.sites);
    const { days, keys, prevKeys } = periodData(ids, true);
    const unread = ids.reduce((s, id) => s + statsData.sites[id].unread, 0);
    const totalFb = ids.reduce((s, id) => s + statsData.sites[id].totalFeedback, 0);

    // ຄົນເຂົ້າແຍກຕາມເວັບ (ແທ່ງຊ້ອນ)
    const ordered = [...ids].sort((a, b) => (SITES[a]?.[2] || 99) - (SITES[b]?.[2] || 99));
    const series = ordered.map((id) => ({ name: siteName(id), color: siteColor(id), values: keys.map((k) => statsData.sites[id].days[k]?.uniques || 0) }))
      .filter((se) => se.values.some(Boolean));
    const stack = chartBox();
    later(() => barChart(stack, { labels: keys.map(dayLabel), tipTitles: keys, series: series.length ? series : [{ name: "ຄົນເຂົ້າ", color: "var(--s1)", values: keys.map(() => 0) }] }));

    // ຕາຕະລາງທຸກເວັບ
    const rows = ordered.map((id) => {
      const d = statsData.sites[id].days;
      const u = sum(d, keys, "uniques"), pu = sum(d, prevKeys, "uniques");
      return { id, u, pu, v: sum(d, keys, "views"), t: d[statsData.today]?.uniques || 0, spark: keys.map((k) => d[k]?.uniques || 0) };
    }).sort((a, b) => b.u - a.u);
    const tbody = el("tbody");
    for (const r of rows) {
      const sw = el("i");
      sw.style.background = siteColor(r.id);
      const sp = sparkline(r.spark, siteColor(r.id), 96, 26);
      sp.setAttribute("class", "mini-spark");
      const unreadN = statsData.sites[r.id].unread;
      const tr = el("tr", "click",
        el("td", "", el("div", "site-cell", sw, el("div", "", `${siteIcon(r.id)} ${siteName(r.id)}`, el("small", "", statsData.sites[r.id].hosts[0] || "ຍັງບໍ່ລົງທະບຽນໂດເມນ")))),
        el("td", "num", fmt(r.t)),
        el("td", "num", fmt(r.u)),
        el("td", "num", deltaEl(r.u, r.pu)),
        el("td", "num", fmt(r.v)),
        el("td", "", sp),
        el("td", "num", unreadN ? el("span", "count hot", unreadN) : "—"));
      tr.addEventListener("click", () => go("site:" + r.id));
      tbody.append(tr);
    }
    const table = el("div", "table-wrap", el("table", "",
      el("thead", "", el("tr", "", el("th", "", "ເວັບ"), el("th", "num", "ມື້ນີ້"), el("th", "num", `${period} ມື້`), el("th", "num", "ປ່ຽນແປງ"), el("th", "num", "ເປີດໜ້າ"), el("th", "", "ແນວໂນ້ມ"), el("th", "num", "ບໍ່ອ່ານ"))),
      tbody));

    $("content").replaceChildren(
      statKpis(days, keys, prevKeys, unread, totalFb),
      el("div", "grid g3",
        card("ຄົນເຂົ້າແຍກຕາມເວັບ", `${period} ມື້ຫຼ້າສຸດ`, legend(series.map((se) => [se.color, se.name])), stack),
        serverMini()),
      card("ທຸກເວັບ", "ກົດເພື່ອເບິ່ງລາຍລະອຽດ", table),
      ...trafficCards(days, keys),
    );
  }

  function serverMini() {
    const s = serverData;
    if (!s) return card("🖥️ ເຊີບເວີ", "", el("div", "empty", "ກຳລັງໂຫຼດ…"));
    const probs = problems(s);
    const bad = probs.filter((p) => p.level === "bad").length;
    const memP = pct(s.mem.used, s.mem.total), diskP = s.disk ? pct(s.disk.used, s.disk.total) : 0;
    const up = s.sites.filter((w) => w.status && w.status < 500).length;
    const box = card("🖥️ ເຊີບເວີ", s.host,
      el("div", "rows",
        el("div", "srow", el("span", "name", "ສະຖານະ"), statusEl(bad ? "bad" : probs.length ? "warn" : "ok", bad ? `ມີບັນຫາ ${bad}` : probs.length ? `ຄວນເບິ່ງ ${probs.length}` : "ປົກກະຕິ")),
        el("div", "srow", el("span", "name", "ເວັບທີ່ເຂົ້າໄດ້"), el("span", "col", `${up} / ${s.sites.length}`)),
        el("div", "srow", el("span", "name", "CPU"), el("span", "col", `${Math.round(s.cpu)}%`)),
        el("div", "srow", el("span", "name", "RAM"), el("span", "col", `${memP}%`)),
        el("div", "srow", el("span", "name", "ດິສກ໌"), el("span", "col", `${diskP}%`)),
        el("div", "srow", el("span", "name", "ເດົາລະຫັດ SSH 24 ຊມ"), el("span", "col", fmt(s.security.sshFails24h)))),
      el("button", "btn sm", "ເບິ່ງລາຍລະອຽດ →"));
    box.querySelector("button").addEventListener("click", () => go("server"));
    return box;
  }

  function renderSite(id) {
    const site = statsData.sites[id];
    const { days, keys, prevKeys } = periodData([id], false);
    const line = chartBox();
    later(() => lineChart(line, {
      labels: keys.map(dayLabel), tipTitles: keys,
      series: [
        { name: "ຄົນ (ບໍ່ຊ້ຳ)", color: "var(--s1)", values: keys.map((k) => days[k]?.uniques || 0), area: true },
        { name: "ເປີດໜ້າ", color: "var(--s2)", values: keys.map((k) => days[k]?.views || 0) },
      ],
    }));
    const recent = feedbackItems.filter((f) => f.site === id).slice(0, 3);
    const more = el("button", "btn sm", "ເບິ່ງ feedback ທັງໝົດ →");
    more.addEventListener("click", () => { fbSite = id; go("feedback"); });
    $("content").replaceChildren(
      statKpis(days, keys, prevKeys, site.unread, site.totalFeedback),
      card("ຄົນເຂົ້າ ແລະ ເປີດໜ້າ", `${period} ມື້ຫຼ້າສຸດ`, legend([["var(--s1)", "ຄົນ (ບໍ່ຊ້ຳ)", 1], ["var(--s2)", "ເປີດໜ້າ", 1]]), line),
      ...trafficCards(days, keys),
      card("Feedback ຫຼ້າສຸດ", `ທັງໝົດ ${fmt(site.totalFeedback)}`,
        recent.length ? el("div", "fb-list", ...recent.map((f) => fbCard(f, false))) : el("div", "empty", "ຍັງບໍ່ມີ feedback"),
        recent.length ? el("div", "", more) : ""),
    );
  }

  // ---------- feedback ----------
  function timeText(iso) {
    return new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Vientiane", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }
  function fbCard(f, showSite) {
    const c = el("article", "fb" + (f.read ? "" : " unread"));
    const meta = el("div", "meta");
    if (showSite) {
      const i = el("i");
      i.style.background = siteColor(f.site);
      meta.append(el("span", "site-tag", i, siteName(f.site)));
    }
    meta.append(el("span", "", timeText(f.time)));
    if (f.rating) meta.append(el("span", "stars", "★".repeat(f.rating) + "☆".repeat(5 - f.rating)));
    meta.append(el("span", "", DEVICE_NAMES[f.device] || f.device || ""));
    if (f.page) meta.append(el("span", "", f.page));
    c.append(meta, el("div", "msg", f.message));
    if (f.contact) c.append(el("div", "contact", "📞 " + f.contact));
    const readBtn = el("button", "btn sm", f.read ? "ໝາຍວ່າຍັງບໍ່ອ່ານ" : "✓ ອ່ານແລ້ວ");
    readBtn.addEventListener("click", async () => {
      await api("/feedback/read", { id: f.id, read: !f.read });
      f.read = !f.read;
      await refreshStats();
    });
    const delBtn = el("button", "btn sm danger", "ລຶບ");
    let armed = false;
    delBtn.addEventListener("click", async () => {
      if (!armed) { armed = true; delBtn.textContent = "ກົດອີກເທື່ອເພື່ອຢືນຢັນ"; setTimeout(() => { armed = false; delBtn.textContent = "ລຶບ"; }, 3000); return; }
      await api("/feedback/delete", { id: f.id });
      feedbackItems = feedbackItems.filter((x) => x.id !== f.id);
      await refreshStats();
    });
    c.append(el("div", "actions", readBtn, delBtn));
    return c;
  }
  function renderFeedback() {
    const ids = Object.keys(statsData.sites).filter((id) => statsData.sites[id].totalFeedback);
    const chip = (label, on, fn) => { const b = el("button", "chip" + (on ? " on" : ""), label); b.addEventListener("click", fn); return b; };
    const items = feedbackItems.filter((f) => (fbSite === "all" || f.site === fbSite) && (!fbOnlyUnread || !f.read));
    $("content").replaceChildren(
      el("div", "fb-tools",
        el("div", "chips", chip("ທັງໝົດ", !fbOnlyUnread, () => { fbOnlyUnread = false; render(); }), chip("ຍັງບໍ່ອ່ານ", fbOnlyUnread, () => { fbOnlyUnread = true; render(); })),
        el("div", "chips", chip("ທຸກເວັບ", fbSite === "all", () => { fbSite = "all"; render(); }),
          ...ids.map((id) => chip(siteName(id), fbSite === id, () => { fbSite = id; render(); })))),
      items.length ? el("div", "fb-list", ...items.map((f) => fbCard(f, fbSite === "all"))) : card("", "", el("div", "empty", fbOnlyUnread ? "ອ່ານໝົດແລ້ວ 🎉" : "ຍັງບໍ່ມີ feedback")),
    );
  }

  // ---------- ເຊີບເວີ ----------
  const GB = (b) => (b / 1024 ** 3).toFixed(1) + " GB";
  const MB = (b) => (b == null ? "—" : Math.round(b / 1024 ** 2) + " MB");
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  function ago(ms) {
    const s = Math.max(0, (Date.now() - ms) / 1000);
    if (s < 90) return "ຫາກໍ່";
    if (s < 5400) return `${Math.round(s / 60)} ນາທີກ່ອນ`;
    if (s < 129600) return `${Math.round(s / 3600)} ຊົ່ວໂມງກ່ອນ`;
    return `${Math.round(s / 86400)} ມື້ກ່ອນ`;
  }
  function duration(sec) {
    const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
    return d ? `${d} ມື້ ${h} ຊມ` : h ? `${h} ຊມ ${m} ນທ` : `${m} ນາທີ`;
  }
  const LEVEL_TEXT = { ok: "ປົກກະຕິ", warn: "ຄວນເບິ່ງ", bad: "ມີບັນຫາ" };
  const statusEl = (level, text) => el("span", "st " + level, text || LEVEL_TEXT[level]);
  const level = (p, warn, bad) => (p >= bad ? "bad" : p >= warn ? "warn" : "ok");
  const LEVEL_COLOR = { ok: "var(--good)", warn: "var(--warn)", bad: "var(--crit)" };
  function srow(name, ...cols) {
    return el("div", "srow", name instanceof Node ? name : el("span", "name", name), ...cols.map((c) => (c instanceof Node ? c : el("span", "col", c))));
  }
  function gauge(label, p, sub, lv) {
    const r = 26, c = 2 * Math.PI * r;
    const s = svg("svg", { viewBox: "0 0 64 64", "aria-hidden": "true" });
    s.append(svg("circle", { cx: 32, cy: 32, r, fill: "none", class: "bg", "stroke-width": 7 }));
    s.append(svg("circle", { cx: 32, cy: 32, r, fill: "none", stroke: LEVEL_COLOR[lv], "stroke-width": 7, "stroke-linecap": "round", "stroke-dasharray": `${(c * Math.min(p, 100)) / 100} ${c}` }));
    return el("section", "card kpi",
      el("div", "label", label),
      el("div", "gauge", s, el("div", "", el("div", "val", `${p}%`), statusEl(lv))),
      el("div", "foot", sub));
  }

  // ລາຍການບັນຫາ (bad = ຕ້ອງແກ້ດ່ວນ, warn = ຄວນແກ້); kind ແຍກ ເຊີບເວີ / ຄວາມປອດໄພ
  function problems(s) {
    const out = [], sec = s.security;
    const add = (lv, kind, text) => out.push({ level: lv, kind, text });
    for (const u of s.units) if (u.state !== "active") add("bad", "srv", `Service ${u.name} ບໍ່ເຮັດວຽກ`);
    for (const p of s.ports) if (!p.ok) add("bad", "srv", `${p.name} (ພອດ ${p.port}) ບໍ່ຕອບ`);
    for (const w of s.sites) {
      if (!w.status || w.status >= 500) add("bad", "srv", `ເວັບ ${w.site} ເຂົ້າບໍ່ໄດ້ (${w.status || w.error})`);
      if (w.certExpires && w.certExpires - Date.now() < 14 * 86400_000) add("warn", "srv", `ໃບຮັບຮອງ HTTPS ຂອງ ${w.site.split("/")[0]} ໃກ້ໝົດອາຍຸ`);
    }
    if (s.disk && pct(s.disk.used, s.disk.total) >= 85) add(pct(s.disk.used, s.disk.total) >= 95 ? "bad" : "warn", "srv", `ດິສກ໌ເຕັມ ${pct(s.disk.used, s.disk.total)}%`);
    if (pct(s.mem.used, s.mem.total) >= 90) add("warn", "srv", `RAM ໃຊ້ໄປ ${pct(s.mem.used, s.mem.total)}%`);
    if (s.load[1] > s.cpus * 1.5) add("warn", "srv", `ເຄື່ອງເຮັດວຽກໜັກ (load ${s.load[1].toFixed(2)})`);
    if (sec.rebootRequired) add("warn", "srv", "ມີອັບເດດທີ່ຕ້ອງ restart ເຄື່ອງ");
    if (sec.passwordAuth !== "no") add("warn", "sec", sec.passwordAuth === "unknown" ? "ກວດບໍ່ໄດ້ວ່າ SSH ປິດລະຫັດຜ່ານແລ້ວບໍ່" : "SSH ຍັງເປີດໃຫ້ເຂົ້າດ້ວຍລະຫັດຜ່ານ");
    if (!sec.fail2ban.running) add("warn", "sec", "ຍັງບໍ່ມີ fail2ban ບລັອກ IP ທີ່ເດົາລະຫັດ");
    const odd = sec.listening.filter((l) => !/:(22|80|443)$/.test(l));
    if (odd.length) add("warn", "sec", `ມີພອດເປີດອອກນອກທີ່ບໍ່ຄຸ້ນ: ${odd.join(", ")}`);
    const oddUsers = sec.shellUsers.filter((u) => !["root", "ubuntu"].includes(u));
    if (oddUsers.length) add("bad", "sec", `ມີຜູ້ໃຊ້ທີ່ login ໄດ້ທີ່ບໍ່ຄຸ້ນ: ${oddUsers.join(", ")}`);
    if (!sec.sshReadable) add("warn", "sec", "ອ່ານ log SSH ບໍ່ໄດ້ (ຕ້ອງເພີ່ມສິດ service lotto-api)");
    for (const p of sec.processes) if (p.cpu > 80 && p.secs > 600) add("bad", "sec", `ໂປຣແກຣມ ${p.cmd} (${p.user}) ໃຊ້ CPU ${p.cpu}% ດົນ ${duration(p.secs)} — ອາດເປັນໂປຣແກຣມແປກປອມ`);
    return out;
  }
  function banner(list, okText) {
    const lv = list.some((p) => p.level === "bad") ? "bad" : list.length ? "warn" : "ok";
    const box = el("section", "card banner " + lv, el("div", "big", lv === "ok" ? "✅" : lv === "bad" ? "🚨" : "⚠️"));
    const body = el("div", "", el("h2", "", lv === "ok" ? okText : `ພົບ ${list.length} ເລື່ອງທີ່ຄວນເບິ່ງ`));
    if (list.length) body.append(el("ul", "", ...list.map((p) => el("li", "", el("span", "tag " + p.level, LEVEL_TEXT[p.level]), p.text))));
    box.append(body);
    return box;
  }

  function renderServer() {
    const s = serverData;
    if (!s) { $("content").replaceChildren(card("", "", el("div", "empty", "ກຳລັງໂຫຼດ…"))); return; }
    const memP = pct(s.mem.used, s.mem.total), diskP = s.disk ? pct(s.disk.used, s.disk.total) : 0;
    const chart = chartBox();
    const hist = s.history;
    later(() => lineChart(chart, {
      labels: hist.map((p) => new Date(p.t).toLocaleTimeString("en-GB", { timeZone: "Asia/Vientiane", hour: "2-digit", minute: "2-digit" })),
      tipTitles: hist.map((p) => new Date(p.t).toLocaleString("en-GB", { timeZone: "Asia/Vientiane", hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })),
      series: [
        { name: "CPU", color: "var(--s1)", values: hist.map((p) => p.cpu), area: true },
        { name: "RAM", color: "var(--s2)", values: hist.map((p) => p.mem) },
      ],
      max: 100, fmtY: (v) => v + "%", fmtV: (v) => v + "%", H: 220,
    }));
    const maxMs = Math.max(500, ...s.sites.map((w) => w.ms));
    $("content").replaceChildren(
      banner(problems(s).filter((p) => p.kind === "srv"), "ເຊີບເວີປົກກະຕິດີ"),
      el("div", "grid g4",
        gauge("⚙️ CPU", Math.round(s.cpu), `${s.cpus} core · load ${s.load.map((l) => l.toFixed(2)).join(" / ")}`, level(s.cpu, 70, 90)),
        gauge("🧠 RAM", memP, `${GB(s.mem.used)} / ${GB(s.mem.total)}`, level(memP, 80, 90)),
        gauge("💾 ດິສກ໌", diskP, s.disk ? `${GB(s.disk.used)} / ${GB(s.disk.total)}` : "—", level(diskP, 85, 95)),
        kpi("⏱️ ເປີດມາແລ້ວ", duration(s.uptime), [s.host, s.security.rebootRequired ? el("span", "delta down", "ຕ້ອງ restart") : ""])),
      card("CPU ແລະ RAM", hist.length > 1 ? `ຍ້ອນຫຼັງ ${duration((hist.at(-1).t - hist[0].t) / 1000)} (ເກັບທຸກ 1 ນາທີ, ສູງສຸດ 24 ຊມ)` : "ກຳລັງເກັບຂໍ້ມູນ (ທຸກ 1 ນາທີ)",
        legend([["var(--s1)", "CPU", 1], ["var(--s2)", "RAM", 1]]), hist.length > 1 ? chart : el("div", "empty", "ລໍຖ້າຂໍ້ມູນ 2-3 ນາທີ")),
      el("div", "grid g2",
        card("Service", `${s.units.filter((u) => u.state === "active").length + s.ports.filter((p) => p.ok).length} / ${s.units.length + s.ports.length} ເຮັດວຽກ`,
          el("div", "rows",
            ...s.units.map((u) => srow(u.name, u.since && u.state === "active" ? `ເປີດ ${duration((Date.now() - u.since) / 1000)}` : "", MB(u.memory), statusEl(u.state === "active" ? "ok" : "bad", u.state === "active" ? "ເຮັດວຽກ" : "ຢຸດ"))),
            ...s.ports.map((p) => srow(p.name, `ພອດ ${p.port}`, `${p.ms} ms`, statusEl(p.ok ? "ok" : "bad", p.ok ? "ເຮັດວຽກ" : "ບໍ່ຕອບ"))))),
        card("ເວັບ (HTTPS)", `${s.sites.filter((w) => w.status && w.status < 500).length} / ${s.sites.length} ເຂົ້າໄດ້`,
          el("div", "rows", ...s.sites.map((w) => {
            const days = w.certExpires ? Math.floor((w.certExpires - Date.now()) / 86400_000) : null;
            const lv = !w.status || w.status >= 500 ? "bad" : (days != null && days < 14) || w.ms > 2000 ? "warn" : "ok";
            const bar = el("div", "ms-bar", el("div"));
            bar.firstChild.style.width = `${Math.min(100, (w.ms / maxMs) * 100)}%`;
            bar.title = `${w.ms} ms`;
            return srow(w.site.replace(/\/$/, ""), bar, `${w.ms} ms`, days != null ? `🔒 ${days} ມື້` : "", statusEl(lv, w.status ? String(w.status) : "ລົ້ມ"));
          })))),
    );
  }

  function renderSecurity() {
    const s = serverData;
    if (!s) { $("content").replaceChildren(card("", "", el("div", "empty", "ກຳລັງໂຫຼດ…"))); return; }
    const sec = s.security, f2b = sec.fail2ban;
    const check = (lv, label, detail) => srow(label, detail, statusEl(lv, lv === "ok" ? "ດີ" : lv === "bad" ? "ອັນຕະລາຍ" : "ຄວນແກ້"));
    const today = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
    const dayKeys = lastDays(today, 7);
    const attempts = chartBox();
    later(() => barChart(attempts, { labels: dayKeys.map(dayLabel), tipTitles: dayKeys, series: [{ name: "ເດົາລະຫັດ", color: "var(--s8)", values: dayKeys.map((d) => sec.sshFailsPerDay[d] || 0) }], H: 200 }));
    const loginRows = !sec.sshReadable ? el("div", "empty", "ອ່ານ log SSH ບໍ່ໄດ້")
      : !sec.logins.length ? el("div", "empty", "ບໍ່ມີ")
      : el("div", "rows", ...sec.logins.map((l) => srow(
        el("span", "name mono", l.ip, " ", l.ip === s.you ? el("span", "pill you", "ເຄື່ອງທີ່ເປີດໜ້ານີ້") : ""),
        l.users.join(", "), el("span", "pill", l.methods.join(", ")), `${fmt(l.count)} ເທື່ອ`, ago(l.last))));
    $("content").replaceChildren(
      banner(problems(s).filter((p) => p.kind === "sec"), "ບໍ່ພົບສັນຍານຖືກແຮັກ"),
      el("div", "grid g4",
        kpi("🔑 ເດົາລະຫັດ SSH (24 ຊມ)", fmt(sec.sshFails24h), "ບອດທົ່ວໂລກ ເປັນເລື່ອງປົກກະຕິ"),
        kpi("📈 ເດົາລະຫັດ SSH (7 ມື້)", fmt(sec.sshFails7d), `ຈາກ ${sec.topIps.length}${sec.topIps.length >= 10 ? "+" : ""} IP`),
        kpi("⛔ IP ຖືກບລັອກຢູ່", f2b.running ? fmt(f2b.banned.length) : "—", f2b.running ? `ບລັອກ 7 ມື້: ${fmt(f2b.bans7d || 0)}` : "ຍັງບໍ່ໄດ້ຕິດຕັ້ງ fail2ban"),
        kpi("🔐 ລະຫັດ admin ຜິດ", fmt(sec.adminFails.length), "ນັບຕັ້ງແຕ່ service ເລີ່ມ")),
      el("div", "grid g2",
        card("ກວດການຕັ້ງຄ່າ", "", el("div", "rows",
          check(sec.passwordAuth === "no" ? "ok" : "warn", "SSH ດ້ວຍລະຫັດຜ່ານ", sec.passwordAuth === "no" ? "ປິດແລ້ວ (key ຢ່າງດຽວ)" : sec.passwordAuth === "unknown" ? "ກວດບໍ່ໄດ້" : "ຍັງເປີດຢູ່"),
          check(["yes", "unknown"].includes(sec.rootLogin) ? "warn" : "ok", "root login", sec.rootLogin === "yes" ? "ໄດ້ທັງລະຫັດ ແລະ key" : sec.rootLogin === "unknown" ? "ກວດບໍ່ໄດ້" : "key ຢ່າງດຽວ"),
          check(f2b.running ? "ok" : "warn", "fail2ban", f2b.running ? "ເຮັດວຽກ" : "ບໍ່ມີ"),
          check(sec.listening.every((l) => /:(22|80|443)$/.test(l)) ? "ok" : "warn", "ພອດທີ່ເປີດອອກນອກ", sec.listening.map((l) => l.split(":").pop()).filter((v, i, a) => a.indexOf(v) === i).join(", ")),
          check(sec.shellUsers.every((u) => ["root", "ubuntu"].includes(u)) ? "ok" : "bad", "ຜູ້ໃຊ້ທີ່ login ໄດ້", sec.shellUsers.join(", ")),
          check(sec.rebootRequired ? "warn" : "ok", "ອັບເດດລະບົບ", sec.rebootRequired ? "ຕ້ອງ restart ເຄື່ອງ" : `${sec.updates ?? 0} ລາຍການລໍຖ້າ`))),
        card("ເດົາລະຫັດ SSH ລາຍວັນ", "7 ມື້", attempts)),
      card("ເຂົ້າ SSH ສຳເລັດ", "7 ມື້ · ທຸກແຖວຕ້ອງເປັນທ່ານ — IP ທີ່ບໍ່ຮູ້ຈັກ = ອາດຖືກແຮັກ", loginRows),
      el("div", "grid g2",
        card("IP ທີ່ພະຍາຍາມເດົາລະຫັດ", "7 ມື້", hbars(sec.topIps, { color: "var(--s8)", total: sec.sshFails7d })),
        card("ຊື່ຜູ້ໃຊ້ທີ່ເຂົາລອງ", "7 ມື້", hbars(sec.topUsers, { color: "var(--s2)", total: sec.sshFails7d }))),
      el("div", "grid g2",
        card("ໂປຣແກຣມທີ່ໃຊ້ CPU ຫຼາຍສຸດ", "ໂປຣແກຣມແປກທີ່ໃຊ້ CPU ສູງດົນໆ = ສັນຍານອັນຕະລາຍ",
          el("div", "rows", ...sec.processes.map((p) => srow(el("span", "name mono", p.cmd), p.user, `CPU ${p.cpu}%`, `RAM ${p.mem}%`)))),
        card("IP ທີ່ຖືກບລັອກ / ໃສ່ລະຫັດ admin ຜິດ", "",
          el("div", "rows",
            ...(f2b.banned.length ? f2b.banned.slice(0, 10).map((b) => srow(el("span", "name mono", b.ip), b.jail, ago(b.t), statusEl("bad", "ບລັອກ"))) : [srow("fail2ban", f2b.running ? "ບໍ່ມີ IP ຖືກບລັອກ" : "ຍັງບໍ່ໄດ້ຕິດຕັ້ງ")]),
            ...(sec.adminFails.length ? sec.adminFails.map((a) => srow(el("span", "name mono", a.ip), "ລະຫັດ admin ຜິດ", ago(a.t))) : [srow("admin", "ບໍ່ມີໃຜໃສ່ລະຫັດຜິດ")])))),
    );
  }

  // ---------- ເມນູ ----------
  function navItem(key, ico, label, count, swatchColor) {
    const b = el("button", "nav-item" + (view === key ? " on" : ""), el("span", "ico", ico), el("span", "label", label));
    b.type = "button";
    if (swatchColor) { const sw = el("i", "swatch"); sw.style.background = swatchColor; b.append(sw); }
    if (count) b.append(count);
    b.addEventListener("click", () => go(key));
    return b;
  }
  function renderNav() {
    const ids = Object.keys(statsData.sites).sort((a, b) => (SITES[a]?.[2] || 99) - (SITES[b]?.[2] || 99));
    const unread = ids.reduce((s, id) => s + statsData.sites[id].unread, 0);
    const probs = serverData ? problems(serverData) : [];
    const cnt = (list) => {
      if (!list.length) return null;
      return el("span", "count " + (list.some((p) => p.level === "bad") ? "bad" : "warn"), list.length);
    };
    $("nav").replaceChildren(
      navItem("overview", "🏠", "ພາບລວມ"),
      el("div", "nav-group", "ເວັບໄຊ"),
      ...ids.map((id) => navItem("site:" + id, siteIcon(id), siteName(id), statsData.sites[id].unread ? el("span", "count hot", statsData.sites[id].unread) : null, siteColor(id))),
      el("div", "nav-group", "ລະບົບ"),
      navItem("feedback", "💬", "Feedback", unread ? el("span", "count hot", unread) : null),
      navItem("server", "🖥️", "ເຊີບເວີ", cnt(probs.filter((p) => p.kind === "srv"))),
      navItem("security", "🛡️", "ຄວາມປອດໄພ", cnt(probs.filter((p) => p.kind === "sec"))),
    );
  }
  const TITLES = {
    overview: ["ພາບລວມ", "ສະຖິຕິຂອງທຸກເວັບລວມກັນ"],
    feedback: ["Feedback", "ຄຳຕິຊົມຈາກຜູ້ໃຊ້ທຸກເວັບ"],
    server: ["ເຊີບເວີ", "CPU, RAM, ດິສກ໌, service ແລະ ເວັບ — ອັບເດດທຸກ 30 ວິນາທີ"],
    security: ["ຄວາມປອດໄພ", "ໃຜພະຍາຍາມເຂົ້າເຄື່ອງ ແລະ ການຕັ້ງຄ່າທີ່ຄວນກວດ"],
  };
  function renderHeader() {
    const [title, sub] = view.startsWith("site:")
      ? [`${siteIcon(view.slice(5))} ${siteName(view.slice(5))}`, statsData.sites[view.slice(5)].hosts.join(", ") || "ຍັງບໍ່ໄດ້ລົງທະບຽນໂດເມນ"]
      : TITLES[view];
    $("pageTitle").textContent = title;
    $("pageSub").textContent = sub;
    const showPeriods = view === "overview" || view.startsWith("site:");
    $("periods").hidden = !showPeriods;
    if (showPeriods) {
      $("periods").replaceChildren(...PERIODS.map((p) => {
        const b = el("button", "chip" + (p === period ? " on" : ""), `${p} ມື້`);
        b.type = "button";
        b.addEventListener("click", () => { period = p; save("admin.period", p); render(); });
        return b;
      }));
    }
  }
  function render() {
    if (!statsData) return;
    if (view.startsWith("site:") && !statsData.sites[view.slice(5)]) view = "overview";
    if (!TITLES[view] && !view.startsWith("site:")) view = "overview";
    renderNav();
    renderHeader();
    drawQueue = [];
    hideTip();
    if (view === "overview") renderOverview();
    else if (view === "feedback") renderFeedback();
    else if (view === "server") renderServer();
    else if (view === "security") renderSecurity();
    else renderSite(view.slice(5));
    flushDraw();
  }
  function go(key) {
    view = key;
    save("admin.view", key);
    $("app").classList.remove("menu-open");
    render();
    scrollTo({ top: 0 });
    startServerTimer();
  }

  // ---------- ໂຫຼດຂໍ້ມູນ ----------
  const stamp = () => { $("updated").textContent = `ອັບເດດ ${new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`; };
  async function refreshStats() {
    const [s, fb] = await Promise.all([api("/stats"), api("/feedback")]);
    statsData = s;
    feedbackItems = fb.items;
    render();
    stamp();
  }
  async function loadServer() {
    serverData = await api("/server");
    if (["server", "security", "overview"].includes(view)) render();
    else renderNav();
    stamp();
  }
  function startServerTimer() {
    clearInterval(serverTimer);
    const live = view === "server" || view === "security";
    serverTimer = setInterval(() => { if (!document.hidden) loadServer().catch(() => {}); }, live ? 30_000 : 120_000);
  }
  async function loadAll() {
    await refreshStats();
    $("loginView").hidden = true;
    $("app").hidden = false;
    render(); // ວາດໃໝ່ຫຼັງຈາກໜ້າສະແດງ (ກຣາຟຕ້ອງຮູ້ຄວາມກວ້າງ)
    loadServer().catch(() => {});
    startServerTimer();
  }

  // ---------- ເຫດການ ----------
  $("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("loginMsg").textContent = "";
    try {
      await api("/login", { password: $("password").value });
      $("password").value = "";
      await loadAll();
    } catch (err) {
      $("loginMsg").textContent = err.message;
    }
  });
  $("logoutBtn").addEventListener("click", async () => { await api("/logout", {}).catch(() => {}); clearInterval(serverTimer); showLogin(); });
  $("refreshBtn").addEventListener("click", () => { refreshStats().catch(() => {}); loadServer().catch(() => {}); });
  $("menuBtn").addEventListener("click", () => $("app").classList.add("menu-open"));
  $("scrim").addEventListener("click", () => $("app").classList.remove("menu-open"));
  $("themeBtn").addEventListener("click", () => {
    const dark = document.documentElement.dataset.theme
      ? document.documentElement.dataset.theme === "dark"
      : matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme = dark ? "light" : "dark";
    save("admin.theme", document.documentElement.dataset.theme);
  });
  let resizeT;
  addEventListener("resize", () => { clearTimeout(resizeT); resizeT = setTimeout(render, 150); });

  loadAll().catch((err) => { if (err.message !== "login") { $("loginView").hidden = false; $("loginMsg").textContent = err.message; } });
})();
