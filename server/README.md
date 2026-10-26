# Backend ກາງ: feedback + ສະຖິຕິຄົນເຂົ້າ + admin ຂອງທຸກເວັບ

ທຸກໂປຣເຈັກສົ່ງຂໍ້ມູນມາລວມທີ່ນີ້ ແລ້ວເບິ່ງໄດ້ທີ່ https://vongpasith.site/admin/ (ມີແທັບແຍກຕາມເວັບ) — lotto-ramdom.online/admin/ ຈະສົ່ງຕໍ່ໄປທີ່ນັ້ນ

`server.mjs` ເປັນ Node ລ້ວນ (ບໍ່ຕ້ອງ `npm install`, ໃຊ້ Node 18 ຂຶ້ນໄປ). ຂໍ້ມູນເກັບເປັນໄຟລ໌ JSON ໃນ `DATA_DIR`:

- `stats.json` — ສະຖິຕິລາຍວັນ: ຈຳນວນເປີດໜ້າ, ຄົນບໍ່ຊ້ຳ, ການກົດສຸ່ມ, ອຸປະກອນ, ມາຈາກເວັບໃດ
- `feedback.json` — ຂໍ້ຄວາມ feedback
- `secret.json` — ກະແຈລັບ (ສ້າງເອງຄັ້ງທຳອິດ) ຫ້າມເຜີຍແຜ່

## ເພີ່ມເວັບໃໝ່

1. ໃສ່ໃນໜ້າເວັບນັ້ນ (ລາຍລະອຽດຕົວເລືອກຢູ່ຫົວໄຟລ໌ `w.js`):
   ```html
   <script src="https://lotto-ramdom.online/w.js" async></script>
   ```
2. ເພີ່ມໂດເມນໃນ `SITES` ຂອງ `/etc/lotto-api.env` ແລ້ວ `sudo systemctl restart lotto-api`
   ```
   SITES=lotto-ramdom.online=lotto,vongpasith.github.io=lotto,fakhan.tech=fakhan,www.fakhan.tech=fakhan,ໂດເມນ-hangan=hangan,ໂດເມນ-emenu=emenu
   ```
   ໂດເມນທີ່ບໍ່ຢູ່ໃນ `SITES` ຈະຖືກບໍ່ສົນ (ກັນເວັບອື່ນຍິງຂໍ້ມູນປອມ). ຊື່ທີ່ສະແດງໃນ admin ແກ້ໄດ້ທີ່ `SITE_NAMES` ໃນ `admin/admin.js`

| ລະຫັດ | ໂປຣເຈັກ | ໃສ່ສະຄຣິບໄວ້ທີ່ |
|---|---|---|
| `lotto` | lotto-random | ມີຟອມເອງໃນ `index.html` + `feedback.js` |
| `fakhan` | web-site shop (fakhan.tech) | `public/index.html`, `404.html`, `shop.html`, `account.html` |
| `hangan` | HanGan | `frontend/src/routes/__root.tsx` |
| `emenu` | e-menu | `src/app/layout.tsx` |

ບໍ່ເກັບ IP ແທ້ — ນັບຄົນບໍ່ຊ້ຳດ້ວຍ hash ທີ່ປ່ຽນທຸກມື້.

## API

| ເສັ້ນທາງ | ໃຊ້ເຮັດຫຍັງ |
|---|---|
| `POST /api/track` | ນັບການເປີດໜ້າ / ການກົດປຸ່ມ (ແຍກເວັບຕາມ `Origin`) |
| `POST /api/feedback` | ຮັບ feedback (ຈຳກັດ 5 ຄັ້ງ / 10 ນາທີ ຕໍ່ IP) |
| `POST /api/admin/login` | ເຂົ້າສູ່ລະບົບ admin (ຈຳກັດ 10 ຄັ້ງ / 15 ນາທີ) |
| `GET /api/admin/stats`, `GET /api/admin/feedback` | ຂໍ້ມູນສຳລັບໜ້າ `/admin/` |

## ຕິດຕັ້ງເທິງ server (VPS 187.77.149.133, ຕິດຕັ້ງແລ້ວ)

- ໂຄ້ດ: `/opt/lotto-random-src` (git clone) · ໜ້າເວັບ: `/var/www/lotto-random` · ຂໍ້ມູນ: `/var/lib/lotto-api`
- ອັບເດດ: ພຽງ `git push` ແລ້ວລໍຖ້າ ≤ 15 ນາທີ — cron ແລ່ນ [`lotto-sync.sh`](lotto-sync.sh) (ຕິດຕັ້ງເປັນ `/usr/local/bin/lotto-sync`)
  ດຶງໂຄ້ດ, copy ໄຟລ໌ໜ້າເວັບ, ແລະ restart backend ຖ້າ `server.mjs` ປ່ຽນ. ໄຟລ໌ໜ້າເວັບໃໝ່ຕ້ອງເພີ່ມໃນລາຍການ rsync ຂອງສະຄຣິບນີ້
- backend: `systemctl status lotto-api` (ໄຟລ໌ [`lotto-api.service`](lotto-api.service)), ລະຫັດ admin ແລະ `SITES` ຢູ່ `/etc/lotto-api.env`
- Caddy: `/etc/caddy/lotto.caddy` ມີ `handle /api/* { reverse_proxy 127.0.0.1:3011 }` ແລະ `/admin/*` → vongpasith.site · ໜ້າ admin: [`vongpasith.caddy`](vongpasith.caddy)
- ພອດ 3011 ເພາະ 3001 ເປັນຂອງ HanGan ຢູ່ແລ້ວ

ໜ້າ admin: https://vongpasith.site/admin/

## ທົດສອບໃນເຄື່ອງ

```sh
ADMIN_PASSWORD=testpass123 COOKIE_SECURE=0 STATIC_DIR=.. PORT=3999 node server.mjs
# ເປີດ http://127.0.0.1:3999/ ແລະ http://127.0.0.1:3999/admin/
```
