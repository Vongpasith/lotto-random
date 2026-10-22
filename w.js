// ສະຄຣິບກາງ ໃຫ້ທຸກເວັບໃຊ້ຮ່ວມກັນ: ນັບຄົນເຂົ້າ + ປຸ່ມສົ່ງ feedback → ຂໍ້ມູນໄປລວມທີ່ lotto-ramdom.online/admin
//
// ໃສ່ໃນໜ້າເວັບ:
//   <script src="https://lotto-ramdom.online/w.js" async></script>
// ຕົວເລືອກ (ໃສ່ເປັນ attribute ຂອງ <script>):
//   data-exclude="/admin,/seller"  ໜ້າທີ່ຂຶ້ນຕົ້ນແບບນີ້ ບໍ່ນັບ ແລະ ບໍ່ສະແດງປຸ່ມ
//   data-no-button="/r/"           ນັບຄົນເຂົ້າ ແຕ່ບໍ່ສະແດງປຸ່ມ feedback
//   data-lang="lo|th|en"           ພາສາຂອງປຸ່ມ (ຄ່າເລີ່ມຕົ້ນ: ຕາມ <html lang>)
//   data-dev                       ໃຫ້ເຮັດວຽກຢູ່ localhost ນຳ (ປົກກະຕິຈະປິດ ເພື່ອບໍ່ໃຫ້ຂໍ້ມູນທົດສອບປົນ)
// ເວັບທີ່ໃຊ້ ຕ້ອງລົງທະບຽນໂດເມນໄວ້ໃນ SITES ຂອງ server ກ່ອນ (ເບິ່ງ server/README.md)
(() => {
  if (window.__hubWidget) return;
  window.__hubWidget = true;

  const script = document.currentScript;
  const opt = (name) => script?.getAttribute("data-" + name);
  let base = "https://lotto-ramdom.online";
  try { if (script?.src) base = new URL(script.src).origin; } catch {}
  const API = base + "/api";

  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  if (!location.protocol.startsWith("http") || (local && opt("dev") === null)) return;

  const prefixes = (v) => (v || "").split(",").map((s) => s.trim()).filter(Boolean);
  const exclude = prefixes(opt("exclude"));
  const noButton = prefixes(opt("no-button"));
  const under = (list) => list.some((p) => location.pathname.startsWith(p));

  // ສົ່ງເປັນ text/plain ເພື່ອບໍ່ຕ້ອງມີ CORS preflight (server ອ່ານເປັນ JSON ເອງ)
  const post = (path, data) =>
    fetch(API + path, { method: "POST", body: JSON.stringify(data), keepalive: true, credentials: "omit" });

  // ---------- ນັບຄົນເຂົ້າ (ລວມການປ່ຽນໜ້າແບບບໍ່ໂຫຼດໃໝ່ຂອງ React/Next) ----------
  let lastPath = null;
  let firstView = true;
  function onRoute() {
    if (location.pathname === lastPath) return;
    lastPath = location.pathname;
    if (!under(exclude)) {
      post("/track", { type: "view", path: location.pathname, ref: firstView ? document.referrer : location.href }).catch(() => {});
      firstView = false;
    }
    if (!under(exclude) && !under(noButton)) showButton(); else hideButton();
  }
  for (const fn of ["pushState", "replaceState"]) {
    const orig = history[fn];
    history[fn] = function (...args) {
      const r = orig.apply(this, args);
      setTimeout(onRoute, 0);
      return r;
    };
  }
  addEventListener("popstate", () => setTimeout(onRoute, 0));

  // ---------- ຂໍ້ຄວາມ ----------
  const TEXT = {
    lo: { open: "ແນະນຳ / ຕິຊົມ", title: "💬 ແນະນຳ / ຕິຊົມ", hint: "ມີຫຍັງຢາກໃຫ້ປັບປຸງ ຫຼື ພົບບັນຫາ ບອກໄດ້ເລີຍ", msg: "ຂຽນຂໍ້ຄວາມທີ່ນີ້...", contact: "ຊ່ອງທາງຕິດຕໍ່ກັບ (ບໍ່ໃສ່ກໍໄດ້)", send: "ສົ່ງ", sending: "ກຳລັງສົ່ງ...", empty: "ກະລຸນາຂຽນຂໍ້ຄວາມກ່ອນ", thanks: "ຂອບໃຈສຳລັບຄຳແນະນຳ 🙏", offline: "ເຊື່ອມຕໍ່ບໍ່ໄດ້ ລອງໃໝ່ອີກຄັ້ງ", fail: "ສົ່ງບໍ່ສຳເລັດ", close: "ປິດ", star: "ດາວ" },
    th: { open: "แนะนำ / ติชม", title: "💬 แนะนำ / ติชม", hint: "อยากให้ปรับปรุงอะไร หรือเจอปัญหา บอกได้เลย", msg: "เขียนข้อความที่นี่...", contact: "ช่องทางติดต่อกลับ (ไม่ใส่ก็ได้)", send: "ส่ง", sending: "กำลังส่ง...", empty: "กรุณาเขียนข้อความก่อน", thanks: "ขอบคุณสำหรับคำแนะนำ 🙏", offline: "เชื่อมต่อไม่ได้ ลองใหม่อีกครั้ง", fail: "ส่งไม่สำเร็จ", close: "ปิด", star: "ดาว" },
    en: { open: "Feedback", title: "💬 Feedback", hint: "Found a problem or have an idea? Tell us.", msg: "Write your message...", contact: "How to reach you (optional)", send: "Send", sending: "Sending...", empty: "Please write a message first", thanks: "Thanks for the feedback 🙏", offline: "Couldn't connect, please try again", fail: "Couldn't send", close: "Close", star: "star" },
  };
  const lang = () => {
    const l = (opt("lang") || document.documentElement.lang || "lo").slice(0, 2).toLowerCase();
    return TEXT[l] ? l : l === "zh" ? "en" : "lo";
  };

  // ---------- ປຸ່ມ + ຟອມ (ຢູ່ໃນ shadow DOM ບໍ່ໃຫ້ CSS ປົນກັບເວັບ) ----------
  let host, root, rating = null;

  // ເບິ່ງສີພື້ນຫຼັງຂອງເວັບ ເພື່ອເລືອກໂທນມືດ/ແຈ້ງ
  function isDark() {
    for (const el of [document.body, document.documentElement]) {
      const m = el && getComputedStyle(el).backgroundColor.match(/[\d.]+/g);
      if (m && (m[3] === undefined || +m[3] > 0.5)) return 0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2] < 128;
    }
    return matchMedia("(prefers-color-scheme: dark)").matches;
  }

  const CSS = `
    :host { all: initial; }
    * { box-sizing: border-box; font-family: "Noto Sans Lao", "Noto Sans Thai", system-ui, -apple-system, sans-serif; }
    .wrap { --bg: #fff; --fg: #1f2328; --muted: #656d76; --line: #d0d7de; --field: #f6f8fa; --accent: #e8590c; --star: #f5a524;
      position: fixed; right: max(14px, env(safe-area-inset-right)); bottom: max(14px, env(safe-area-inset-bottom)); z-index: 2147483000; }
    .wrap.dark { --bg: #1c2128; --fg: #e6edf3; --muted: #9198a1; --line: #3d444d; --field: #262c36; }
    .fab { width: 46px; height: 46px; border-radius: 50%; border: 1px solid var(--line); background: var(--bg); color: var(--fg);
      font-size: 21px; line-height: 1; cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,.18); display: grid; place-items: center; opacity: .9; }
    .fab:hover, .fab:focus-visible { opacity: 1; transform: scale(1.05); }
    .panel { position: absolute; right: 0; bottom: 56px; width: min(340px, calc(100vw - 28px)); background: var(--bg); color: var(--fg);
      border: 1px solid var(--line); border-radius: 14px; padding: 14px; box-shadow: 0 10px 30px rgba(0,0,0,.25); }
    .panel[hidden] { display: none; }
    .head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    h2 { margin: 0; font-size: 16px; }
    .x { border: 0; background: none; color: var(--muted); font-size: 20px; cursor: pointer; padding: 2px 6px; }
    p { margin: 4px 0 10px; font-size: 13px; color: var(--muted); }
    .stars { display: flex; gap: 2px; margin-bottom: 8px; }
    .stars button { border: 0; background: none; font-size: 24px; color: var(--line); cursor: pointer; padding: 0 2px; }
    .stars button.on { color: var(--star); }
    textarea, input { width: 100%; border: 1px solid var(--line); background: var(--field); color: var(--fg); border-radius: 8px;
      padding: 8px 10px; font-size: 14px; margin-bottom: 8px; }
    textarea { resize: vertical; min-height: 84px; }
    .hp { position: absolute; left: -9999px; width: 1px; height: 1px; opacity: 0; }
    .row { display: flex; align-items: center; gap: 10px; }
    .send { border: 0; background: var(--accent); color: #fff; border-radius: 8px; padding: 8px 18px; font-size: 14px; font-weight: 700; cursor: pointer; }
    .send:disabled { opacity: .6; cursor: default; }
    .status { font-size: 13px; color: var(--muted); }
    @media print { .wrap { display: none; } }
  `;

  function build() {
    host = document.createElement("div");
    host.setAttribute("data-feedback-widget", "");
    root = host.attachShadow({ mode: "open" });
    const t = TEXT[lang()];
    root.innerHTML = `<style>${CSS}</style>
      <div class="wrap">
        <form class="panel" hidden novalidate>
          <div class="head"><h2></h2><button type="button" class="x">×</button></div>
          <p></p>
          <div class="stars" role="radiogroup">${[1, 2, 3, 4, 5].map((v) => `<button type="button" role="radio" data-v="${v}">★</button>`).join("")}</div>
          <textarea maxlength="2000" rows="4"></textarea>
          <input class="contact" maxlength="200">
          <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
          <div class="row"><button type="submit" class="send"></button><span class="status" role="status"></span></div>
        </form>
        <button type="button" class="fab">💬</button>
      </div>`;
    const $ = (s) => root.querySelector(s);
    const form = $("form"), fab = $(".fab"), stars = [...root.querySelectorAll(".stars button")];

    function applyText() {
      const t = TEXT[lang()];
      fab.title = fab.ariaLabel = t.open;
      $("h2").textContent = t.title;
      $("p").textContent = t.hint;
      $(".x").ariaLabel = t.close;
      $("textarea").placeholder = t.msg;
      $(".contact").placeholder = t.contact;
      $(".send").textContent = t.send;
      stars.forEach((b) => (b.ariaLabel = `${b.dataset.v} ${t.star}`));
    }
    function paintStars() {
      stars.forEach((b) => {
        b.classList.toggle("on", !!rating && +b.dataset.v <= rating);
        b.ariaChecked = String(+b.dataset.v === rating);
      });
    }
    function open(show) {
      form.hidden = !show;
      if (show) {
        $(".wrap").classList.toggle("dark", isDark());
        applyText(); // ເວັບອາດປ່ຽນພາສາຫຼັງຈາກໂຫຼດ
        $("textarea").focus();
      } else fab.focus();
    }

    applyText();
    fab.addEventListener("click", () => open(form.hidden));
    $(".x").addEventListener("click", () => open(false));
    form.addEventListener("keydown", (e) => { if (e.key === "Escape") open(false); });
    stars.forEach((b) => b.addEventListener("click", () => {
      rating = rating === +b.dataset.v ? null : +b.dataset.v; // ກົດຊ້ຳ = ຍົກເລີກ
      paintStars();
    }));
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const t = TEXT[lang()];
      const status = $(".status"), btn = $(".send"), msg = $("textarea");
      const message = msg.value.trim();
      if (message.length < 2) { status.textContent = t.empty; msg.focus(); return; }
      btn.disabled = true;
      status.textContent = t.sending;
      try {
        const res = await post("/feedback", { message, contact: $(".contact").value.trim(), rating, path: location.pathname, website: $(".hp").value });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || t.fail);
        form.reset();
        rating = null;
        paintStars();
        status.textContent = t.thanks;
      } catch (err) {
        status.textContent = err instanceof TypeError ? t.offline : err.message;
      } finally {
        btn.disabled = false;
      }
    });
    document.body.append(host);
  }
  // ສ້າງປຸ່ມຫຼັງໜ້າເວັບໂຫຼດແລ້ວ ບໍ່ໃຫ້ກະທົບ React/Next ຕອນ hydrate
  let wantButton = false;
  function syncButton() {
    if (document.readyState !== "complete") return;
    if (wantButton && !host) build();
    if (host) host.style.display = wantButton ? "" : "none";
  }
  addEventListener("load", () => setTimeout(syncButton, 0));
  function showButton() { wantButton = true; syncButton(); }
  function hideButton() { wantButton = false; syncButton(); }

  if (document.body) onRoute();
  else addEventListener("DOMContentLoaded", onRoute);
})();
