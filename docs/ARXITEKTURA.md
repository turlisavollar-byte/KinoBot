# StreamOps — Loyiha arxitekturasi qo'llanmasi

> Bu hujjat loyihaning to'liq papka/fayl tuzilishini va har bir qismning nima uchun javobgarligini tushuntiradi. Yangi funksiya qo'shishdan oldin shu faylni o'qib chiqing — qayerga nima yozish kerakligini bilib olasiz.

## 1. Umumiy ko'rinish

Loyiha **pnpm monorepo** tarzida qurilgan — bitta repo ichida bir nechta mustaqil paket (`artifacts/*` va `lib/*`) mavjud, ular birgalikda bitta mahsulotni tashkil qiladi:

```
workspace/
├── apps/                   ← Ishga tushadigan servislar (har biri alohida workflow)
│   ├── api-server/         ← Backend: Express API + Telegram bot (bitta process)
│   └── dashboard/          ← Admin panel (React + Vite, brauzerda ochiladi)
├── lib/                    ← Umumiy kutubxonalar (bir nechta app ishlatadi)
│   ├── api-spec/           ← OpenAPI spetsifikatsiyasi — BARCHA API shartnomalarining manbai
│   ├── api-client-react/   ← OpenAPI'dan avtomatik generatsiya qilingan React Query hook'lari
│   ├── api-zod/            ← OpenAPI'dan avtomatik generatsiya qilingan Zod validatorlar (backend uchun)
│   └── db/                 ← Drizzle ORM sxemalari + DB ulanish
├── scripts/                ← Bir martalik yordamchi skriptlar
└── README.md               ← Loyiha haqida qisqacha
```

**Muhim tamoyil (Contract-First):** Har qanday API o'zgarishi avval `lib/api-spec/openapi.yaml` faylida yoziladi, so'ng `pnpm --filter @workspace/api-spec run codegen` orqali backend (Zod) va frontend (React hook) kodlari **avtomatik** generatsiya qilinadi. Qo'lda tip yozilmaydi.

---

## 2. `artifacts/api-server` — Backend (Express + Telegram bot)

Bitta Node.js process ichida ikkita narsa bir vaqtda ishlaydi: **REST API** (admin panel uchun) va **Telegram bot** (foydalanuvchilar uchun).

```
api-server/src/
├── index.ts                 ← Kirish nuqtasi: serverni va botni ishga tushiradi
├── app.ts                   ← Express ilovasini yig'adi (middleware'lar, /api prefiksi)
├── routes/                  ← ASOSIY: har bir domen uchun API endpoint'lari
├── modules/                 ← Controller/Service/Repository patternidagi yangiroq modullar
├── bot/                     ← Telegram bot logikasi (grammY kutubxonasi)
├── lib/                     ← auth, logger kabi umumiy yordamchilar
├── shared/                  ← Xatolar, middleware, konstantalar, umumiy tiplar
└── infrastructure/          ← Redis, MinIO, Elasticsearch, Bull queue — hozircha ishlatilmayotgan/tayyorgarlik kodi
```

### 2.1 `routes/` — Asosiy API (domen bo'yicha)

Bu papkadagi fayllar **haqiqiy ishlaydigan, test qilingan** endpoint'lar. Har bir fayl bitta biznes-domenga mas'ul:

| Fayl                                                                               | Nima uchun javobgar                                                                     |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `admin-users.ts`                                                                   | Admin foydalanuvchilari ro'yxati, bloklash, tafsilotlar                                 |
| `health.ts`                                                                        | Server salomatligi tekshiruvi (`/health`, `/health/ready`, `/health/live`)              |
| `catalog/movies.ts`, `catalog/series.ts`, `catalog/genres.ts`, `catalog/actors.ts` | Kino/serial/janr/aktyorlarni CRUD qilish                                                |
| `subscriptions.ts`                                                                 | Obuna tariflari (`/subscriptions/plans`) va foydalanuvchi obunalari                     |
| `telegram.ts`                                                                      | Bot konfiguratsiyasi (token, kerakli kanal), botni start/stop qilish, kanallar ro'yxati |
| `index.ts`                                                                         | Yuqoridagi barcha route'larni bitta Express router'ga yig'adi                           |

**Eslatma:** Quyidagi funksiyalar hozircha `modules/` papkasida tayyorlanmoqda yoki kelajakda qo'shiladi: `auth`, `billing`, `payme`, `video-codes`, `analytics`, `notifications`.

### 2.2 `modules/` — Yangi arxitektura patterni

Bu papka har bir domen uchun `controller → service → repository → types` qatlamlariga bo'lingan, tozaroq patternni namoyish etadi. **Hozircha aksariyat modullar tayyorlanmoqda:**

