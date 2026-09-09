# StreamOps — To'liq imkoniyatlar (funksiyalar) ro'yxati

> Bu hujjat loyiha **hozirgi holatda** nima qila olishini to'liq sanab o'tadi — admin panel tomonidan ham, Telegram bot tomonidan ham. Har bir funksiya qaysi faylda joylashganini bilish uchun `docs/ARXITEKTURA.md`ga qarang.

---

## 1. Admin panel imkoniyatlari

### 1.1 Kirish va xavfsizlik
- Email + parol orqali admin sifatida tizimga kirish
- Sessiya 7 kun amal qiladi (Bearer token, `admin_sessions` jadvalida saqlanadi)
- Chiqish (logout), joriy sessiyani tekshirish

### 1.2 Kontent boshqaruvi (Content Library)
- **Kinolar:** qo'shish, tahrirlash, ro'yxatini ko'rish, nashr qilish/yashirish, poster va tavsif kiritish, janr/aktyor biriktirish
- **Seriallar:** serial yaratish, fasllar (seasons) va qismlar (episodes) qo'shish, ierarxik boshqarish
- **Janrlar:** janr yaratish/tahrirlash (masalan, jangari, drama, komediya)
- **Aktyorlar:** aktyor kartochkalarini yaratish va kino/seriallarga biriktirish
- Barcha kontent uchun **soft delete** — o'chirish arxivga o'tkazadi, butunlay yo'qolmaydi

### 1.3 Foydalanuvchilar va auditoriya
- Botdan foydalanuvchilar ro'yxatini ko'rish va qidirish
- Foydalanuvchini bloklash/blokdan chiqarish (sababi bilan)
- Foydalanuvchi tafsilotlari: profil, til, obuna holati, referral kodi
- **Foydalanuvchi qurilmalari** (device) ro'yxati, ro'yxatdan o'tkazish, bloklash

### 1.4 Obuna va to'lov tizimi
- Obuna **tariflarini** yaratish/tahrirlash (nomi, narxi UZS'da, muddati kunlarda)
- Faol/tugagan obunalar ro'yxatini kuzatish
- Obunani bekor qilish
- **Payme** to'lov tizimi orqali to'lov qabul qilish:
  - Foydalanuvchi tarif tanlaydi → tizim to'lov havolasi (checkout URL) yaratadi
  - Payme webhook orqali to'lov tasdiqlangach, obuna **avtomatik faollashadi**
- To'lovlar tarixini (`billing/payments`) ko'rish
- Click va Uzum to'lov tizimlari uchun webhook joyi tayyor (hozircha faqat qabul qilish nuqtasi, to'liq integratsiya yo'q)

### 1.5 Telegram bot boshqaruvi
- Bot tokenini kiritish/o'zgartirish
- Botni **admin paneldan yoqish/o'chirish** (kodni qayta yozmasdan)
- "Majburiy obuna kanali" sozlash — foydalanuvchi kinoni ko'rishdan oldin shu kanalga obuna bo'lishi shart qilib qo'yiladi
- Bot ulangan Telegram kanallar ro'yxatini ko'rish/qo'shish

### 1.6 Video kod tizimi (asosiy kontent yetkazish mexanizmi)
- Botga video yuborib, uning Telegram `file_id`sini olish
- **Yuklash:** admin panel orqali video faylni to'g'ridan-to'g'ri yuklash (50 MB gacha, multipart)
- **Import:** allaqachon Telegram kanalida bor bo'lgan videoning `file_id`sini kiritib, kod yaratish (fayl hajmi cheklovisiz)
- Har bir video uchun **tasodifiy, taxmin qilib bo'lmaydigan 4 belgili kod** avtomatik generatsiya qilinadi (masalan, `X7KP`) — ketma-ket raqamlar emas, xavfsizlik uchun
- Kod holatini boshqarish: kutilmoqda (pending) → faol (active) → nofaol (inactive)
- Kodni o'chirish
- Har bir kod bo'yicha **ko'rishlar sonini** kuzatish

### 1.7 Bildirishnomalar (Notifications)
- Bildirishnoma **shablonlarini** yaratish (matn, til)
- Barcha foydalanuvchilarga yoki tanlangan guruhga **ommaviy xabar yuborish** (broadcast)

### 1.8 Analitika (Analytics)
Dashboard'ning "Analytics" sahifasida quyidagilar real vaqtda ko'rsatiladi:
- Jami va faol foydalanuvchilar soni, bugun qo'shilganlar
- Faol obunalar soni
- Oylik va jami daromad (UZS formatida)
- Video kodlar: jami/faol kodlar soni, jami ko'rishlar soni
- Filmlar/seriallar/qismlar umumiy soni
- Jami tomosha sessiyalari
- **Daromad dinamikasi grafigi** (kunlik, 7/30/90 kun yoki 1 yil davri tanlanadi)
- **Obunalar o'sish grafigi** (yangi obunalar soni vaqt bo'yicha)
- **Top video kodlar** — eng ko'p ko'rilgan kodlar ro'yxati, holati bilan
- **Eng ko'p ko'rilgan kontent** — top kinolar va seriallar reytingi bilan
- **Foydalanuvchi manbalari (acquisition)** — foydalanuvchilar botga qayerdan kelgani (masalan, Instagram vs organik) statistikasi
- **Instagram havola generatori** — Instagram bio/post uchun kuzatiladigan havola yaratish, xohlasa ma'lum bir kino kodiga bog'lash

### 1.9 Tizim (System) boshqaruvi
- **Health Monitor** — server holatini kuzatish (`/health`, `/health/ready`, `/health/live`)
- **Feature Flags** — funksiyalarni butun tizim uchun yoqish/o'chirish, bosqichma-bosqich chiqarish uchun
- **Audit Logs** — barcha admin harakatlari (kim, qachon, nima qildi) jurnali
- Umumiy sozlamalar sahifasi

