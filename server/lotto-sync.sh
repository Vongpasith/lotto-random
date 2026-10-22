#!/bin/sh
# ດຶງໂຄ້ດ + ຜົນຫວຍລ່າສຸດຈາກ GitHub (Vongpasith/lotto-random) ແລ້ວອັບເດດເວັບ lotto-ramdom.online
# ຕິດຕັ້ງເປັນ /usr/local/bin/lotto-sync, cron ແລ່ນທຸກ 15 ນາທີ (/etc/cron.d/lotto-sync)
set -e
cd /opt/lotto-random-src
old=$(git rev-parse HEAD)
git fetch -q origin main
git reset -q --hard origin/main
# ສະເພາະໄຟລ໌ໜ້າເວັບ (ບໍ່ເອົາ server/, scripts/, .git ອອກໄປເວັບ)
rsync -a --delete-after --chmod=Da+rx,Fa+r index.html app.js data.js feedback.js w.js style.css img admin /var/www/lotto-random/
# backend ປ່ຽນ → restart (ໂຄ້ດ backend ແລ່ນຈາກ /opt/lotto-random-src/server ໂດຍກົງ)
if ! git diff --quiet "$old" HEAD -- server/server.mjs; then systemctl restart lotto-api; fi
