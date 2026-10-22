// ສຸ່ມຫວຍຈາກສະຖິຕິຜົນຫວຍ 6 ໂຕ ຍ້ອນຫຼັງ
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

  function generate(mode) {
    let num = "";
    for (let i = 0; i < 6; i++) num += pickWeighted(weightsFor(mode, i));
    return num;
  }

  // ຄະແນນສະຖິຕິ = ຄວາມເປັນໄປໄດ້ຕາມສະຖິຕິ ທຽບກັບການສຸ່ມລ້ວນ (1.00x = ເທົ່າຄ່າສະເລ່ຍ)
  function statScore(num) {
    let s = 1;
    for (let i = 0; i < 6; i++) s *= stats.prob[i][+num[i]] * 10;
    return s;
  }

  function renderGenerated() {
    const mode = $("mode").value;
    const count = Math.min(50, Math.max(1, parseInt($("count").value, 10) || 1));
    const seen = new Set();
    const rows = [];
    for (let tries = 0; rows.length < count && tries < count * 20; tries++) {
      const num = generate(mode);
      if (seen.has(num)) continue;
      seen.add(num);
      rows.push(num);
    }
    $("results").innerHTML = rows.map((num) => {
      const score = statScore(num);
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
    const hits = stats.results.filter((r) => r.endsWith(q));
    let html = `ເລກທ້າຍ <b>${q}</b> ເຄີຍອອກ <b>${hits.length}</b> ຄັ້ງ ຈາກ ${stats.n} ງວດ`;
    if (q.length <= 3) {
      const expected = stats.n / 10 ** q.length;
      html += ` (ຄ່າສະເລ່ຍຖ້າສຸ່ມລ້ວນ ≈ ${expected.toFixed(2)} ຄັ້ງ)`;
    }
    if (hits.length) html += `<ul>${hits.slice(0, 20).map((h) => `<li>${h}</li>`).join("")}</ul>`;
    if (q.length === 6) html += `ຄະແນນສະຖິຕິຂອງເລກນີ້: <b>${statScore(q).toFixed(2)}x</b>`;
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

  // ເລີ່ມຕົ້ນ
  const initial = Array.isArray(window.LOTTO_RESULTS) ? window.LOTTO_RESULTS : [];
  load(initial);

  $("generate").addEventListener("click", renderGenerated);
  $("lookupBtn").addEventListener("click", renderLookup);
  $("lookup").addEventListener("keydown", (e) => { if (e.key === "Enter") renderLookup(); });
})();
