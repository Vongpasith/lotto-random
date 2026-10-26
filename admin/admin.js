// ໜ້າ admin ກາງ: ເບິ່ງສະຖິຕິຄົນເຂົ້າ ແລະ ອ່ານ feedback ຂອງທຸກເວັບ (ແຍກແທັບຕາມເວັບ)
(() => {
  const $ = (id) => document.getElementById(id);
  const API = "/api/admin";
  const MONTHS = ["ມ.ກ.", "ກ.ພ.", "ມ.ນ.", "ມ.ສ.", "ພ.ພ.", "ມິ.ຖ.", "ກ.ລ.", "ສ.ຫ.", "ກ.ຍ.", "ຕ.ລ.", "ພ.ຈ.", "ທ.ວ."];
  const DEVICE_NAMES = { mobile: "📱 ມືຖື", desktop: "💻 ຄອມ", tablet: "📟 ແທັບເລັດ" };
  // ຊື່ເວັບທີ່ສະແດງ (ລະຫັດເວັບມາຈາກ SITES ຂອງ server) — ເວັບທີ່ບໍ່ຢູ່ນີ້ຈະສະແດງເປັນລະຫັດ
  const SITE_NAMES = { lotto: "🎲 ສຸ່ມຫວຍ", fakhan: "🛍️ ຝາກຮ້ານ", hangan: "💸 HanGan", emenu: "🍽️ E-Menu", festival: "🪷 ເທດສະການ", room: "🛋️ ລອງຈັດຫ້ອງ" };
  const EVENT_NAMES = { generate: "ສຸ່ມ" };
  const siteName = (id) => SITE_NAMES[id] || id;
  let feedbackItems = [];
  let statsData = null;
  let current = "all";
  try { current = localStorage.getItem("admin.site") || "all"; } catch {}

  const onSite = ["vongpasith.site", "lotto-ramdom.online", "localhost", "127.0.0.1"].includes(location.hostname);
  if (!onSite) { $("offline").hidden = false; return; }

  // ສ້າງ element ແບບປອດໄພ (ໃຊ້ textContent ກັນ script ຈາກ feedback)
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  const fmt = (n) => (n || 0).toLocaleString("en-US");

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
    $("dashView").hidden = true;
    $("loginView").hidden = false;
    $("password").focus();
  }

  // ---------- ລວມຂໍ້ມູນ ----------
  function lastDays(today, n) {
    const out = [];
    const t = new Date(today + "T00:00:00Z");
    for (let i = n - 1; i >= 0; i--) out.push(new Date(t - i * 86400_000).toISOString().slice(0, 10));
    return out;
  }
  function addMap(to, from = {}, prefix = "") {
    for (const [k, v] of Object.entries(from)) to[prefix + k] = (to[prefix + k] || 0) + v;
  }
  // ລວມຂໍ້ມູນລາຍວັນຂອງຫຼາຍເວັບ (ແທັບ "ທັງໝົດ") — ຄົນທີ່ເຂົ້າ 2 ເວັບ ນັບເປັນ 2
  function daysFor(siteIds, prefixPages) {
    const out = {};
    for (const id of siteIds) {
      for (const [date, d] of Object.entries(statsData.sites[id].days)) {
        const o = (out[date] ||= { views: 0, uniques: 0, feedback: 0, events: {}, devices: {}, refs: {}, pages: {} });
        o.views += d.views || 0;
        o.uniques += d.uniques || 0;
        o.feedback += d.feedback || 0;
        addMap(o.events, d.events);
        addMap(o.devices, d.devices);
        addMap(o.refs, d.refs);
        addMap(o.pages, d.pages, prefixPages ? siteName(id) + " " : "");
      }
    }
    return out;
  }
  function sum(days, keys, field) {
    return keys.reduce((s, k) => s + (days[k]?.[field] || 0), 0);
  }
  function merge(days, keys, field) {
    const m = {};
    for (const k of keys) addMap(m, days[k]?.[field]);
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }
  const selected = () => (current === "all" ? Object.keys(statsData.sites) : [current]);

  // ---------- ແທັບເວັບ ----------
  function renderTabs() {
    const ids = Object.keys(statsData.sites);
    if (current !== "all" && !ids.includes(current)) current = "all";
    const tab = (id, label, unread) => {
      const b = el("button", "tab" + (id === current ? " on" : ""), label);
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", String(id === current));
      if (unread) b.append(el("span", "badge", String(unread)));
      b.addEventListener("click", () => {
        current = id;
        try { localStorage.setItem("admin.site", id); } catch {}
        renderAll();
      });
      return b;
    };
    const totalUnread = ids.reduce((s, id) => s + statsData.sites[id].unread, 0);
    $("siteTabs").replaceChildren(
      tab("all", "ທັງໝົດ", totalUnread),
      ...ids.map((id) => tab(id, siteName(id), statsData.sites[id].unread)),
    );
  }

  // ---------- ສະຖິຕິ ----------
  function kpi(label, value, detail) {
    const box = el("div", "kpi");
    box.append(el("div", "label", label), el("div", "value", value), el("div", "detail", detail));
    return box;
  }
  function eventsText(days, keys) {
    return merge(days, keys, "events").map(([k, v]) => ` · ${EVENT_NAMES[k] || k} ${fmt(v)} ເທື່ອ`).join("");
  }

  function renderStats() {
    const { today } = statsData;
    const ids = selected();
    const days = daysFor(ids, current === "all");
    const d7 = lastDays(today, 7), d30 = lastDays(today, 30), all = Object.keys(days);
    const unread = ids.reduce((s, id) => s + statsData.sites[id].unread, 0);
    const totalFb = ids.reduce((s, id) => s + statsData.sites[id].totalFeedback, 0);
    const line = (keys) => `${fmt(sum(days, keys, "views"))} ຄັ້ງ${eventsText(days, keys)}`;
    $("kpis").replaceChildren(
      kpi("ມື້ນີ້", fmt(days[today]?.uniques), line([today])),
      kpi("7 ມື້", fmt(sum(days, d7, "uniques")), line(d7)),
      kpi("30 ມື້", fmt(sum(days, d30, "uniques")), line(d30)),
      kpi("Feedback", fmt(totalFb), unread ? `ຍັງບໍ່ໄດ້ອ່ານ ${fmt(unread)}` : "ອ່ານໝົດແລ້ວ"),
    );
    const hosts = current === "all" ? "" : ` · ${statsData.sites[current].hosts.join(", ") || "ຍັງບໍ່ໄດ້ລົງທະບຽນໂດເມນ"}`;
    const allNote = el("div", "hint", `ຕັ້ງແຕ່ເລີ່ມນັບ (${all.length} ມື້): ເປີດໜ້າ ${line(all)}${hosts}`);
    allNote.style.gridColumn = "1 / -1";
    $("kpis").append(allNote);

    renderChart(days, d30);
    renderBars($("devices"), merge(days, d30, "devices").map(([k, v]) => [DEVICE_NAMES[k] || k, v]));
    renderBars($("refs"), merge(days, d30, "refs").slice(0, 10).map(([k, v]) => [k === "direct" ? "ພິມເອງ / ບໍ່ຮູ້" : k, v]));
    renderBars($("pages"), merge(days, d30, "pages").slice(0, 15));
    $("updated").textContent = `ອັບເດດ ${new Date().toLocaleTimeString("en-GB")}`;
  }

  function renderChart(days, keys) {
    const W = 600, H = 180, pad = 22, bw = (W - 10) / keys.length;
    const max = Math.max(1, ...keys.map((k) => days[k]?.views || 0));
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const add = (tag, attrs, text) => {
      const n = document.createElementNS(ns, tag);
      for (const [a, v] of Object.entries(attrs)) n.setAttribute(a, v);
      if (text !== undefined) n.textContent = text;
      svg.append(n);
      return n;
    };
    keys.forEach((k, i) => {
      const d = days[k] || {};
      const x = 5 + i * bw;
      const hv = ((d.views || 0) / max) * (H - pad - 14);
      const hu = ((d.uniques || 0) / max) * (H - pad - 14);
      add("rect", { x: x + 1, y: H - pad - hv, width: bw - 2, height: hv, rx: 2, style: "fill: rgba(var(--heat), .25)" });
      add("rect", { x: x + 1, y: H - pad - hu, width: bw - 2, height: hu, rx: 2, style: "fill: var(--accent)" })
        .append(Object.assign(document.createElementNS(ns, "title"), {
          textContent: `${k}: ${d.uniques || 0} ຄົນ, ${d.views || 0} ຄັ້ງ`,
        }));
      if (i % 5 === 4 || i === keys.length - 1) {
        const [, m, day] = k.split("-");
        add("text", { x: x + bw / 2, y: H - 6, "text-anchor": "middle" }, `${+day} ${MONTHS[+m - 1]}`);
      }
    });
    add("text", { x: 5, y: 10 }, `ສູງສຸດ ${max}`);
    $("chart").replaceChildren(svg);
  }

  function renderBars(box, rows) {
    if (!rows.length) { box.replaceChildren(el("div", "empty", "ຍັງບໍ່ມີຂໍ້ມູນ")); return; }
    const max = rows[0][1];
    box.replaceChildren(...rows.map(([name, v]) => {
      const row = el("div", "bar-row");
      const track = el("div", "track");
      const fill = el("div", "fill");
      fill.style.width = `${(v / max) * 100}%`;
      track.append(fill);
      const label = el("span", "name", name);
      label.title = name;
      row.append(label, track, el("span", "num", fmt(v)));
      return row;
    }));
  }

  // ---------- feedback ----------
  function timeText(iso) {
    const d = new Date(iso);
    return d.toLocaleString("en-GB", { timeZone: "Asia/Vientiane", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function renderFeedback() {
    const only = $("onlyUnread").checked;
    const items = feedbackItems.filter((f) => (current === "all" || f.site === current) && (!only || !f.read));
    if (!items.length) {
      $("fbList").replaceChildren(el("div", "empty", only ? "ອ່ານໝົດແລ້ວ 🎉" : "ຍັງບໍ່ມີ feedback"));
      return;
    }
    $("fbList").replaceChildren(...items.map((f) => {
      const card = el("article", "fb" + (f.read ? "" : " unread"));
      const meta = el("div", "meta");
      if (current === "all") meta.append(el("span", "site-tag", siteName(f.site)));
      meta.append(el("span", "", timeText(f.time)));
      if (f.rating) meta.append(el("span", "stars-view", "★".repeat(f.rating) + "☆".repeat(5 - f.rating)));
      meta.append(el("span", "", DEVICE_NAMES[f.device] || f.device || ""));
      if (f.page) meta.append(el("span", "", f.page));
      card.append(meta, el("div", "msg", f.message));
      if (f.contact) card.append(el("div", "contact", "📞 " + f.contact));

      const actions = el("div", "actions");
      const readBtn = el("button", "", f.read ? "ໝາຍວ່າຍັງບໍ່ອ່ານ" : "✓ ອ່ານແລ້ວ");
      readBtn.addEventListener("click", async () => {
        await api("/feedback/read", { id: f.id, read: !f.read });
        f.read = !f.read;
        renderFeedback();
        loadStats();
      });
      const delBtn = el("button", "danger", "ລຶບ");
      let armed = false;
      delBtn.addEventListener("click", async () => {
        if (!armed) { armed = true; delBtn.textContent = "ກົດອີກເທື່ອເພື່ອຢືນຢັນ"; setTimeout(() => { armed = false; delBtn.textContent = "ລຶບ"; }, 3000); return; }
        await api("/feedback/delete", { id: f.id });
        feedbackItems = feedbackItems.filter((x) => x.id !== f.id);
        renderFeedback();
        loadStats();
      });
      actions.append(readBtn, delBtn);
      card.append(actions);
      return card;
    }));
  }

  function renderAll() {
    renderTabs();
    renderStats();
    renderFeedback();
  }
  async function loadStats() {
    statsData = await api("/stats");
    renderTabs();
    renderStats();
  }
  async function loadAll() {
    const [s, fb] = await Promise.all([api("/stats"), api("/feedback")]);
    $("loginView").hidden = true;
    $("dashView").hidden = false;
    statsData = s;
    feedbackItems = fb.items;
    renderAll();
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
  $("logoutBtn").addEventListener("click", async () => { await api("/logout", {}).catch(() => {}); showLogin(); });
  $("refreshBtn").addEventListener("click", () => loadAll().catch(() => {}));
  $("onlyUnread").addEventListener("change", renderFeedback);

  loadAll().catch((err) => { if (err.message !== "login") { $("loginView").hidden = false; $("loginMsg").textContent = err.message; } });
})();
