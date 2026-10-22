// ດຶງຜົນຫວຍລາວງວດໃໝ່ຈາກ kapook ແລ້ວຕໍ່ທ້າຍໄຟລ໌ lotto_result (ງວດເກົ່າ → ງວດໃໝ່)
// ຮູບແບບແຕ່ລະແຖວ: "435208 2026-10-21"
// ແລ່ນ: node scripts/update-results.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILE = join(ROOT, "lotto_result");
const BASE = "https://lottery.kapook.com/laolottery/history";
const MAX_PAGES = 5; // ຖ້າຂາດເກີນ ~100 ງວດ ໃຫ້ກວດເອງ

// "21102569" (ວັນ ເດືອນ ປີ ພ.ສ.) → "2026-10-21"
const toIso = (d) => `${+d.slice(4) - 543}-${d.slice(2, 4)}-${d.slice(0, 2)}`;

// ອ່ານໜ້າປະຫວັດ 1 ໜ້າ → [{ date: "2026-10-21", num: "435208" }, ...] (ໃໝ່ → ເກົ່າ)
async function fetchPage(page) {
  const url = page === 1 ? BASE : `${BASE}/${page}`;
  const res = await fetch(url, { headers: { "User-Agent": "lotto-random-bot (+https://github.com/Vongpasith/lotto-random)" } });
  if (!res.ok) throw new Error(`ໂຫຼດ ${url} ບໍ່ໄດ້: HTTP ${res.status}`);
  const html = await res.text();
  const rows = [...html.matchAll(/href="\/laolottery\/(\d{8})"[\s\S]*?<td class="num-cell">(\d{6})<\/td>/g)]
    .map((m) => ({ date: toIso(m[1]), num: m[2] }));
  if (!rows.length) throw new Error(`ບໍ່ພົບຜົນຫວຍໃນ ${url} — ໜ້າເວັບອາດປ່ຽນຮູບແບບ`);
  return rows;
}

const text = readFileSync(FILE, "utf8");
const mine = text.split("\n")
  .map((line) => line.trim().split(/\s+/))
  .filter(([num]) => /^\d{6}$/.test(num))
  .map(([num, date = ""]) => ({ num, date }));
if (!mine.length) throw new Error("lotto_result ບໍ່ມີຂໍ້ມູນ");

const last = mine.at(-1);
if (!/^\d{4}-\d{2}-\d{2}$/.test(last.date)) throw new Error(`ງວດສຸດທ້າຍ (${last.num}) ບໍ່ມີວັນທີ`);

// ດຶງໄປເລື້ອຍໆ ຈົນພົບງວດລ່າສຸດທີ່ມີໃນໄຟລ໌ແລ້ວ
const online = []; // ໃໝ່ → ເກົ່າ
let found = null;
for (let page = 1; page <= MAX_PAGES && !found; page++) {
  online.push(...(await fetchPage(page)));
  found = online.find((r) => r.date <= last.date);
}
if (!found) throw new Error(`ຫາງວດ ${last.date} ບໍ່ພົບໃນ ${MAX_PAGES} ໜ້າ — ກວດໄຟລ໌ lotto_result ເອງ`);
if (found.date === last.date && found.num !== last.num) {
  throw new Error(`ງວດ ${last.date} ໃນໄຟລ໌ເປັນ ${last.num} ແຕ່ kapook ເປັນ ${found.num} — ກວດເອງກ່ອນ`);
}

const fresh = online.filter((r) => r.date > last.date).reverse(); // ເກົ່າ → ໃໝ່
if (!fresh.length) {
  console.log(`ບໍ່ມີງວດໃໝ່ (ລ່າສຸດ: ${last.date} ${last.num})`);
  process.exit(0);
}

const sep = text.endsWith("\n") ? "" : "\n";
writeFileSync(FILE, text + sep + fresh.map((r) => `${r.num} ${r.date}`).join("\n") + "\n");
for (const r of fresh) console.log(`+ ${r.date} ${r.num}`);
console.log(`ເພີ່ມ ${fresh.length} ງວດ`);

execFileSync("sh", [join(ROOT, "update-data.sh")], { stdio: "inherit" });
