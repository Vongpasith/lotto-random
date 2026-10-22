// Backend ກາງ ສຳລັບທຸກເວັບ: ເກັບ feedback, ນັບຄົນເຂົ້າ, ແລະ API ໜ້າ admin (ຢູ່ທີ່ lotto-ramdom.online)
// ເວັບອື່ນໃສ່ <script src="https://lotto-ramdom.online/w.js"> ແລ້ວຂໍ້ມູນຈະເຂົ້າມາບ່ອນນີ້ ແຍກຕາມເວັບ
// ບໍ່ຕ້ອງຕິດຕັ້ງ package ໃດ (Node 18+). ຂໍ້ມູນເກັບເປັນໄຟລ໌ JSON ໃນ DATA_DIR
//
// ຕົວແປ env:
//   ADMIN_PASSWORD  (ຕ້ອງມີ) ລະຫັດເຂົ້າໜ້າ admin
//   PORT            ຄ່າເລີ່ມຕົ້ນ 3001
//   DATA_DIR        ຄ່າເລີ່ມຕົ້ນ ./data
//   SITES           ໂດເມນ=ລະຫັດເວັບ ຂັ້ນດ້ວຍ , (ເບິ່ງ DEFAULT_SITES) ໂດເມນທີ່ບໍ່ຢູ່ໃນລາຍການຈະຖືກບໍ່ສົນ
//   HOME_SITE       ລະຫັດເວັບຂອງໂດເມນນີ້ເອງ ຄ່າເລີ່ມຕົ້ນ lotto
//   COOKIE_SECURE   ຕັ້ງເປັນ 0 ເວລາທົດສອບໃນເຄື່ອງ (http)
//   STATIC_DIR      (ສະເພາະທົດສອບ) ໃຫ້ server ນີ້ເສີບໄຟລ໌ໜ້າເວັບນຳ — ເທິງ server ແທ້ໃຫ້ Caddy ເຮັດ
import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const PORT = +(process.env.PORT || 3001);
const DATA_DIR = path.resolve(process.env.DATA_DIR || "./data");
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const DEFAULT_SITES = "lotto-ramdom.online=lotto,vongpasith.github.io=lotto,fakhan.tech=fakhan,www.fakhan.tech=fakhan";
const HOME_SITE = process.env.HOME_SITE || "lotto";
const COOKIE_SECURE = process.env.COOKIE_SECURE !== "0";
const STATIC_DIR = process.env.STATIC_DIR ? path.resolve(process.env.STATIC_DIR) : null;
const SESSION_DAYS = 7;
const KEEP_DAYS = 400;          // ເກັບສະຖິຕິລາຍວັນຍ້ອນຫຼັງ
const MAX_FEEDBACK = 5000;
const MAX_KEYS = 100;           // ຈຳນວນໜ້າ / ເວັບຕົ້ນທາງ ສູງສຸດຕໍ່ມື້ (ກັນໄຟລ໌ໃຫຍ່ເກີນ)

// ໂດເມນ (host ລວມ port ຖ້າມີ) → ລະຫັດເວັບ
const SITES = new Map(
  (process.env.SITES || DEFAULT_SITES).split(",").map((s) => s.trim().split("="))
    .filter(([host, id]) => host && /^[a-z0-9_-]{1,20}$/.test(id || ""))
    .map(([host, id]) => [host.toLowerCase(), id]),
);

if (ADMIN_PASSWORD.length < 8) {
  console.error("ກະລຸນາຕັ້ງ ADMIN_PASSWORD ຢ່າງໜ້ອຍ 8 ຕົວອັກສອນ");
  process.exit(1);
}
fs.mkdirSync(DATA_DIR, { recursive: true });

// ---------- ເກັບ/ອ່ານໄຟລ໌ ----------
const file = (name) => path.join(DATA_DIR, name);
function readJson(name, fallback) {
  try { return JSON.parse(fs.readFileSync(file(name), "utf8")); } catch { return fallback; }
}
function writeJson(name, data) {
  const tmp = file(name + ".tmp");
  fs.writeFileSync(tmp, JSON.stringify(data));
  fs.renameSync(tmp, file(name)); // ຂຽນແບບປອດໄພ ບໍ່ໃຫ້ໄຟລ໌ເສຍຖ້າເຄື່ອງດັບກາງຄັນ
}