### 1.10 Qidiruv
- Katalog bo'yicha umumiy qidiruv endpoint'i (`/search`)

---

## 2. Telegram bot imkoniyatlari (foydalanuvchilar uchun, bot: `FavoriteKinoBot`)

### 2.1 Ro'yxatdan o'tish va sozlamalar
- `/start` bosilganda avtomatik ro'yxatdan o'tish (Telegram ma'lumotlaridan: ism, username, til)
- Tilni tanlash — **O'zbek** yoki **Rus** (`/lang` buyrug'i)
- Doimiy pastki "Menyu" tugmasi orqali istalgan vaqt asosiy menyuga qaytish

### 2.2 Asosiy menyu
- 🎬 Kino kodi kiritish
- 🎥 Filmlar katalogi (sahifalab ko'rish, oldinga/orqaga)
- 📺 Seriallar katalogi
- 🔍 Qidiruv (nomi bo'yicha kino/serial qidirish)
- 👤 Profil (ism, username, til, obuna holati)
- 💳 Obuna holati va sotib olish

### 2.3 Kino ko'rish — Video kod tizimi
- Foydalanuvchi 4-6 belgili kodni yozadi (masalan, `X7KP`)
- **Xavfsizlik zanjiri** (har bir bosqich ketma-ket tekshiriladi):
  1. Foydalanuvchida **faol to'lovli obuna** bormi — yo'q bo'lsa, kod tekshirilmasdan "obuna sotib olish" taklif qilinadi
  2. Kod bazada mavjud va **faol (active)** holatdami
  3. Agar admin "majburiy kanal" sozlagan bo'lsa — foydalanuvchi o'sha kanalga obuna bo'lganmi
  4. Barcha shartlar bajarilsa — video Telegram orqali to'g'ridan-to'g'ri yuboriladi (`protect_content` yoqilgan — forward/saqlashdan himoyalangan)
- Har bir ko'rishda kod bo'yicha `viewsCount` avtomatik oshiriladi
- Ko'rilgan videoni "✅ Ko'rib bo'ldim — o'chirish" tugmasi bilan suhbatdan tozalash mumkin

### 2.4 Instagram orqali kirish (deeplink)
- `t.me/FavoriteKinoBot?start=ig` — Instagram'dan kelgan foydalanuvchi avtomatik "instagram" manbai sifatida qayd etiladi
- `t.me/FavoriteKinoBot?start=ig_<KOD>` — yuqoridagidan tashqari, foydalanuvchi botga kirishi bilanoq ko'rsatilgan kino kodi (obuna/kanal tekshiruvidan o'tgach) **avtomatik yuboriladi**
- Bu statistika admin panelning Analytics sahifasida "Foydalanuvchi manbalari" bo'limida ko'rinadi

### 2.5 Obuna sotib olish (to'lov)
- Mavjud tariflarni ko'rish (narx UZS'da, muddat kunlarda)
- Tarif tanlab, **Payme** orqali to'lov havolasini olish
- To'lov muvaffaqiyatli bo'lgach, obuna avtomatik faollashadi va botdan darhol foydalanish mumkin bo'ladi

### 2.6 Qidiruv
- Bot ichida kino/serial nomi bo'yicha qidiruv, natijalar ro'yxatidan tanlab ko'rish

### 2.7 Admin uchun maxsus funksiya (bot orqali)
- Admin Telegram ID'lari (`ADMIN_TELEGRAM_IDS`) ro'yxatidagi foydalanuvchilar botga video yuborsa, oddiy foydalanuvchidan farqli o'laroq — video haqida `file_id`, hajmi va davomiyligi ma'lumotlari qaytariladi (buni keyin dashboard'da "File ID orqali import" qilish uchun ishlatish mumkin)

---

## 3. Hozircha tayyorgarlik bosqichida turgan (to'liq ishlamaydigan) qismlar

Halollik uchun aniq belgilab qo'yamiz — quyidagilar kodda mavjud, lekin hali **to'liq ishga tushirilmagan**:

| Funksiya | Holati |
|---|---|
| Reklama kampaniyalari (`advertising`) | Faqat skelet — "coming soon" javob qaytaradi |
| Tomosha tarixi/progress/reyting API (`viewing`) | Faqat skelet endpoint'lar, haqiqiy logika yozilmagan |
| Click, Uzum to'lov tizimlari | Faqat webhook qabul qilish nuqtasi bor, integratsiya yo'q (faqat Payme to'liq ishlaydi) |
| Telegram Bot API Local Server (katta fayllar uchun) | `TELEGRAM_API_ID`/`TELEGRAM_API_HASH` kalitlari yo'qligi sababli sozlanmagan |
| Redis kesh, MinIO fayl saqlash, Elasticsearch qidiruv, Bull navbat | Kod tayyor, lekin ishlatilmayapti — hozirgi hajmda kerak emas |

---

## 4. Xavfsizlik bo'yicha qabul qilingan qarorlar

- Video kodlar **tasodifiy** generatsiya qilinadi (ketma-ket emas) — kodni "taxmin qilib" bepul tomosha qilishning oldi olingan
- Kino ko'rish uchun **avval faol obuna talab qilinadi** — kod to'g'ri bo'lsa ham, obunasiz hech narsa ko'rsatilmaydi
- Yuborilgan videolar `protect_content` bilan himoyalangan — forward/saqlash cheklangan
- Barcha kontent o'chirilganda soft-delete qilinadi — tasodifiy yo'qotishning oldi olinadi
- Admin sessiyalari 7 kundan keyin avtomatik tugaydi