Mavjud modullar:
- `advertising/` — reklama kampaniyalari
- `analytics/` — statistika va analitika
- `audit/` — admin harakatlari jurnali
- `billing/` — to'lovlar va billing
- `catalog/` — kontent katalogi (kino/serial)
- `device/` — foydalanuvchi qurilmalari
- `feature-flag/` — funksiyalarni yoqish/o'chirish
- `health/` — server salomatligi
- `identity/` — admin autentifikatsiyasi
- `integration/` — tashqi integratsiyalar (Payme, Click, Uzum)
- `notification/` — bildirishnomalar
- `rbac/` — role-based access control
- `search/` — qidiruv
- `subscription/` — obuna tizimi
- `telegram/` — Telegram bot integratsiyasi
- `user/` — foydalanuvchi boshqaruvi
- `video-content/` — video kontent
- `viewing/` — tomosha tarixi va progress

> **Xulosa:** Hozircha `routes/` papkasidagi fayllar asosiy ishlaydigan versiya. `modules/` papkasidagi modullar kelajakda `routes/`dagi kodlarni shu patternga ko'chirish uchun tayyorlanmoqda.

### 2.3 `bot/` — Telegram bot (foydalanuvchilar uchun)

```
bot/
├── index.ts                  ← Botni yaratadi, sessiya boshqaruvi, handler'larni ro'yxatdan o'tkazadi
└── handlers/
    ├── start.ts               ← /start buyrug'i, asosiy menyu, profil, obuna sotib olish, tilni tanlash
    ├── catalog.ts              ← Kino/serial katalogini ko'rish, qidiruv, VIDEO KOD orqali kino yuborish
    ├── subscription.ts         ← Obuna holatini tekshirish yordamchisi (checkUserSubscription)
    └── storage.ts              ← Telegram kanalini fayl saqlash joyi sifatida ishlatish yordamchilari
```

**Muhim arxitektura qarori — "Telegram videoni saqlash joyi sifatida":** Kinolar alohida video-hosting serverida saqlanmaydi. Ular Telegram kanaliga yuborilib, qaytgan `file_id` bazada saqlanadi. Foydalanuvchiga kino yuborilganda, shu `file_id` orqali Telegram serverlaridan to'g'ridan-to'g'ri yuboriladi. Bu server xarajatlarini keskin kamaytiradi.

### 2.4 `lib/`, `shared/`, `infrastructure/`

- `lib/auth.ts` — admin panel uchun `requireAuth` middleware (Bearer token tekshiradi)
- `lib/logger.ts` — markazlashgan logger (`pino`); route'larda **hech qachon `console.log` ishlatilmaydi**, faqat `req.log` yoki `logger`
- `shared/` — xato klasslari (`AppError`), umumiy middleware (404, xato ushlagich), konstantalar (rol, tarif, HTTP kod)
- `infrastructure/` — Redis, MinIO, Elasticsearch, Bull queue uchun tayyorgarlik kodi. **Hozircha loyiha bularsiz ishlaydi** — kelajakda keshlash, fayl saqlash yoki navbat kerak bo'lganda ishlatiladi.

---

## 3. `artifacts/dashboard` — Admin panel (React + Vite)

```
dashboard/src/
├── pages/                    ← Har bir sahifa — bitta admin funksiyasi
├── components/
│   ├── app-sidebar.tsx        ← Chap tomondagi navigatsiya menyusi (barcha bo'limlar shu yerda ro'yxatlangan)
│   ├── layout.tsx              ← Umumiy sahifa qobig'i (sidebar + header)
│   └── ui/                     ← shadcn/ui komponentlari (Button, Card, Input va h.k.)
└── App.tsx                    ← Marshrutlash (routing), wouter kutubxonasi orqali
```

### Sahifalar xaritasi (sidebar guruhlari bo'yicha)

| Guruh               | Sahifa                                                   | Vazifasi                                                                    |
| ------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------- |
| **Overview**        | `dashboard.tsx`                                          | Bosh sahifa — umumiy ko'rsatkichlar                                         |
|                     | `analytics/index.tsx`                                    | To'liq statistika: daromad, obunalar, video kodlar, foydalanuvchi manbalari |
| **Content Library** | `movies/list.tsx`, `movies/new.tsx`, `movies/detail.tsx` | Kinolarni ko'rish/qo'shish/tahrirlash                                       |
|                     | `series/list.tsx`, `series/new.tsx`, `series/detail.tsx` | Seriallar (fasl + qism) boshqaruvi                                          |
|                     | `genres/list.tsx`                                        | Janrlar                                                                     |
|                     | `actors/list.tsx`                                        | Aktyorlar                                                                   |
| **Audience**        | `users/list.tsx`, `users/detail.tsx`                     | Foydalanuvchilar ro'yxati, bloklash, tafsilot                               |
|                     | `subscriptions/list.tsx`                                 | Faol/tugagan obunalar ro'yxati                                              |
|                     | `subscriptions/plans.tsx`                                | Obuna tariflarini yaratish/tahrirlash (narx, muddat)                        |
|                     | `payments/list.tsx`                                      | To'lovlar tarixi (Payme orqali)                                             |
| **Engagement**      | `notifications/list.tsx`                                 | Bildirishnoma shablonlari va ommaviy xabar yuborish                         |
|                     | `telegram/config.tsx`                                    | Bot tokeni, kerakli kanal, botni yoqish/o'chirish                           |
|                     | `telegram/video-codes.tsx`                               | Video kodlarni yuklash, import qilish, faollashtirish                       |
| **System**          | `system/health.tsx`                                      | Server holati monitoringi                                                   |
|                     | `system/feature-flags.tsx`                               | Funksiyalarni yoqish/o'chirish                                              |
|                     | `system/audit-logs.tsx`                                  | Admin harakatlari jurnali                                                   |
| —                   | `settings/index.tsx`                                     | Umumiy sozlamalar                                                           |
| —                   | `login.tsx`                                              | Admin kirish sahifasi                                                       |

