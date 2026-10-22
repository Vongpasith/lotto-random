// ໜ້າ admin: ເບິ່ງສະຖິຕິຄົນເຂົ້າ ແລະ ອ່ານ feedback
(() => {
  const $ = (id) => document.getElementById(id);
  const API = "/api/admin";
  const MONTHS = ["ມ.ກ.", "ກ.ພ.", "ມ.ນ.", "ມ.ສ.", "ພ.ພ.", "ມິ.ຖ.", "ກ.ລ.", "ສ.ຫ.", "ກ.ຍ.", "ຕ.ລ.", "ພ.ຈ.", "ທ.ວ."];
  const DEVICE_NAMES = { mobile: "📱 ມືຖື", desktop: "💻 ຄອມ", tablet: "📟 ແທັບເລັດ" };
  let feedbackItems = [];

  const onSite = ["lotto-ramdom.online", "localhost", "127.0.0.1"].includes(location.hostname);
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

  // ---------- ສະຖິຕິ ----------
  function lastDays(today, n) {
    const out = [];
    const t = new Date(today + "T00:00:00Z");
    for (let i = n - 1; i >= 0; i--) out.push(new Date(t - i * 86400_000).toISOString().slice(0, 10));
    return out;
  }
  function sum(days, keys, field) {
    return keys.reduce((s, k) => s + (days[k]?.[field] || 0), 0);
  }
  function merge(days, keys, field) {
    const m = {};
    for (const k of keys) for (const [name, v] of Object.entries(days[k]?.[field] || {})) m[name] = (m[name] || 0) + v;
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }

  function kpi(label, value, detail) {
    const box = el("div", "kpi");
    box.append(el("div", "label", label), el("div", "value", value), el("div", "detail", detail));
    return box;
  }

  function renderStats(s) {
    const { days, today } = s;
    const d7 = lastDays(today, 7), d30 = lastDays(today, 30), all = Object.keys(days);
    const t = days[today] || {};
    $("kpis").replaceChildren(
      kpi("ມື້ນີ້", fmt(t.uniques), `${fmt(t.views)} ຄັ້ງ · ສຸ່ມ ${fmt(t.generates)} ເທື່ອ`),
      kpi("7 ມື້", fmt(sum(days, d7, "uniques")), `${fmt(sum(days, d7, "views"))} ຄັ້ງ · ສຸ່ມ ${fmt(sum(days, d7, "generates"))} ເທື່ອ`),
      kpi("30 ມື້", fmt(sum(days, d30, "uniques")), `${fmt(sum(days, d30, "views"))} ຄັ້ງ · ສຸ່ມ ${fmt(sum(days, d30, "generates"))} ເທື່ອ`),
      kpi("Feedback", fmt(s.totalFeedback), s.unread ? `ຍັງບໍ່ໄດ້ອ່ານ ${fmt(s.unread)}` : "ອ່ານໝົດແລ້ວ"),
    );
    const allNote = el("div", "hint", `ຕັ້ງແຕ່ເລີ່ມນັບ (${all.length} ມື້): ເປີດໜ້າ ${fmt(sum(days, all, "views"))} ຄັ້ງ · ສຸ່ມ ${fmt(sum(days, all, "generates"))} ເທື່ອ`);
    allNote.style.gridColumn = "1 / -1";
    $("kpis").append(allNote);

    renderChart(days, d30);
    renderBars($("devices"), merge(days, d30, "devices").map(([k, v]) => [DEVICE_NAMES[k] || k, v]));
    renderBars($("refs"), merge(days, d30, "refs").slice(0, 10).map(([k, v]) => [k === "direct" ? "ພິມເອງ / ບໍ່ຮູ້" : k, v]));

    const badge = $("unreadBadge");
    badge.hidden = !s.unread;
    badge.textContent = s.unread;
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
      row.append(el("span", "name", name), track, el("span", "num", fmt(v)));
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
    const items = feedbackItems.filter((f) => !only || !f.read);
    if (!items.length) {
      $("fbList").replaceChildren(el("div", "empty", only ? "ອ່ານໝົດແລ້ວ 🎉" : "ຍັງບໍ່ມີ feedback"));
      return;
    }
    $("fbList").replaceChildren(...items.map((f) => {
      const card = el("article", "fb" + (f.read ? "" : " unread"));
      const meta = el("div", "meta");
      meta.append(el("span", "", timeText(f.time)));
      if (f.rating) meta.append(el("span", "stars-view", "★".repeat(f.rating) + "☆".repeat(5 - f.rating)));
      meta.append(el("span", "", DEVICE_NAMES[f.device] || f.device || ""));
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

  async function loadStats() { renderStats(await api("/stats")); }
  async function loadAll() {
    const [s, fb] = await Promise.all([api("/stats"), api("/feedback")]);
    $("loginView").hidden = true;
    $("dashView").hidden = false;
    renderStats(s);
    feedbackItems = fb.items;
    renderFeedback();
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