let secret = readJson("secret.json", null)?.secret;
if (!secret) {
  secret = crypto.randomBytes(32).toString("hex");
  writeJson("secret.json", { secret });
}

const stats = readJson("stats.json", { sites: {}, seen: { date: "", ids: [] } });
const feedback = readJson("feedback.json", []);

// ຂໍ້ມູນຮູບແບບເກົ່າ (ມີແຕ່ lotto) → ຍ້າຍເຂົ້າ sites.lotto
if (stats.days) {
  stats.sites = { ...stats.sites, lotto: { days: stats.days } };
  delete stats.days;
}
stats.sites ||= {};
stats.seen ||= { date: "", ids: [] };
for (const site of Object.values(stats.sites)) {
  for (const day of Object.values(site.days)) {
    day.events ||= {};
    if (day.generates) day.events.generate = (day.events.generate || 0) + day.generates;
    delete day.generates;
    day.pages ||= {};
  }
}
for (const f of feedback) f.site ||= "lotto";

let seenToday = new Set(stats.seen.date === today() ? stats.seen.ids : []);
let dirty = { stats: false, feedback: false };

function flush() {
  if (dirty.stats) {
    stats.seen = { date: today(), ids: [...seenToday] };
    writeJson("stats.json", stats);
    dirty.stats = false;
  }
  if (dirty.feedback) {
    writeJson("feedback.json", feedback);
    dirty.feedback = false;
  }
}
dirty.stats = dirty.feedback = true; // ບັນທຶກຮູບແບບໃໝ່ລົງໄຟລ໌ເລີຍ
setInterval(flush, 10_000).unref();
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { flush(); process.exit(0); });

// ---------- ເຄື່ອງມື ----------
function today() {
  // ວັນທີຕາມເວລາລາວ (UTC+7)
  return new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
}
function clientIp(req) {
  const fromProxy = ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress);
  const fwd = fromProxy && req.headers["x-forwarded-for"];
  return (fwd ? fwd.split(",")[0] : req.socket.remoteAddress || "").trim();
}
// hash ຂອງ IP ສຳລັບຈຳກັດຈຳນວນຄັ້ງ (ບໍ່ບັນທຶກລົງໄຟລ໌)
function ipKey(req) {
  return crypto.createHash("sha256").update(`${secret}|${clientIp(req)}`).digest("base64url").slice(0, 16);
}
// ບໍ່ເກັບ IP ແທ້ — ເກັບແຕ່ hash ທີ່ປ່ຽນທຸກມື້ (ແຍກຕາມເວັບ: ຄົນດຽວເຂົ້າ 2 ເວັບ ນັບທັງ 2 ເວັບ)
function visitorId(req, site) {
  return crypto.createHash("sha256")
    .update(`${secret}|${today()}|${site}|${clientIp(req)}|${req.headers["user-agent"] || ""}`)
    .digest("base64url").slice(0, 16);
}
function deviceOf(ua = "") {
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone/i.test(ua)) return "mobile";
  return "desktop";
}
const BOT = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|curl|wget|python|monitor/i;

// ຄຳຂໍມາຈາກເວັບໃດ: ເບິ່ງຈາກ Origin (ບໍ່ເຊື່ອຄ່າທີ່ສົ່ງມາໃນ body)
// ບໍ່ມີ Origin ຫຼື ມາຈາກໂດເມນນີ້ເອງ → HOME_SITE, ໂດເມນທີ່ບໍ່ຮູ້ຈັກ → null
function siteOf(req) {
  const origin = req.headers.origin;
  if (!origin) return HOME_SITE;
  let host;
  try { host = new URL(origin).host.toLowerCase(); } catch { return null; }
  if (host === String(req.headers.host || "").toLowerCase()) return SITES.get(host) || HOME_SITE;
  return SITES.get(host) || null;
}
function hostsOf(site) {
  return [...SITES].filter(([, id]) => id === site).map(([host]) => host.replace(/:\d+$/, ""));
}

