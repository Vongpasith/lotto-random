#!/bin/sh
# ສ້າງ data.js ໃໝ່ຈາກໄຟລ໌ lotto_result (ແຖວລະງວດ ເລກ 6 ໂຕ)
cd "$(dirname "$0")" || exit 1
{
  echo "// ສ້າງຈາກໄຟລ໌ lotto_result — ແລ່ນ ./update-data.sh ຫຼັງແກ້ໄຂຜົນຫວຍ"
  printf 'window.LOTTO_RESULTS = ['
  grep -oE '^[0-9]{6}' lotto_result | sed 's/.*/"&"/' | paste -sd, - | tr -d '\n'
  echo "];"
} > data.js
echo "ອັບເດດ data.js ແລ້ວ: $(grep -cE '^[0-9]{6}' lotto_result) ງວດ"
