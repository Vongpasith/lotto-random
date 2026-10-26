#!/bin/sh
# ດຶງໂຄ້ດ + ຜົນຫວຍລ່າສຸດຈາກ GitHub (Vongpasith/lotto-random) ແລ້ວອັບເດດເວັບ lotto-ramdom.online
# ຕິດຕັ້ງເປັນ /usr/local/bin/lotto-sync, cron ແລ່ນທຸກ 15 ນາທີ ແລະ ທຸກ 5 ນາທີ ຊ່ວງຫວຍອອກ (/etc/cron.d/lotto-sync)
set -e
cd /opt/lotto-random-src
old=$(git rev-parse HEAD)
git fetch -q origin main
git reset -q --hard origin/main
# ຊ່ວງຫວຍອອກ (ຈັນ–ສຸກ 20:00–02:00 ເວລາລາວ): ດຶງຜົນຈາກ kapook ເອງເທິງ server ບໍ່ຕ້ອງລໍ GitHub Actions
# (GitHub ເລື່ອນເວລາ schedule ໄດ້ຫຼາຍຊົ່ວໂມງ) — ຜົນຢູ່ໃນ data.js ທີ່ຈະ copy ຂ້າງລຸ່ມ; GitHub ຍັງ commit ເກັບໄວ້ຕາມປົກກະຕິ
H=$(TZ=Asia/Vientiane date +%H); D=$(TZ=Asia/Vientiane date +%u)
if { [ "$D" -le 5 ] && [ "$H" -ge 20 ]; } || { [ "$D" -ge 2 ] && [ "$D" -le 6 ] && [ "$H" -lt 2 ]; }; then
  node scripts/update-results.mjs >/dev/null 2>&1 || logger -t lotto-sync "update-results failed"
fi
# ສະເພາະໄຟລ໌ໜ້າເວັບ (ບໍ່ເອົາ server/, scripts/, .git ອອກໄປເວັບ)
rsync -a --delete-after --chmod=Da+rx,Fa+r index.html app.js data.js i18n.js feedback.js w.js style.css img admin /var/www/lotto-random/
# backend ປ່ຽນ → restart (ໂຄ້ດ backend ແລ່ນຈາກ /opt/lotto-random-src/server ໂດຍກົງ)
if ! git diff --quiet "$old" HEAD -- server/server.mjs; then systemctl restart lotto-api; fi