function refDomain(ref, site) {
  try {
    const host = new URL(ref).hostname.replace(/^www\./, "");
    if (hostsOf(site).some((h) => h.replace(/^www\./, "") === host)) return null; // ໃນເວັບເອງ
    if (/(^|\.)facebook\.com$|fb\.me$|messenger\.com$/.test(host)) return "facebook";
    return host.slice(0, 60);
  } catch { return ref ? null : "direct"; }
}
// ລວມໜ້າທີ່ຄ້າຍກັນ: ຕັດ query, ແທນ id ຍາວໆ (uuid, ເລກ) ດ້ວຍ :id
function pageKey(p) {
  const s = clean(p, 300).split(/[?#]/)[0] || "/";
  if (!s.startsWith("/")) return null;
  return s.split("/").map((seg) =>
    /^[0-9a-f-]{16,}$/i.test(seg) || /^\d+$/.test(seg) || seg.length > 40 ? ":id" : seg,
  ).join("/").slice(0, 80);
}
function bump(map, key, n = 1) {
  if (!(key in map) && Object.keys(map).length >= MAX_KEYS) key = "(ອື່ນໆ)";
  map[key] = (map[key] || 0) + n;
}

// ຈຳກັດຈຳນວນຄັ້ງຕໍ່ຄົນ ກັນສະແປມ
const buckets = new Map();
function limited(key, max, windowMs) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.reset) { buckets.set(key, { n: 1, reset: now + windowMs }); return false; }
  b.n++;
  return b.n > max;
}
setInterval(() => { const now = Date.now(); for (const [k, b] of buckets) if (now > b.reset) buckets.delete(k); }, 60_000).unref();

function dayBucket(site, date) {
  const s = (stats.sites[site] ||= { days: {} });
  return (s.days[date] ||= { views: 0, uniques: 0, feedback: 0, events: {}, devices: {}, refs: {}, pages: {} });
}
function pruneDays(site) {
  const days = stats.sites[site].days;
  const keys = Object.keys(days).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - KEEP_DAYS))) delete days[k];
}

