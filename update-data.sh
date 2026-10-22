#!/bin/sh
# ສ້າງ data.js ໃໝ່ຈາກໄຟລ໌ lotto_result
# ຮູບແບບແຕ່ລະແຖວ: "ເລກ6ໂຕ ວັນທີ" ເຊັ່ນ "435208 2026-10-21" (ງວດເກົ່າ → ງວດໃໝ່, ວັນທີບໍ່ໃສ່ກໍໄດ້)
cd "$(dirname "$0")" || exit 1
awk '
  $1 ~ /^[0-9][0-9][0-9][0-9][0-9][0-9]$/ {
    nums = nums sep "\"" $1 "\""
    dates = dates sep "\"" $2 "\""
    sep = ","
    count++
  }
  END {
    print "// ສ້າງຈາກໄຟລ໌ lotto_result — ແລ່ນ ./update-data.sh ຫຼັງແກ້ໄຂຜົນຫວຍ"
    print "window.LOTTO_RESULTS = [" nums "];"
    print "window.LOTTO_DATES = [" dates "];"
    print "ອັບເດດ data.js ແລ້ວ: " count " ງວດ" > "/dev/stderr"
  }
' lotto_result > data.js
