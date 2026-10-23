// ສົ່ງ feedback ແລະ ນັບຄົນເຂົ້າ (ສົ່ງໄປ backend ໃນ server/)
(() => {
  const $ = (id) => document.getElementById(id);
  // ເປີດຈາກ lotto-ramdom.online ຫຼື ໃນເຄື່ອງ → ໃຊ້ API ເວັບດຽວກັນ, ເປີດຈາກບ່ອນອື່ນ (ເຊັ່ນ GitHub Pages) → ສົ່ງໄປ lotto-ramdom.online
  const sameOrigin = ["lotto-ramdom.online", "localhost", "127.0.0.1"].includes(location.hostname);
  const API = sameOrigin ? "/api" : "https://lotto-ramdom.online/api";

  function post(path, data) {
    return fetch(API + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      keepalive: true,
    });
  }

  // ---------- ນັບຄົນເຂົ້າ ----------
  if (location.protocol.startsWith("http")) {
    post("/track", { type: "view", path: location.pathname, ref: document.referrer }).catch(() => {});
    $("generate")?.addEventListener("click", () => post("/track", { type: "generate" }).catch(() => {}));
  }

  // ---------- feedback ----------
  const form = $("feedbackForm");
  if (!form) return;
  const stars = [...form.querySelectorAll(".stars button")];
  let rating = null;

  function paintStars() {
    stars.forEach((b) => {
      const on = rating && +b.dataset.v <= rating;
      b.classList.toggle("on", !!on);
      b.setAttribute("aria-checked", String(+b.dataset.v === rating));
    });
  }
  stars.forEach((b) => {
    b.setAttribute("role", "radio");
    b.addEventListener("click", () => {
      rating = rating === +b.dataset.v ? null : +b.dataset.v; // ກົດຊ້ຳ = ຍົກເລີກ
      paintStars();
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = $("fbStatus");
    const message = $("fbMessage").value.trim();
    if (message.length < 2) {
      status.textContent = I18N.t("fbEmpty");
      $("fbMessage").focus();
      return;
    }
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    status.textContent = I18N.t("fbSending");
    try {
      const res = await post("/feedback", {
        message,
        contact: $("fbContact").value.trim(),
        rating,
        website: $("fbWebsite").value,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || I18N.t("fbFail"));
      form.reset();
      rating = null;
      paintStars();
      status.textContent = I18N.t("fbThanks");
    } catch (err) {
      status.textContent = err instanceof TypeError ? I18N.t("fbOffline") : err.message;
    } finally {
      btn.disabled = false;
    }
  });
})();