// ---------- session ຂອງ admin ----------
function sign(value) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}
function makeToken() {
  const exp = String(Date.now() + SESSION_DAYS * 86400_000);
  return `${exp}.${sign(exp)}`;
}
function validToken(token = "") {
  const [exp, sig] = token.split(".");
  if (!exp || !sig || +exp < Date.now()) return false;
  const a = Buffer.from(sig), b = Buffer.from(sign(exp));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function cookie(req, name) {
  const m = (req.headers.cookie || "").match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : "";
}
function passwordOk(input) {
  const a = crypto.createHash("sha256").update(String(input)).digest();
  const b = crypto.createHash("sha256").update(ADMIN_PASSWORD).digest();
  return crypto.timingSafeEqual(a, b);
}

// ---------- HTTP ----------
function send(res, status, body, headers = {}) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers });
  res.end(body === undefined ? "" : JSON.stringify(body));
}
// ອ່ານ body ເປັນ JSON ບໍ່ວ່າ Content-Type ຈະເປັນຫຍັງ (w.js ສົ່ງເປັນ text/plain ເພື່ອບໍ່ຕ້ອງມີ CORS preflight)
function readBody(req, limit = 10_000) {
  return new Promise((resolve, reject) => {
    let size = 0, chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size <= limit) chunks.push(c); // ເກີນແລ້ວບໍ່ເກັບ ແຕ່ອ່ານໃຫ້ໝົດ ເພື່ອຕອບ 413 ກັບໄປໄດ້
    });
    req.on("end", () => {
      if (size > limit) return reject(new Error("too large"));
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")); } catch { resolve(null); }
    });
    req.on("error", reject);
  });
}
// ອະນຸຍາດສະເພາະເວັບທີ່ຢູ່ໃນ SITES (ສະເພາະ /api/track ແລະ /api/feedback, ບໍ່ແມ່ນ admin)
function cors(req, res, pathname) {
  const origin = req.headers.origin;
  if (!origin || pathname.startsWith("/api/admin/")) return;
  let host;
  try { host = new URL(origin).host.toLowerCase(); } catch { return; }
  if (SITES.has(host)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
  res.setHeader("Vary", "Origin");
}
const clean = (s, max) => String(s ?? "").replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").trim().slice(0, max);

const routes = {
  // ນັບການເຂົ້າເບິ່ງ ({type:"view", path, ref}) ຫຼື ການກົດປຸ່ມ ({type:"generate"} ແລະອື່ນໆ)
  "POST /api/track": async (req, res) => {
    const body = await readBody(req, 2000);
    const ua = req.headers["user-agent"] || "";
    const site = siteOf(req);
    if (!body || !site || BOT.test(ua)) return send(res, 204);
    if (limited(`track:${site}:${ipKey(req)}`, 300, 60 * 60_000)) return send(res, 204);
    const date = today();
    if (stats.seen.date !== date) { seenToday = new Set(); stats.seen.date = date; }
    const day = dayBucket(site, date);
    const type = clean(body.type || "view", 30);
    if (type !== "view") {
      if (!/^[a-z0-9_-]+$/.test(type)) return send(res, 204);
      bump(day.events, type);
    } else {
      day.views++;
      const page = body.path === undefined ? null : pageKey(body.path);
      if (page) bump(day.pages, page);
      const id = visitorId(req, site);
      if (!seenToday.has(id)) {
        seenToday.add(id);
        day.uniques++;
        bump(day.devices, deviceOf(ua));
        const ref = refDomain(clean(body.ref, 300), site);
        if (ref) bump(day.refs, ref);
      }
    }
    pruneDays(site);
    dirty.stats = true;
    send(res, 204);
  },

  // ຮັບ feedback
  "POST /api/feedback": async (req, res) => {
    const site = siteOf(req);
    if (!site) return send(res, 403, { error: "ເວັບນີ້ຍັງບໍ່ໄດ້ລົງທະບຽນ" });
    const body = await readBody(req);
    if (!body) return send(res, 400, { error: "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ" });
    if (body.website) return send(res, 200, { ok: true }); // ກັບດັກ bot (ຊ່ອງທີ່ຄົນບໍ່ເຫັນ)
    const message = clean(body.message, 2000);
    if (message.length < 2) return send(res, 400, { error: "ກະລຸນາຂຽນຂໍ້ຄວາມ" });
    if (limited("fb:" + ipKey(req), 5, 10 * 60_000)) return send(res, 429, { error: "ສົ່ງຖີ່ເກີນໄປ ກະລຸນາລໍຖ້າຈັກໜ່ອຍ" });
    const rating = Number.isInteger(body.rating) && body.rating >= 1 && body.rating <= 5 ? body.rating : null;
    feedback.push({
      id: crypto.randomBytes(6).toString("hex"),
      site,
      time: new Date().toISOString(),
      message,
      contact: clean(body.contact, 200),
      rating,
      page: body.path === undefined ? "" : pageKey(body.path) || "",
      device: deviceOf(req.headers["user-agent"]),
      read: false,
    });
    if (feedback.length > MAX_FEEDBACK) feedback.splice(0, feedback.length - MAX_FEEDBACK);
    dayBucket(site, today()).feedback++;
    dirty.feedback = dirty.stats = true;
    send(res, 200, { ok: true });
  },

  // ---------- admin ----------
  "POST /api/admin/login": async (req, res) => {
    if (limited("login:" + ipKey(req), 10, 15 * 60_000)) return send(res, 429, { error: "ລອງຫຼາຍເກີນໄປ ລໍຖ້າ 15 ນາທີ" });
    const body = await readBody(req, 1000);
    if (!body || !passwordOk(body.password || "")) return send(res, 401, { error: "ລະຫັດຜ່ານບໍ່ຖືກ" });
    const flags = `HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=${SESSION_DAYS * 86400}${COOKIE_SECURE ? "; Secure" : ""}`;
    send(res, 200, { ok: true }, { "Set-Cookie": `admin=${makeToken()}; ${flags}` });
  },
  "POST /api/admin/logout": async (req, res) => {
    send(res, 200, { ok: true }, { "Set-Cookie": "admin=; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=0" });
  },
  "GET /api/admin/stats": async (req, res) => {
    // ສົ່ງທຸກເວັບທີ່ລົງທະບຽນໄວ້ (ເຖິງຍັງບໍ່ມີຂໍ້ມູນ) ພ້ອມເວັບທີ່ເຄີຍມີຂໍ້ມູນ
    const ids = [...new Set([HOME_SITE, ...SITES.values(), ...Object.keys(stats.sites)])];
    const sites = {};
    for (const id of ids) {
      const fb = feedback.filter((f) => f.site === id);
      sites[id] = {
        hosts: hostsOf(id),
        days: stats.sites[id]?.days || {},
        unread: fb.filter((f) => !f.read).length,
        totalFeedback: fb.length,
      };
    }
    send(res, 200, { today: today(), sites });
  },
  "GET /api/admin/feedback": async (req, res) => {
    send(res, 200, { items: [...feedback].reverse() });
  },
  "POST /api/admin/feedback/read": async (req, res) => {
    const body = await readBody(req, 1000);
    const item = feedback.find((f) => f.id === body?.id);
    if (!item) return send(res, 404, { error: "ບໍ່ພົບ" });
    item.read = body.read !== false;
    dirty.feedback = true;
    send(res, 200, { ok: true });
  },
  "POST /api/admin/feedback/delete": async (req, res) => {
    const body = await readBody(req, 1000);
    const i = feedback.findIndex((f) => f.id === body?.id);
    if (i < 0) return send(res, 404, { error: "ບໍ່ພົບ" });
    feedback.splice(i, 1);
    dirty.feedback = true;
    send(res, 200, { ok: true });
  },
};

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png", ".json": "application/json" };
function serveStatic(pathname, res) {
  let p = path.join(STATIC_DIR, path.normalize(decodeURIComponent(pathname)));
  if (!p.startsWith(STATIC_DIR)) return send(res, 403);
  if (pathname.endsWith("/")) p = path.join(p, "index.html");
  fs.readFile(p, (err, buf) => {
    if (err) return send(res, 404, { error: "not found" });
    res.writeHead(200, { "Content-Type": TYPES[path.extname(p)] || "application/octet-stream" });
    res.end(buf);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  cors(req, res, url.pathname);
  if (req.method === "OPTIONS") return send(res, 204);
  const handler = routes[`${req.method} ${url.pathname}`];
  if (!handler && STATIC_DIR && req.method === "GET" && !url.pathname.startsWith("/api/")) return serveStatic(url.pathname, res);
  if (!handler) return send(res, 404, { error: "not found" });

  if (url.pathname.startsWith("/api/admin/") && url.pathname !== "/api/admin/login") {
    if (!validToken(cookie(req, "admin"))) return send(res, 401, { error: "ກະລຸນາເຂົ້າສູ່ລະບົບ" });
  }
  // ກັນເວັບອື່ນສັ່ງ admin ແທນ (CSRF): POST ຂອງ admin ຕ້ອງມາຈາກເວັບດຽວກັນ
  if (url.pathname.startsWith("/api/admin/") && req.method === "POST" && req.headers["sec-fetch-site"] && req.headers["sec-fetch-site"] !== "same-origin") {
    return send(res, 403, { error: "forbidden" });
  }
  try {
    await handler(req, res);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) send(res, ...(err.message === "too large" ? [413, { error: "ຂໍ້ຄວາມຍາວເກີນໄປ" }] : [500, { error: "server error" }]));
  }
});

server.listen(PORT, "127.0.0.1", () => console.log(`stats/feedback api: http://127.0.0.1:${PORT} (data: ${DATA_DIR}, sites: ${[...SITES].map((s) => s.join("=")).join(", ")})`));
