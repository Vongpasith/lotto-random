# Backend: feedback + ສະຖິຕິຄົນເຂົ້າ + admin

`server.mjs` ເປັນ Node ລ້ວນ (ບໍ່ຕ້ອງ `npm install`, ໃຊ້ Node 18 ຂຶ້ນໄປ). ຂໍ້ມູນເກັບເປັນໄຟລ໌ JSON ໃນ `DATA_DIR`:

- `stats.json` — ສະຖິຕິລາຍວັນ: ຈຳນວນເປີດໜ້າ, ຄົນບໍ່ຊ້ຳ, ການກົດສຸ່ມ, ອຸປະກອນ, ມາຈາກເວັບໃດ
- `feedback.json` — ຂໍ້ຄວາມ feedback
- `secret.json` — ກະແຈລັບ (ສ້າງເອງຄັ້ງທຳອິດ) ຫ້າມເຜີຍແຜ່

ບໍ່ເກັບ IP ແທ້ — ນັບຄົນບໍ່ຊ້ຳດ້ວຍ hash ທີ່ປ່ຽນທຸກມື້.

## API

| ເສັ້ນທາງ | ໃຊ້ເຮັດຫຍັງ |
|---|---|
| `POST /api/track` | ນັບການເປີດໜ້າ / ການກົດສຸ່ມ |
| `POST /api/feedback` | ຮັບ feedback (ຈຳກັດ 5 ຄັ້ງ / 10 ນາທີ ຕໍ່ IP) |
| `POST /api/admin/login` | ເຂົ້າສູ່ລະບົບ admin (ຈຳກັດ 10 ຄັ້ງ / 15 ນາທີ) |
| `GET /api/admin/stats`, `GET /api/admin/feedback` | ຂໍ້ມູນສຳລັບໜ້າ `/admin/` |

## ຕິດຕັ້ງເທິງ server (Ubuntu + Caddy)

```sh
# 1) ເອົາໂຄ້ດລົງ server
sudo git clone https://github.com/Vongpasith/lotto-random.git /opt/lotto-random

# 2) ຕັ້ງລະຫັດ admin (ຢ່າງໜ້ອຍ 8 ຕົວ)
echo 'ADMIN_PASSWORD=ລະຫັດຂອງທ່ານ' | sudo tee /etc/lotto-api.env
sudo chmod 600 /etc/lotto-api.env

# 3) ເປີດ service
sudo cp /opt/lotto-random/server/lotto-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now lotto-api
```

4) ເພີ່ມໃນ Caddyfile ແລ້ວ `sudo systemctl reload caddy`:

```
lotto-ramdom.online {
    root * /opt/lotto-random
    handle /api/* {
        reverse_proxy 127.0.0.1:3001
    }
    # ບໍ່ໃຫ້ເປີດໄຟລ໌ backend ຈາກເວັບ
    @private path /server/* /.git/* /.github/* /scripts/*
    respond @private 404
    file_server
}
```

ໜ້າ admin: https://lotto-ramdom.online/admin/

## ທົດສອບໃນເຄື່ອງ

```sh
ADMIN_PASSWORD=testpass123 COOKIE_SECURE=0 STATIC_DIR=.. PORT=3999 node server.mjs
# ເປີດ http://127.0.0.1:3999/ ແລະ http://127.0.0.1:3999/admin/
```