---

## 4. `lib/` — Umumiy kutubxonalar

| Papka              | Vazifasi                                                                                                                                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `api-spec`         | `openapi.yaml` — **barcha API'ning yagona haqiqat manbai**. Yangi endpoint qo'shishdan oldin shu yerga yoziladi                                                                                                          |
| `api-client-react` | Orval orqali generatsiya qilingan React Query hook'lari (`useGetXxx`, `usePostXxx`) — dashboard shularni ishlatadi                                                                                                       |
| `api-zod`          | Orval orqali generatsiya qilingan Zod sxemalari — backend so'rov/javoblarni shu bilan tekshiradi                                                                                                                         |
| `db`               | Drizzle ORM sxemalari (`schema/*.ts`) va DB ulanish nuqtasi. Har bir fayl bitta domenga mas'ul: `identity` (admin), `users`, `catalog` (kino/serial), `subscriptions`, `billing`, `telegram`, `notifications`, `viewing` |

---

## 5. Ma'lumotlar bazasi jadvallari (qisqacha xarita)

| Sxema fayli        | Jadvallar                                                                                                                     | Nima uchun                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `identity.ts`      | `admin_users`, `admin_sessions`                                                                                               | Admin panelga kirish uchun akkauntlar va sessiyalar                          |
| `users.ts`         | `users`                                                                                                                       | Telegram orqali botdan foydalanuvchilar (referral, acquisition source bilan) |
| `catalog.ts`       | `genres`, `actors`, `movies`, `movie_genres`, `movie_actors`, `series`, `series_genres`, `seasons`, `episodes`, `video_codes` | Butun kontent katalogi + video kod tizimi                                    |
| `subscriptions.ts` | `subscription_plans`, `subscriptions`                                                                                         | Tariflar va foydalanuvchi obunalari                                          |
| `billing.ts`       | `payments`, `payme_transactions`                                                                                              | To'lovlar va Payme tranzaksiyalari                                           |
| `telegram.ts`      | `telegram_config`, `telegram_channels`, `telegram_messages`                                                                   | Bot sozlamalari va kanal/xabar bog'lanishi                                   |
| `notifications.ts` | `notification_templates`, `broadcast_jobs`                                                                                    | Bildirishnoma shablonlari va yuborish vazifalari                             |
| `viewing.ts`       | `watch_sessions`, `watch_progress`, `ratings`, `favorites`                                                                    | Tomosha tarixi, progress, reyting, sevimlilar                                |

**Soft delete qoidasi:** Barcha katalog obyektlari (`movies`, `series` va h.k.) o'chirilganda haqiqatan o'chirilmaydi — `deletedAt` ustuniga vaqt belgisi qo'yiladi. So'rovlarda doim `deletedAt IS NULL` filtri bo'lishi kerak.

---

## 6. Ishga tushirish va rivojlantirish buyruqlari

```bash
pnpm --filter @workspace/api-server run dev      # Backend + bot (8080-port, /api orqali)
pnpm --filter @workspace/dashboard run dev       # Admin panel (23183-port, / orqali)
pnpm run typecheck                                # Butun loyiha bo'yicha tip tekshiruvi
pnpm run build                                    # Tip tekshiruv + build
pnpm --filter @workspace/api-spec run codegen     # OpenAPI'dan hook/sxema qayta generatsiya
pnpm --filter @workspace/db run push              # DB sxema o'zgarishlarini bazaga yuborish (faqat dev)
```

Har bir route faylida o'zgarish bo'lsa, **API server qayta ishga tushirilishi kerak** (build-on-start tarzida ishlaydi). Har safar OpenAPI spec o'zgarganda — `codegen` ishga tushiriladi, so'ng dashboard uchun typecheck qilinadi.

---

## 7. Kelajakda ishlatilishi mumkin bo'lgan, hozircha bo'sh infratuzilma

- **Redis** (`infrastructure/cache/redis.ts`) — kesh uchun tayyorgarlik
- **MinIO** (`infrastructure/storage/minio.ts`) — S3-uyg'un fayl saqlash uchun tayyorgarlik (hozircha Telegram kanal ishlatiladi)
- **Elasticsearch** (`infrastructure/search/elasticsearch.ts`) — kengaytirilgan qidiruv uchun tayyorgarlik
- **Bull queue** (`infrastructure/queue/bull.ts`) — fon vazifalari (masalan, ommaviy xabar yuborish) uchun tayyorgarlik
- **Advertising, Viewing modullari** (`modules/advertising`, `modules/viewing`) — hozircha "stub" (skelet) holatida, to'liq ishlamaydi
