# Production Retention — Sozlash va Natijalar

## Sana

2026-10-08

## Production muhit

- EC2: native PostgreSQL 18.6
- DB: `kinobot`
- API port: `8080`
- PM2 process: `kinobot-api`
- API prefix: `/api`

## Health route tekshiruvi

2026-10-08 kunida read-only HTTP tekshiriu bundan olingan natijalar:

- `GET /api/health` → `200`
- `GET /api/healthz` → `200`
- `GET /api/health/ready` → `200`
- `GET /api/health/live` → `200`

To‘g‘ri route’lar `/health` yoki `/healthz` emas; ular `404` qo‘yladi. Bu quyilma route’lar `app.use("/api", router)` ostida va `router.use(healthRouter)` orqali mount qilingan.

## Retention sozlash

### `.env` o'zgarishi

- `AUDIT_RETENTION_ENABLED`: `false` → `true`
- Env backup: `/opt/KinoBot/.env.before-retention-20261008-004656`
- Backup mode: `600`

Production PM2 processi environment yangilanishdan keyin restart qilindi.

### Endpoint

- `POST /api/audit-logs/retention`
- Auth: `MANAGE_AUDIT_LOGS`
- Ruxsat beruvchi: admin/superadmin
- Body:

```json
{
  "retentionDays": 90,
  "archiveAfterDays": 90,
  "deleteAfterDays": 365
}
```

Endpoint `app.use("/api", router)` va audit router'si orqali `POST /audit-logs/retention` sifatida mount qilingan. Admin RBAC `admin_users` dan olinadi; `users` table authorization uchun qo‘llatilmaydi.

## Birinchi manual chaqiruv

- HTTP: `200`
- Archived: `0`
- Deleted: `0`
- Audit logs: `76` → `78` (`+2` event)
- Token: o'chirildi

Current data uchun 90/365 kunlik retention threshhold'lari ostida mos log topilmadi. Shuning uchun retention xavfsiz amalga olingan, lekin data yilgandi.

## Cron qarori

`CRON_TOKEN` implementatsiyasi mavjud emas. Admin password'ni cron job'ida saqlash xavfsiz emas. `cron_job` actor type faqat audit metadata'ni izohaladi; u alohida authenticated scheduler'ni yaratmadi.

Hozircha mode manual hisoblanadi. Kelsekda secret-backed worker/process qo‘shilish va test qilinishi kerak.

## PowerShell + SSH Base64 encoding

Base64 encoding `PowerShell` da local payloadni, `SSH` da remote serverda decode qilish uchun qo‘llatiladi. Bu usul, xavfsiz secret'ni boolean bo‘lib saqlash uchun emas; secret maarifati hali ham file mode va aloqada xavfsiz bo‘lishi kerak.

```powershell
$payload = Get-Content 'path-to-temporary-payload.txt' -Raw
$encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($payload))
ssh kinobot "printf '%s' '$encoded' | base64 -d > /tmp/retention-payload.tmp"
```

Productionda payloadni keyin `chmod 600` va qo‘yib chiqish before remote processing. Xavfsiz secret'ni chavotbilara base64 bo‘lib saqlashning o‘zi xavfsiz emas.

## Backup

- DB: `/var/backups/kinobot-before-retention-20261008-004510.dump`
- ENV: `/opt/KinoBot/.env.before-retention-20261008-004656`

## Rollback

### Environment

```bash
ssh kinobot "cp /opt/KinoBot/.env.before-retention-20261008-004656 /opt/KinoBot/.env"
ssh kinobot "pm2 restart kinobot-api --update-env"
```

### Database

```bash
ssh kinobot "sudo -u postgres pg_restore -d kinobot -c /var/backups/kinobot-before-retention-20261008-004510.dump"
```

Database rollback only if an approved recovery operation is required. Current retention call did not delete or archive qualifying rows.

## Kelajakdagi yaxshilanishlar

- [ ] Secret-backed retention worker/process
- [ ] Dry-run mode
- [ ] Scheduler tests
- [ ] Health monitoring
- [ ] Uptime monitoring
- [ ] Sentry/exception monitoring
- [ ] Retention event audit log
