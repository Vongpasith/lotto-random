// ດຶງຜົນຫວຍລາວງວດໃໝ່ຈາກ kapook ແລ້ວຕໍ່ທ້າຍໄຟລ໌ lotto_result (ງວດເກົ່າ → ງວດໃໝ່)
// ແລ່ນ: node scripts/update-results.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILE = join(ROOT, "lotto_result");
const BASE = "https://lottery.kapook.com/laolottery/history";
const MAX_PAGES = 5; // ຖ້າຂາດເກີນ ~100 ງວດ ໃຫ້ກວດເອງ

// ອ່ານໜ້າປະຫວັດ 1 ໜ້າ → [{ date: "21102569", num: "435208" }, ...] (ໃໝ່ → ເກົ່າ)
async function fetchPage(page) {
  const url = page === 1 ? BASE : `${BASE}/${page}`;
  const res = await fetch(url, { headers: { "User-Agent": "lotto-random-bot (+https://github.com/Vongpasith/lotto-random)" } });
  if (!res.ok) throw new Error(`ໂຫຼດ ${url} ບໍ່ໄດ້: HTTP ${res.status}`);
  const html = await res.text();
  const rows = [...html.matchAll(/href="\/laolottery\/(\d{8})"[\s\S]*?<td class="num-cell">(\d{6})<\/td>/g)]
    .map((m) => ({ date: m[1], num: m[2] }));
  if (!rows.length) throw new Error(`ບໍ່ພົບຜົນຫວຍໃນ ${url} — ໜ້າເວັບອາດປ່ຽນຮູບແບບ`);
  return rows;
}

const text = readFileSync(FILE, "utf8");
const mine = text.split(/\s+/).filter((s) => /^\d{6}$/.test(s));
if (mine.length < 2) throw new Error("lotto_result ຕ້ອງມີຢ່າງໜ້ອຍ 2 ງວດ");

// ໃຊ້ 2 ງວດສຸດທ້າຍໃນໄຟລ໌ເປັນຈຸດອ້າງອີງ (ກັນເລກຊ້ຳກັນຂ້າມງວດ)
const [prev, last] = mine.slice(-2);
const online = []; // ໃໝ່ → ເກົ່າ
let anchor = -1;
for (let page = 1; page <= MAX_PAGES && anchor < 0; page++) {
  online.push(...(await fetchPage(page)));
  anchor = online.findIndex((r, i) => r.num === last && online[i + 1]?.num === prev);
}
if (anchor < 0) {
  throw new Error(`ຫາງວດລ່າສຸດໃນໄຟລ໌ (${prev}, ${last}) ບໍ່ພົບໃນ ${MAX_PAGES} ໜ້າ — ກວດໄຟລ໌ lotto_result ເອງ`);
}

const fresh = online.slice(0, anchor).reverse(); // ເກົ່າ → ໃໝ່
if (!fresh.length) {
  console.log(`ບໍ່ມີງວດໃໝ່ (ລ່າສຸດ: ${last})`);
  process.exit(0);
}

const sep = text.endsWith("\n") ? "" : "\n";
writeFileSync(FILE, text + sep + fresh.map((r) => r.num).join("\n") + "\n");
for (const r of fresh) console.log(`+ ${r.date} ${r.num}`);
console.log(`ເພີ່ມ ${fresh.length} ງວດ`);

execFileSync("sh", [join(ROOT, "update-data.sh")], { stdio: "inherit" });
