// ພາສາ: ລາວ (ຄ່າເລີ່ມຕົ້ນ) ແລະ English
// ໃນ HTML: data-i18n="key" (ຂໍ້ຄວາມ), data-i18n-html="key" (ມີ <b>/<br>), data-i18n-ph="key" (placeholder), data-i18n-label="key" (aria-label)
// ໃນ JS: I18N.t("key", { ຕົວແປ }) — ປ່ຽນພາສາແລ້ວຈະມີ event "langchange" ໃຫ້ແຕ່ລະສ່ວນ render ໃໝ່
(() => {
  const DICT = {
    lo: {
      title: "ສຸ່ມຫວຍຈາກສະຖິຕິ",
      h1: "🎰 ສຸ່ມຫວຍຈາກສະຖິຕິ",
      sub: "ວິເຄາະຜົນຫວຍ 6 ໂຕ ຍ້ອນຫຼັງ <b>{n}</b> ງວດ ແລ້ວສຸ່ມເລກໂດຍຖ່ວງນ້ຳໜັກຕາມຄວາມຖີ່",
      genTitle: "ສຸ່ມເລກ",
      mode: "ວິທີສຸ່ມ",
      modeWeighted: "ຖ່ວງນ້ຳໜັກຕາມຄວາມຖີ່ (ແນະນຳ)",
      modeHot: "ເລກຮ້ອນ (ເນັ້ນເລກທີ່ອອກເລື້ອຍ)",
      modeCold: "ເລກເຢັນ (ເນັ້ນເລກທີ່ບໍ່ຄ່ອຍອອກ)",
      modeUniform: "ສຸ່ມລ້ວນ (ບໍ່ໃຊ້ສະຖິຕິ)",
      digits: "ຈຳນວນໂຕ",
      nDigits: "{n} ໂຕ",
      count: "ຈຳນວນຊຸດ",
      generate: "ສຸ່ມເລີຍ",
      score: "ຄະແນນສະຖິຕິ {s}x",
      endingHits: 'ເລກທ້າຍ {len} ໂຕ "{num}" ເຄີຍອອກ {c} ຄັ້ງ',
      latestOn: " · ຫຼ້າສຸດ {d}",
      sixMeta: 'ທ້າຍ 2 ໂຕ "{a}" ເຄີຍອອກ {c2} ຄັ້ງ · ທ້າຍ 3 ໂຕ "{b}" ເຄີຍອອກ {c3} ຄັ້ງ',
      pastSix: " · ⚠️ ເຄີຍອອກ 6 ໂຕ ແລ້ວ",
      historyTitle: "ຜົນຫວຍແຕ່ລະງວດ",
      drawDate: "ງວດວັນທີ",
      latest: "ລ່າສຸດ",
      showMore: "ເບິ່ງເພີ່ມ",
      showing: "ສະແດງ {a} ຈາກ {b} ງວດ",
      heatTitle: "ຄວາມຖີ່ຂອງເລກແຕ່ລະຫຼັກ",
      heatHint: "ແຕ່ລະຊ່ອງແມ່ນຈຳນວນຄັ້ງທີ່ເລກນັ້ນອອກໃນຫຼັກນັ້ນ ສີເຂັ້ມ = ອອກເລື້ອຍ",
      positions: ["ຫຼັກແສນ", "ຫຼັກໝື່ນ", "ຫຼັກພັນ", "ຫຼັກຮ້ອຍ", "ຫຼັກສິບ", "ຫຼັກໜ່ວຍ"],
      top2: "ເລກທ້າຍ 2 ໂຕ ທີ່ອອກເລື້ອຍ",
      top3: "ເລກທ້າຍ 3 ໂຕ ທີ່ອອກເລື້ອຍ",
      times: "{c} ຄັ້ງ",
      lookupTitle: "ຄົ້ນຫາເລກຂອງທ່ານ",
      lookupPh: "ໃສ່ເລກ 2–6 ໂຕ ເຊັ່ນ 45 ຫຼື 123456",
      lookupBtn: "ກວດ",
      lookupBad: "ກະລຸນາໃສ່ຕົວເລກ 2–6 ໂຕ",
      lookupHits: "ເລກທ້າຍ <b>{q}</b> ເຄີຍອອກ <b>{c}</b> ຄັ້ງ ຈາກ {n} ງວດ",
      lookupExpected: " (ຄ່າສະເລ່ຍຖ້າສຸ່ມລ້ວນ ≈ {e} ຄັ້ງ)",
      lookupScore: "ຄະແນນສະຖິຕິຂອງເລກນີ້: <b>{s}x</b>",
      fbTitle: "💬 ແນະນຳ / ຕິຊົມ",
      fbHint: "ມີຫຍັງຢາກໃຫ້ປັບປຸງ ຫຼື ພົບບັນຫາ ບອກໄດ້ເລີຍ",
      fbRating: "ໃຫ້ຄະແນນ",
      nStars: "{n} ດາວ",
      fbMessagePh: "ຂຽນຂໍ້ຄວາມທີ່ນີ້...",
      fbContactPh: "ຊ່ອງທາງຕິດຕໍ່ກັບ (ບໍ່ໃສ່ກໍໄດ້) ເຊັ່ນ ເບີ WhatsApp",
      fbSend: "ສົ່ງ",
      fbEmpty: "ກະລຸນາຂຽນຂໍ້ຄວາມກ່ອນ",
      fbSending: "ກຳລັງສົ່ງ...",
      fbThanks: "ຂອບໃຈສຳລັບຄຳແນະນຳ 🙏",
      fbOffline: "ເຊື່ອມຕໍ່ບໍ່ໄດ້ ລອງໃໝ່ອີກຄັ້ງ",
      fbFail: "ສົ່ງບໍ່ສຳເລັດ",
      donateTitle: "☕ ສະໜັບສະໜູນຜູ້ພັດທະນາ",
      donateHint: "ຖ້າມັກເວັບນີ້ ສາມາດ Donate ໄດ້ຜ່ານ LAO QR — ສະແກນດ້ວຍແອັບທະນາຄານໃດກໍໄດ້ທີ່ຮອງຮັບ LAPNet",
      thanks: "ຂອບໃຈຫຼາຍໆ 🙏",
      disclaimer: '⚠️ ຫວຍແຕ່ລະງວດສຸ່ມແຍກກັນ ທຸກເລກມີໂອກາດຖືກ 6 ໂຕ ເທົ່າກັນຄື 1 ໃນ 1,000,000 ສະຖິຕິໃນໜ້ານີ້ບອກໄດ້ພຽງແຕ່ວ່າ "ອະດີດ" ອອກຫຍັງເລື້ອຍ ບໍ່ໄດ້ເຮັດໃຫ້ໂອກາດຖືກງວດໜ້າສູງຂຶ້ນ — ໃຊ້ເພື່ອຄວາມມ່ວນເທົ່ານັ້ນ<br>ເວັບນີ້ນັບຈຳນວນຄົນເຂົ້າແບບບໍ່ລະບຸຕົວຕົນ (ບໍ່ເກັບ IP ຫຼື ຂໍ້ມູນສ່ວນຕົວ)',
      days: ["ອາທິດ", "ຈັນ", "ອັງຄານ", "ພຸດ", "ພະຫັດ", "ສຸກ", "ເສົາ"],
      months: ["ມັງກອນ", "ກຸມພາ", "ມີນາ", "ເມສາ", "ພຶດສະພາ", "ມິຖຸນາ", "ກໍລະກົດ", "ສິງຫາ", "ກັນຍາ", "ຕຸລາ", "ພະຈິກ", "ທັນວາ"],
      date: "ວັນ{day} {d} {month} {y}",
    },
    en: {
      title: "Lao Lottery Number Picker",
      h1: "🎰 Lao Lottery Number Picker",
      sub: "Analyses the last <b>{n}</b> Lao lottery draws (6 digits) and picks numbers weighted by how often each digit came up",
      genTitle: "Pick numbers",
      mode: "Method",
      modeWeighted: "Weighted by frequency (recommended)",
      modeHot: "Hot (favour digits that come up often)",
      modeCold: "Cold (favour digits that rarely come up)",
      modeUniform: "Pure random (no stats)",
      digits: "Digits",
      nDigits: "{n} digits",
      count: "How many",
      generate: "Pick",
      score: "Stat score {s}x",
      endingHits: 'Last {len} digits "{num}" came up {c}×',
      latestOn: " · latest {d}",
      sixMeta: 'Ending "{a}" came up {c2}× · ending "{b}" came up {c3}×',
      pastSix: " · ⚠️ already drawn as a full 6-digit result",
      historyTitle: "Past results",
      drawDate: "Draw date",
      latest: "Latest",
      showMore: "Show more",
      showing: "Showing {a} of {b} draws",
      heatTitle: "How often each digit came up, by position",
      heatHint: "Each cell is how many times that digit came up in that position. Darker = more often",
      positions: ["100,000s", "10,000s", "1,000s", "100s", "10s", "1s"],
      top2: "Most common last 2 digits",
      top3: "Most common last 3 digits",
      times: "{c}×",
      lookupTitle: "Check your number",
      lookupPh: "Enter 2–6 digits, e.g. 45 or 123456",
      lookupBtn: "Check",
      lookupBad: "Please enter 2–6 digits",
      lookupHits: "Numbers ending in <b>{q}</b> came up <b>{c}</b>× in {n} draws",
      lookupExpected: " (pure chance would give ≈ {e})",
      lookupScore: "Stat score of this number: <b>{s}x</b>",
      fbTitle: "💬 Feedback",
      fbHint: "Found a problem or have an idea? Tell us.",
      fbRating: "Rating",
      nStars: "{n} stars",
      fbMessagePh: "Write your message...",
      fbContactPh: "How to reach you (optional), e.g. WhatsApp number",
      fbSend: "Send",
      fbEmpty: "Please write a message first",
      fbSending: "Sending...",
      fbThanks: "Thanks for the feedback 🙏",
      fbOffline: "Couldn't connect, please try again",
      fbFail: "Couldn't send",
      donateTitle: "☕ Support the developer",
      donateHint: "If you like this site, you can donate via LAO QR — scan it with any banking app that supports LAPNet",
      thanks: "Thank you 🙏",
      disclaimer: '⚠️ Every draw is independent: every number has the same 1 in 1,000,000 chance of matching all 6 digits. The stats here only show what came up often in the past — they do not raise your odds next time. For fun only.<br>This site counts visitors anonymously (no IP addresses or personal data are stored).',
      days: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      date: "{day} {d} {month} {y}",
    },
  };

  // ເລືອກພາສາ: ?lang=en ໃນລິ້ງ → ທີ່ເຄີຍເລືອກໄວ້ → ລາວ
  let lang = "lo";
  try { lang = localStorage.getItem("lang") || lang; } catch {}
  const fromUrl = new URLSearchParams(location.search).get("lang");
  if (fromUrl) lang = fromUrl;
  if (!DICT[lang]) lang = "lo";

  function t(key, vars = {}) {
    const v = DICT[lang][key] ?? DICT.lo[key] ?? key;
    return typeof v === "string" ? v.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "") : v;
  }

  // "2026-10-21" → "ວັນພຸດ 21 ຕຸລາ 2026" / "Wed 21 Oct 2026"
  function formatDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    if (!m) return "";
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return t("date", { day: t("days")[d.getUTCDay()], d: +m[3], month: t("months")[+m[2] - 1], y: m[1] });
  }

  function apply() {
    document.documentElement.lang = lang;
    document.title = t("title");
    for (const el of document.querySelectorAll("[data-i18n]")) el.textContent = t(el.dataset.i18n);
    for (const el of document.querySelectorAll("[data-i18n-html]")) el.innerHTML = t(el.dataset.i18nHtml);
    for (const el of document.querySelectorAll("[data-i18n-ph]")) el.placeholder = t(el.dataset.i18nPh);
    for (const el of document.querySelectorAll("[data-i18n-label]")) el.setAttribute("aria-label", t(el.dataset.i18nLabel));
    for (const el of document.querySelectorAll("[data-i18n-digits]")) el.textContent = t("nDigits", { n: el.dataset.i18nDigits });
    for (const el of document.querySelectorAll("[data-i18n-stars]")) el.setAttribute("aria-label", t("nStars", { n: el.dataset.i18nStars }));
    for (const b of document.querySelectorAll(".lang-switch button")) {
      const on = b.dataset.lang === lang;
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", String(on));
    }
  }

  function setLang(l) {
    if (!DICT[l] || l === lang) return;
    lang = l;
    try { localStorage.setItem("lang", l); } catch {}
    // ລຶບ ?lang= ອອກຈາກລິ້ງ ບໍ່ໃຫ້ຂັດກັບທີ່ເລືອກໃໝ່ຕອນໂຫຼດໜ້າຄືນ
    if (fromUrl) history.replaceState(null, "", location.pathname + location.hash);
    apply();
    document.dispatchEvent(new Event("langchange"));
  }

  window.I18N = { t, formatDate, setLang, get lang() { return lang; } };
  apply();
  for (const b of document.querySelectorAll(".lang-switch button")) b.addEventListener("click", () => setLang(b.dataset.lang));
})();
