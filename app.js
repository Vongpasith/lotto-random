// ສຸ່ມຫວຍ 2–6 ໂຕ ຈາກສະຖິຕິຜົນຫວຍ 6 ໂຕ ຍ້ອນຫຼັງ
(() => {
  const $ = (id) => document.getElementById(id);
  let stats = null;

  // ນັບຄວາມຖີ່: ເລກແຕ່ລະຫຼັກ, ເລກທ້າຍ 2 ໂຕ, ເລກທ້າຍ 3 ໂຕ
  function computeStats(results) {
    const pos = Array.from({ length: 6 }, () => Array(10).fill(0));
    const last2 = new Map();
    const last3 = new Map();
    for (const r of results) {
      for (let i = 0; i < 6; i++) pos[i][+r[i]]++;
      const t2 = r.slice(-2), t3 = r.slice(-3);
      last2.set(t2, (last2.get(t2) || 0) + 1);
      last3.set(t3, (last3.get(t3) || 0) + 1);
    }
    // ຄວາມເປັນໄປໄດ້ຂອງແຕ່ລະເລກໃນແຕ່ລະຫຼັກ (ບວກ 1 ກັນເລກທີ່ບໍ່ເຄີຍອອກເປັນ 0)
    const n = results.length;
    const prob = pos.map((row) => row.map((c) => (c + 1) / (n + 10)));
    return { results, n, pos, prob, last2, last3 };
  }

  // ນ້ຳໜັກການສຸ່ມຂອງແຕ່ລະຫຼັກຕາມໂໝດທີ່ເລືອກ
  function weightsFor(mode, i) {
    const p = stats.prob[i];
    switch (mode) {
      case "hot": return p.map((x) => x * x * x);   // ຂະຫຍາຍຄວາມຕ່າງ ໃຫ້ເລກອອກເລື້ອຍໄດ້ປຽບຫຼາຍຂຶ້ນ
      case "cold": return p.map((x) => 1 / x);      // ກັບດ້ານ ໃຫ້ເລກອອກໜ້ອຍໄດ້ປຽບ
      case "uniform": return Array(10).fill(1);
      default: return p;
    }
  }

  function pickWeighted(weights) {
    const total = weights.reduce((a, b) => a + b, 0);
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    let r = (buf[0] / 2 ** 32) * total;
    for (let d = 0; d < 10; d++) {
      r -= weights[d];
      if (r < 0) return d;
    }
    return 9;
  }

  // ສຸ່ມເລກ len ໂຕ (2–6) = ເລກທ້າຍ len ໂຕ ຂອງຫວຍ 6 ໂຕ ຈຶ່ງໃຊ້ສະຖິຕິຂອງຫຼັກທ້າຍໆ
  function generate(mode, len = 6) {
    let num = "";
    for (let i = 6 - len; i < 6; i++) num += pickWeighted(weightsFor(mode, i));
    return num;
  }

  // ຄະແນນສະຖິຕິ = ຄວາມເປັນໄປໄດ້ຕາມສະຖິຕິ ທຽບກັບການສຸ່ມລ້ວນ (1.00x = ເທົ່າຄ່າສະເລ່ຍ)
  // ເລກທີ່ສັ້ນກວ່າ 6 ໂຕ ທຽບກັບຫຼັກທ້າຍ
  function statScore(num) {
    let s = 1;
    const start = 6 - num.length;
    for (let k = 0; k < num.length; k++) s *= stats.prob[start + k][+num[k]] * 10;
    return s;
  }

  // ຜົນຫວຍທີ່ລົງທ້າຍດ້ວຍເລກນີ້ (ງວດໃໝ່ກ່ອນ)
  function endingWith(q) {
    const hits = [];
    stats.results.forEach((r, i) => { if (r.endsWith(q)) hits.push({ num: r, date: dates[i] }); });
    return hits.reverse();
  }

  function renderGenerated() {
    const mode = $("mode").value;
    const len = Math.min(6, Math.max(2, parseInt($("digits").value, 10) || 6));
    // ເລກ 2 ໂຕ ມີພຽງ 100 ແບບ ຈຶ່ງຈຳກັດບໍ່ໃຫ້ຂໍເກີນຈຳນວນທີ່ສຸ່ມໄດ້
    const count = Math.min(50, 10 ** len, Math.max(1, parseInt($("count").value, 10) || 1));
    const seen = new Set();
    const rows = [];
    for (let tries = 0; rows.length < count && tries < count * 20; tries++) {
      const num = generate(mode, len);
      if (seen.has(num)) continue;
      seen.add(num);
      rows.push(num);
    }
    $("results").innerHTML = rows.map((num) => {
      const score = statScore(num);
      if (len < 6) {
        const hits = endingWith(num);
        const last = hits[0] ? ` · ຫຼ້າສຸດ ${formatDate(hits[0].date) || hits[0].num}` : "";
        return `<div class="ticket">
        <span class="num">${num}</span>
        <span class="meta">ຄະແນນສະຖິຕິ ${score.toFixed(2)}x<br>
        ເລກທ້າຍ ${len} ໂຕ "${num}" ເຄີຍອອກ ${hits.length} ຄັ້ງ${last}</span>
      </div>`;
      }
      const c2 = stats.last2.get(num.slice(-2)) || 0;
      const c3 = stats.last3.get(num.slice(-3)) || 0;
      const past = stats.results.includes(num) ? " · ⚠️ ເຄີຍອອກ 6 ໂຕ ແລ້ວ" : "";
      return `<div class="ticket">
        <span class="num">${num}</span>
        <span class="meta">ຄະແນນສະຖິຕິ ${score.toFixed(2)}x<br>
        ທ້າຍ 2 ໂຕ "${num.slice(-2)}" ເຄີຍອອກ ${c2} ຄັ້ງ · ທ້າຍ 3 ໂຕ "${num.slice(-3)}" ເຄີຍອອກ ${c3} ຄັ້ງ${past}</span>
      </div>`;
    }).join("");
  }

  function renderHeatmap() {
    const labels = ["ຫຼັກແສນ", "ຫຼັກໝື່ນ", "ຫຼັກພັນ", "ຫຼັກຮ້ອຍ", "ຫຼັກສິບ", "ຫຼັກໜ່ວຍ"];
    let max = 0;
    for (const row of stats.pos) max = Math.max(max, ...row);
    let html = "<tr><th></th>" + [...Array(10).keys()].map((d) => `<th>${d}</th>`).join("") + "</tr>";
    stats.pos.forEach((row, i) => {
      const top = Math.max(...row);
      html += `<tr><th>${labels[i]}</th>` + row.map((c) => {
        const a = max ? (c / max) * 0.75 : 0;
        const cls = c === top && c > 0 ? ' class="top"' : "";
        return `<td${cls} style="background: rgba(var(--heat), ${a.toFixed(2)})" title="${(c / stats.n * 100).toFixed(1)}%">${c}</td>`;
      }).join("") + "</tr>";
    });
    $("heatmap").innerHTML = html;
  }

  function renderTop(map, el, limit) {
    const items = [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit);
    $(el).innerHTML = items.map(([k, v]) => `<li><b>${k}</b><span>${v} ຄັ້ງ</span></li>`).join("");
  }

  function renderLookup() {
    const q = $("lookup").value.trim();
    const box = $("lookupResult");
    if (!/^\d{2,6}$/.test(q)) {
      box.textContent = "ກະລຸນາໃສ່ຕົວເລກ 2–6 ໂຕ";
      return;
    }
    // ທຽບກັບເລກທ້າຍຂອງຜົນຫວຍທີ່ຜ່ານມາ
    const hits = endingWith(q);
    let html = `ເລກທ້າຍ <b>${q}</b> ເຄີຍອອກ <b>${hits.length}</b> ຄັ້ງ ຈາກ ${stats.n} ງວດ`;
    if (q.length <= 3) {
      const expected = stats.n / 10 ** q.length;
      html += ` (ຄ່າສະເລ່ຍຖ້າສຸ່ມລ້ວນ ≈ ${expected.toFixed(2)} ຄັ້ງ)`;
    }
    if (hits.length) {
      html += `<ul>${hits.slice(0, 20).map((h) =>
        `<li>${h.num}${h.date ? ` <span class="hint">— ${formatDate(h.date)}</span>` : ""}</li>`).join("")}</ul>`;
    }
    html += `ຄະແນນສະຖິຕິຂອງເລກນີ້: <b>${statScore(q).toFixed(2)}x</b>`;
    box.innerHTML = html;
  }

  function load(results) {
    stats = computeStats(results);
    $("drawCount").textContent = stats.n;
    renderHeatmap();
    renderTop(stats.last2, "top2", 10);
    renderTop(stats.last3, "top3", 10);
    $("results").innerHTML = "";
  }

  // ---------- ຜົນຫວຍແຕ່ລະງວດ ----------
  const DAYS = ["ອາທິດ", "ຈັນ", "ອັງຄານ", "ພຸດ", "ພະຫັດ", "ສຸກ", "ເສົາ"];
  const MONTHS = ["ມັງກອນ", "ກຸມພາ", "ມີນາ", "ເມສາ", "ພຶດສະພາ", "ມິຖຸນາ",
    "ກໍລະກົດ", "ສິງຫາ", "ກັນຍາ", "ຕຸລາ", "ພະຈິກ", "ທັນວາ"];
  const HISTORY_STEP = 20;
  let historyShown = 0;

  // "2026-10-21" → "ວັນພຸດ 21 ຕຸລາ 2026"
  function formatDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    if (!m) return "";
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return `ວັນ${DAYS[d.getUTCDay()]} ${+m[3]} ${MONTHS[+m[2] - 1]} ${m[1]}`;
  }

  function drawRow(num, date, latest) {
    return `<tr${latest ? ' class="latest"' : ""}>
      <td class="date">${formatDate(date) || "—"}${latest ? ' <span class="badge">ລ່າສຸດ</span>' : ""}</td>
      <td class="n6">${num}</td>
      <td>${num.slice(-4)}</td>
      <td>${num.slice(-3)}</td>
      <td>${num.slice(-2)}</td>
    </tr>`;
  }

  function renderHistory(more) {
    const total = stats.results.length;
    historyShown = more ? Math.min(total, historyShown + HISTORY_STEP) : Math.min(total, HISTORY_STEP);
    let rows = "";
    for (let k = 0; k < historyShown; k++) {
      const i = total - 1 - k; // ງວດໃໝ່ຢູ່ເທິງ
      rows += drawRow(stats.results[i], dates[i], k === 0);
    }
    $("historyBody").innerHTML = rows;
    $("historyMore").hidden = historyShown >= total;
    $("historyInfo").textContent = `ສະແດງ ${historyShown} ຈາກ ${total} ງວດ`;
  }

  // ເລີ່ມຕົ້ນ
  const initial = Array.isArray(window.LOTTO_RESULTS) ? window.LOTTO_RESULTS : [];
  const dates = Array.isArray(window.LOTTO_DATES) ? window.LOTTO_DATES : [];
  load(initial);
  renderHistory(false);
  $("historyMore").addEventListener("click", () => renderHistory(true));

  $("generate").addEventListener("click", renderGenerated);
  $("lookupBtn").addEventListener("click", renderLookup);
  $("lookup").addEventListener("keydown", (e) => { if (e.key === "Enter") renderLookup(); });
})();
