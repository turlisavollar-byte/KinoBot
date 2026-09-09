import { type Bot, InlineKeyboard } from "grammy";
import { eq, and, sql, ilike } from "drizzle-orm";
import {
  db,
  moviesTable,
  seriesTable,
  seasonsTable,
  episodesTable,
  usersTable,
  subscriptionsTable,
  videoCodesTable,
  telegramConfigTable,
} from "@workspace/db";
import type { BotContext } from "@/bot/index";
import { checkUserSubscription } from "@/bot/handlers/subscription";

const PAGE_SIZE = 5;

/**
 * Consume one daily code allowance. A null limit means unlimited.
 * The counter is reset lazily on the first request after the UTC day changes.
 */
async function consumeCodeAllowance(telegramId: string): Promise<boolean> {
  const [user] = await db
    .select({
      id: usersTable.id,
      dailyCodeLimit: usersTable.dailyCodeLimit,
      dailyCodeUsed: usersTable.dailyCodeUsed,
      dailyCodeResetAt: usersTable.dailyCodeResetAt,
      weeklyCodeLimit: usersTable.weeklyCodeLimit,
      weeklyCodeUsed: usersTable.weeklyCodeUsed,
      weeklyCodeResetAt: usersTable.weeklyCodeResetAt,
      monthlyCodeLimit: usersTable.monthlyCodeLimit,
      monthlyCodeUsed: usersTable.monthlyCodeUsed,
      monthlyCodeResetAt: usersTable.monthlyCodeResetAt,
    })
    .from(usersTable)
    .where(eq(usersTable.telegramId, telegramId))
    .limit(1);

  if (!user) return false;
  const [config] = await db
    .select({
      defaultDailyCodeLimit: telegramConfigTable.defaultDailyCodeLimit,
      defaultWeeklyCodeLimit: telegramConfigTable.defaultWeeklyCodeLimit,
      defaultMonthlyCodeLimit: telegramConfigTable.defaultMonthlyCodeLimit,
    })
    .from(telegramConfigTable)
    .limit(1);

  const dailyLimit =
    user.dailyCodeLimit ?? config?.defaultDailyCodeLimit ?? null;
  const weeklyLimit =
    user.weeklyCodeLimit ?? config?.defaultWeeklyCodeLimit ?? null;
  const monthlyLimit =
    user.monthlyCodeLimit ?? config?.defaultMonthlyCodeLimit ?? null;

  const now = new Date();
  const dailyReset = new Date(user.dailyCodeResetAt);
  const weeklyReset = new Date(user.weeklyCodeResetAt);
  const monthlyReset = new Date(user.monthlyCodeResetAt);
  const isDifferentUtcDay =
    dailyReset.toISOString().slice(0, 10) !== now.toISOString().slice(0, 10);
  const isDifferentUtcWeek =
    now.getTime() - weeklyReset.getTime() >= 7 * 24 * 60 * 60 * 1000;
  const isDifferentUtcMonth =
    monthlyReset.getUTCFullYear() !== now.getUTCFullYear() ||
    monthlyReset.getUTCMonth() !== now.getUTCMonth();
  const resetData = {
    ...(isDifferentUtcDay ? { dailyCodeUsed: 0, dailyCodeResetAt: now } : {}),
    ...(isDifferentUtcWeek
      ? { weeklyCodeUsed: 0, weeklyCodeResetAt: now }
      : {}),
    ...(isDifferentUtcMonth
      ? { monthlyCodeUsed: 0, monthlyCodeResetAt: now }
      : {}),
  };
  if (Object.keys(resetData).length > 0) {
    await db
      .update(usersTable)
      .set(resetData)
      .where(eq(usersTable.id, user.id));
  }

  const [consumed] = await db
    .update(usersTable)
    .set({
      dailyCodeUsed: sql`${usersTable.dailyCodeUsed} + 1`,
      weeklyCodeUsed: sql`${usersTable.weeklyCodeUsed} + 1`,
      monthlyCodeUsed: sql`${usersTable.monthlyCodeUsed} + 1`,
    })
    .where(
      and(
        eq(usersTable.id, user.id),
        sql`(${dailyLimit === null ? sql`true` : sql`${usersTable.dailyCodeUsed} < ${dailyLimit}`})
          AND (${weeklyLimit === null ? sql`true` : sql`${usersTable.weeklyCodeUsed} < ${weeklyLimit}`})
          AND (${monthlyLimit === null ? sql`true` : sql`${usersTable.monthlyCodeUsed} < ${monthlyLimit}`})`,
      ),
    )
    .returning({ id: usersTable.id });

  return Boolean(consumed);
}

// ─── Shared: deliver a video code (used by both bot text handler and /start deeplinks) ──
export async function deliverVideoCodeByDeeplink(
  bot: Bot<BotContext>,
  ctx: BotContext,
  rawCode: string,
) {
  const isUz = ctx.session.language === "uz";
  const code = rawCode.trim().toUpperCase();

  if (!/^[A-Z0-9]{4,6}$/.test(code)) return;

  const telegramId = String(ctx.from!.id);
  const hasSub = await checkUserSubscription(telegramId);
  if (!hasSub) {
    await ctx.reply(
      isUz
        ? `🔒 <b>Faol obuna talab qilinadi</b>\n\nKino kodlaridan foydalanish uchun avval obuna sotib olishingiz kerak.`
        : `🔒 <b>Требуется активная подписка</b>\n\nЧтобы использовать коды фильмов, сначала оформите подписку.`,
      {
        parse_mode: "HTML",
        reply_markup: new InlineKeyboard()
          .text(
            isUz ? "💳 Obuna sotib olish" : "💳 Купить подписку",
            "subscription:status",
          )
          .row()
          .text(isUz ? "🔙 Menyu" : "🔙 Меню", "menu:main"),
      },
    );
    return;
  }

  const [entry] = await db
    .select()
    .from(videoCodesTable)
    .where(
      and(eq(videoCodesTable.code, code), eq(videoCodesTable.status, "active")),
    )
    .limit(1);

  if (!entry?.telegramFileId) {
    await ctx.reply(
      isUz
        ? `❌ <b>${code}</b> kodi topilmadi yoki hali faol emas.`
        : `❌ Код <b>${code}</b> не найден или ещё не активен.`,
      { parse_mode: "HTML" },
    );
    return;
  }

  const [tgConfig] = await db.select().from(telegramConfigTable).limit(1);
  const requiredChannelIds = (tgConfig?.requiredChannelId ?? "")
    .split(",")
    .map((channelId) => channelId.trim())
    .filter(Boolean);

  if (requiredChannelIds.length > 0) {
    try {
      for (const requiredChanId of requiredChannelIds) {
        const member = await bot.api.getChatMember(
          requiredChanId,
          ctx.from!.id,
        );
        const subscribed = [
          "creator",
          "administrator",
          "member",
          "restricted",
        ].includes(member.status);
        if (subscribed) continue;
        const chanLink = requiredChanId.startsWith("@")
          ? `https://t.me/${requiredChanId.slice(1)}`
          : `https://t.me/c/${requiredChanId.replace("-100", "")}`;

        await ctx.reply(
          isUz
            ? `🔔 <b>Kanalga obuna bo'ling!</b>\n\nKinoni ko'rish uchun avval kanalimizga obuna bo'lishingiz kerak.\n\nObuna bo'lgach, <b>"✅ Obuna bo'ldim"</b> tugmasini bosing.`
            : `🔔 <b>Подпишитесь на канал!</b>\n\nДля просмотра фильма сначала подпишитесь на наш канал.\n\nПосле подписки нажмите кнопку <b>"✅ Я подписался"</b>.`,
          {
            parse_mode: "HTML",
            reply_markup: new InlineKeyboard()
              .url(isUz ? "📢 Kanalga o'tish" : "📢 Перейти в канал", chanLink)
              .row()
              .text(
                isUz
                  ? "✅ Obuna bo'ldim — tekshirish"
                  : "✅ Я подписался — проверить",
                `vidcode:recheck:${code}`,
              ),
          },
        );
        return;
      }
    } catch {
      await ctx.reply(
        isUz
          ? "🔔 Majburiy kanal obunasini tekshirib bo'lmadi. Keyinroq qayta urinib ko'ring."
          : "🔔 Не удалось проверить подписку на обязательный канал. Попробуйте позже.",
      );
      return;
    }
  }

  const allowed = await consumeCodeAllowance(telegramId);
  if (!allowed) {
    await ctx.reply(
      isUz
        ? `⏳ Kino kodi limitingiz tugadi. Limit davri yangilangach yana foydalanishingiz mumkin.`
        : `⏳ Лимит кодов закончился. Вы сможете снова использовать коды после обновления лимита.`,
      { parse_mode: "HTML" },
    );
    return;
  }

  const msg = await ctx.replyWithVideo(entry.telegramFileId, {
    caption:
      `🎬 <b>${entry.title}</b>\n\n` +
      `📋 ${isUz ? "Kod" : "Код"}: <code>${entry.code}</code>\n\n` +
      `<i>${isUz ? "Ko'rib bo'lgach quyidagi tugmani bosing" : "После просмотра нажмите кнопку ниже"}</i>`,
    parse_mode: "HTML",
    protect_content: true,
    reply_markup: new InlineKeyboard()
      .text(
        isUz ? "✅ Ko'rib bo'ldim — o'chirish" : "✅ Просмотрено — удалить",
        `vidcode:del:${entry.code}`,
      )
      .row()
      .text(isUz ? "🎬 Boshqa kod" : "🎬 Другой код", "videocodes:enter")
      .text(isUz ? "📱 Menyu" : "📱 Меню", "menu:main"),
  });

  await db
    .update(videoCodesTable)
    .set({ viewsCount: sql`${videoCodesTable.viewsCount} + 1` })
    .where(eq(videoCodesTable.id, entry.id));

  return msg;
}

export function registerCatalogHandler(bot: Bot<BotContext>) {
  // ─── MOVIES LIST ────────────────────────────────────────────────────────────
  bot.callbackQuery(/^catalog:movies(?::(\d+))?$/, async (ctx) => {
    const isUz = ctx.session.language === "uz";
    const page = parseInt(ctx.match[1] ?? "0");
    ctx.session.page = page;

    const offset = page * PAGE_SIZE;
    const movies = await db
      .select({
        id: moviesTable.id,
        title: moviesTable.title,
        releaseYear: moviesTable.releaseYear,
        duration: moviesTable.duration,
      })
      .from(moviesTable)
      .where(
        and(
          eq(moviesTable.isPublished, true),
          sql`${moviesTable.deletedAt} IS NULL`,
        ),
      )
      .orderBy(moviesTable.createdAt)
      .limit(PAGE_SIZE + 1)
      .offset(offset);

    const hasMore = movies.length > PAGE_SIZE;
    const items = movies.slice(0, PAGE_SIZE);

    if (items.length === 0) {
      await ctx.answerCallbackQuery();
      await ctx.editMessageText(
        isUz ? "📭 Kinolar hali qo'shilmagan." : "📭 Фильмов ещё нет.",
      );
      return;
    }

    const keyboard = new InlineKeyboard();
    for (const movie of items) {
      const year = movie.releaseYear ? ` (${movie.releaseYear})` : "";
      keyboard.text(`🎬 ${movie.title}${year}`, `movie:${movie.id}`).row();
    }

    if (page > 0) keyboard.text("⬅️", `catalog:movies:${page - 1}`);
    if (hasMore) keyboard.text("➡️", `catalog:movies:${page + 1}`);
    keyboard.row().text(isUz ? "🔙 Menyu" : "🔙 Меню", "menu:main");

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      isUz
        ? `🎬 <b>Kinolar</b> (sahifa ${page + 1})`
        : `🎬 <b>Фильмы</b> (стр. ${page + 1})`,
      { parse_mode: "HTML", reply_markup: keyboard },
    );
  });

  // ─── MOVIE DETAIL ────────────────────────────────────────────────────────────
  bot.callbackQuery(/^movie:(.+)$/, async (ctx) => {
    const movieId = ctx.match[1];
    const isUz = ctx.session.language === "uz";

    const [movie] = await db
      .select()
      .from(moviesTable)
      .where(
        and(eq(moviesTable.id, movieId), eq(moviesTable.isPublished, true)),
      )
      .limit(1);

    if (!movie) {
      await ctx.answerCallbackQuery(
        isUz ? "Kino topilmadi" : "Фильм не найден",
      );
      return;
    }

    const duration = movie.duration
      ? `⏱ ${Math.floor(movie.duration / 60)}:${String(movie.duration % 60).padStart(2, "0")}`
      : "";
    const year = movie.releaseYear ? `📅 ${movie.releaseYear}` : "";
    const rating =
      movie.ratingAvg && Number(movie.ratingAvg) > 0
        ? `⭐ ${Number(movie.ratingAvg).toFixed(1)}`
        : "";

    const desc = movie.description
      ? `\n\n${movie.description.slice(0, 200)}${movie.description.length > 200 ? "..." : ""}`
      : "";

    const info = [year, duration, rating].filter(Boolean).join(" • ");
    const text = `🎬 <b>${movie.title}</b>${movie.originalTitle ? ` / ${movie.originalTitle}` : ""}\n${info}${desc}`;

    const keyboard = new InlineKeyboard()
      .text(
        isUz ? "▶️ Tomosha qilish" : "▶️ Смотреть",
        `watch:movie:${movie.id}`,
      )
      .row()
      .text(isUz ? "🔙 Kinolar" : "🔙 Фильмы", "catalog:movies");

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(text, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  });

  // ─── WATCH MOVIE ─────────────────────────────────────────────────────────────
  bot.callbackQuery(/^watch:movie:(.+)$/, async (ctx) => {
    const movieId = ctx.match[1];
    const isUz = ctx.session.language === "uz";
    const telegramId = String(ctx.from.id);

    // Check subscription
    const hasAccess = await checkUserSubscription(telegramId);
    if (!hasAccess) {
      const keyboard = new InlineKeyboard()
        .text(
          isUz ? "💳 Obuna olish" : "💳 Оформить подписку",
          "subscription:plans",
        )
        .row()
        .text(isUz ? "🔙 Orqaga" : "🔙 Назад", `movie:${movieId}`);

      await ctx.answerCallbackQuery();
      await ctx.editMessageText(
        isUz
          ? "🔒 Bu kino faqat obunachilarga mavjud.\n\nObuna olib, cheksiz kino va seriallardan bahramand bo'ling!"
          : "🔒 Этот фильм доступен только подписчикам.\n\nОформите подписку и наслаждайтесь неограниченным кино!",
        { parse_mode: "HTML", reply_markup: keyboard },
      );
      return;
    }

    const [movie] = await db
      .select()
      .from(moviesTable)
      .where(
        and(eq(moviesTable.id, movieId), eq(moviesTable.isPublished, true)),
      )
      .limit(1);

    if (!movie) {
      await ctx.answerCallbackQuery(
        isUz ? "Kino topilmadi" : "Фильм не найден",
      );
      return;
    }

    if (!movie.telegramFileId) {
      await ctx.answerCallbackQuery();
      await ctx.editMessageText(
        isUz
          ? "⚠️ Bu kino hali yuklenmagan. Tez orada qo'shiladi."
          : "⚠️ Этот фильм ещё не загружен. Скоро будет добавлен.",
        {
          reply_markup: new InlineKeyboard().text(
            isUz ? "🔙 Orqaga" : "🔙 Назад",
            `movie:${movieId}`,
          ),
        },
      );
      return;
    }

    await ctx.answerCallbackQuery(isUz ? "Yuborilmoqda..." : "Отправляем...");
    await ctx.replyWithVideo(movie.telegramFileId, {
      caption: `🎬 <b>${movie.title}</b>${movie.releaseYear ? ` (${movie.releaseYear})` : ""}`,
      parse_mode: "HTML",
    });

    // Increment view count
    await db
      .update(moviesTable)
      .set({ viewsCount: sql`${moviesTable.viewsCount} + 1` })
      .where(eq(moviesTable.id, movieId));
  });

  // ─── SERIES LIST ─────────────────────────────────────────────────────────────
  bot.callbackQuery(/^catalog:series(?::(\d+))?$/, async (ctx) => {
    const isUz = ctx.session.language === "uz";
    const page = parseInt(ctx.match[1] ?? "0");
    const offset = page * PAGE_SIZE;

    const items = await db
      .select({
        id: seriesTable.id,
        title: seriesTable.title,
        releaseYear: seriesTable.releaseYear,
        seasonsCount: seriesTable.seasonsCount,
      })
      .from(seriesTable)
      .where(
        and(
          eq(seriesTable.isPublished, true),
          sql`${seriesTable.deletedAt} IS NULL`,
        ),
      )
      .orderBy(seriesTable.createdAt)
      .limit(PAGE_SIZE + 1)
      .offset(offset);

    const hasMore = items.length > PAGE_SIZE;
    const list = items.slice(0, PAGE_SIZE);

    if (list.length === 0) {
      await ctx.answerCallbackQuery();
      await ctx.editMessageText(
        isUz ? "📭 Seriallar hali qo'shilmagan." : "📭 Сериалов ещё нет.",
      );
      return;
    }

    const keyboard = new InlineKeyboard();
    for (const s of list) {
      const seasons =
        s.seasonsCount > 0
          ? ` (${s.seasonsCount} ${isUz ? "mavsum" : "сез."})`
          : "";
      keyboard.text(`📺 ${s.title}${seasons}`, `series:${s.id}`).row();
    }

    if (page > 0) keyboard.text("⬅️", `catalog:series:${page - 1}`);
    if (hasMore) keyboard.text("➡️", `catalog:series:${page + 1}`);
    keyboard.row().text(isUz ? "🔙 Menyu" : "🔙 Меню", "menu:main");

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      isUz ? `📺 <b>Seriallar</b>` : `📺 <b>Сериалы</b>`,
      { parse_mode: "HTML", reply_markup: keyboard },
    );
  });

  // ─── SERIES DETAIL (SEASONS) ─────────────────────────────────────────────────
  bot.callbackQuery(/^series:(.+)$/, async (ctx) => {
    const seriesId = ctx.match[1];
    const isUz = ctx.session.language === "uz";

    const [series] = await db
      .select()
      .from(seriesTable)
      .where(
        and(eq(seriesTable.id, seriesId), eq(seriesTable.isPublished, true)),
      )
      .limit(1);

    if (!series) {
      await ctx.answerCallbackQuery(
        isUz ? "Serial topilmadi" : "Сериал не найден",
      );
      return;
    }

    const seasons = await db
      .select()
      .from(seasonsTable)
      .where(
        and(
          eq(seasonsTable.seriesId, seriesId),
          sql`${seasonsTable.deletedAt} IS NULL`,
        ),
      )
      .orderBy(seasonsTable.seasonNumber);

    const keyboard = new InlineKeyboard();
    for (const season of seasons) {
      keyboard
        .text(
          isUz
            ? `📂 ${season.title ?? `${season.seasonNumber}-mavsum`}`
            : `📂 ${season.title ?? `Сезон ${season.seasonNumber}`}`,
          `season:${season.id}`,
        )
        .row();
    }
    keyboard.text(isUz ? "🔙 Seriallar" : "🔙 Сериалы", "catalog:series");

    const desc = series.description
      ? `\n\n${series.description.slice(0, 150)}...`
      : "";
    const text = `📺 <b>${series.title}</b>${desc}`;

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(text, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  });

  // ─── SEASON (EPISODES) ───────────────────────────────────────────────────────
  bot.callbackQuery(/^season:(.+)$/, async (ctx) => {
    const seasonId = ctx.match[1];
    const isUz = ctx.session.language === "uz";

    const [season] = await db
      .select()
      .from(seasonsTable)
      .where(eq(seasonsTable.id, seasonId))
      .limit(1);
    if (!season) {
      await ctx.answerCallbackQuery();
      return;
    }

    const episodes = await db
      .select()
      .from(episodesTable)
      .where(
        and(
          eq(episodesTable.seasonId, seasonId),
          eq(episodesTable.isPublished, true),
          sql`${episodesTable.deletedAt} IS NULL`,
        ),
      )
      .orderBy(episodesTable.episodeNumber);

    if (episodes.length === 0) {
      await ctx.answerCallbackQuery(
        isUz ? "Hali epizodlar yo'q" : "Эпизодов пока нет",
      );
      return;
    }

    const keyboard = new InlineKeyboard();
    for (const ep of episodes) {
      keyboard
        .text(`▶️ ${ep.episodeNumber}. ${ep.title}`, `episode:${ep.id}`)
        .row();
    }
    keyboard.text(isUz ? "🔙 Orqaga" : "🔙 Назад", `series:${season.seriesId}`);

    const seasonTitle =
      season.title ??
      (isUz ? `${season.seasonNumber}-mavsum` : `Сезон ${season.seasonNumber}`);
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      isUz ? `📂 <b>${seasonTitle}</b>` : `📂 <b>${seasonTitle}</b>`,
      { parse_mode: "HTML", reply_markup: keyboard },
    );
  });

  // ─── EPISODE WATCH ───────────────────────────────────────────────────────────
  bot.callbackQuery(/^episode:(.+)$/, async (ctx) => {
    const episodeId = ctx.match[1];
    const isUz = ctx.session.language === "uz";
    const telegramId = String(ctx.from.id);

    const hasAccess = await checkUserSubscription(telegramId);
    if (!hasAccess) {
      const keyboard = new InlineKeyboard().text(
        isUz ? "💳 Obuna olish" : "💳 Оформить подписку",
        "subscription:plans",
      );
      await ctx.answerCallbackQuery();
      await ctx.editMessageText(
        isUz
          ? "🔒 Bu epizod faqat obunachilarga mavjud."
          : "🔒 Этот эпизод доступен только подписчикам.",
        { reply_markup: keyboard },
      );
      return;
    }

    const [ep] = await db
      .select()
      .from(episodesTable)
      .where(
        and(
          eq(episodesTable.id, episodeId),
          eq(episodesTable.isPublished, true),
        ),
      )
      .limit(1);

    if (!ep) {
      await ctx.answerCallbackQuery();
      return;
    }

    if (!ep.telegramFileId) {
      await ctx.answerCallbackQuery(
        isUz ? "Hali yuklanmagan" : "Ещё не загружено",
      );
      return;
    }

    await ctx.answerCallbackQuery(isUz ? "Yuborilmoqda..." : "Отправляем...");
    await ctx.replyWithVideo(ep.telegramFileId, {
      caption: `▶️ <b>${ep.episodeNumber}. ${ep.title}</b>`,
      parse_mode: "HTML",
    });

    await db
      .update(episodesTable)
      .set({ viewsCount: sql`${episodesTable.viewsCount} + 1` })
      .where(eq(episodesTable.id, episodeId));
  });

  // ─── SEARCH ─────────────────────────────────────────────────────────────────
  bot.callbackQuery("search:start", async (ctx) => {
    const isUz = ctx.session.language === "uz";
    ctx.session.step = "search";

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      isUz ? "🔍 Qidiruv so'zini yozing:" : "🔍 Введите поисковый запрос:",
      {
        reply_markup: new InlineKeyboard().text(
          isUz ? "🚫 Bekor qilish" : "🚫 Отмена",
          "menu:main",
        ),
      },
    );
  });

  // ─── HELPER: check channel subscription ─────────────────────────────────
  async function checkChannelSub(
    bot: Bot<BotContext>,
    userId: number,
    channelId: string,
  ): Promise<boolean> {
    try {
      const channelIds = channelId
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      for (const requiredChannelId of channelIds) {
        const member = await bot.api.getChatMember(requiredChannelId, userId);
        if (
          !["creator", "administrator", "member", "restricted"].includes(
            member.status,
          )
        ) {
          return false;
        }
      }
      return channelIds.length > 0;
    } catch {
      return false;
    }
  }

  // ─── HELPER: send video code entry to user ────────────────────────────────
  async function sendVideoCode(
    ctx: BotContext,
    entry: typeof videoCodesTable.$inferSelect,
  ) {
    const isUz = ctx.session.language === "uz";
    const msg = await ctx.replyWithVideo(entry.telegramFileId!, {
      caption:
        `🎬 <b>${entry.title}</b>\n\n` +
        `📋 ${isUz ? "Kod" : "Код"}: <code>${entry.code}</code>\n\n` +
        `<i>${isUz ? "Ko'rib bo'lgach quyidagi tugmani bosing" : "После просмотра нажмите кнопку ниже"}</i>`,
      parse_mode: "HTML",
      protect_content: true,
      reply_markup: new InlineKeyboard()
        .text(
          isUz ? "✅ Ko'rib bo'ldim — o'chirish" : "✅ Просмотрено — удалить",
          `vidcode:del:${entry.code}`,
        )
        .row()
        .text(isUz ? "🎬 Boshqa kod" : "🎬 Другой код", "videocodes:enter")
        .text(isUz ? "📱 Menyu" : "📱 Меню", "menu:main"),
    });

    await db
      .update(videoCodesTable)
      .set({ viewsCount: sql`${videoCodesTable.viewsCount} + 1` })
      .where(eq(videoCodesTable.id, entry.id));

    return msg;
  }

  // ─── ENTER VIDEO CODE ────────────────────────────────────────────────────
  bot.callbackQuery("videocodes:enter", async (ctx) => {
    const isUz = ctx.session.language === "uz";
    ctx.session.step = "video_code";

    await ctx.answerCallbackQuery();

    const text = isUz
      ? `🎬 <b>Kino kodi</b>\n\n4 xonali kino kodini yuboring.\n\nMasalan: <code>0001</code>`
      : `🎬 <b>Код фильма</b>\n\nОтправьте 4-значный код фильма.\n\nНапример: <code>0001</code>`;
    const markup = new InlineKeyboard().text(
      isUz ? "🔙 Menyu" : "🔙 Меню",
      "menu:main",
    );

    const msg = ctx.callbackQuery.message;
    const hasMedia =
      msg &&
      ("photo" in msg ||
        "video" in msg ||
        "audio" in msg ||
        "document" in msg ||
        "sticker" in msg ||
        "animation" in msg);

    if (hasMedia) {
      // Can't editMessageText on a media message — send a fresh message instead
      await ctx.reply(text, { parse_mode: "HTML", reply_markup: markup });
    } else {
      await ctx.editMessageText(text, {
        parse_mode: "HTML",
        reply_markup: markup,
      });
    }
  });

  // ─── DELETE VIDEO MESSAGE ─────────────────────────────────────────────────
  bot.callbackQuery(/^vidcode:del:([A-Z0-9]{4,6})$/, async (ctx) => {
    await ctx.answerCallbackQuery(
      ctx.session.language === "uz" ? "O'chirildi ✓" : "Удалено ✓",
    );
    await ctx.deleteMessage().catch(() => {});
  });

  // ─── RE-CHECK SUBSCRIPTION THEN SEND VIDEO ───────────────────────────────
  bot.callbackQuery(/^vidcode:recheck:([A-Z0-9]{4,6})$/, async (ctx) => {
    const code = ctx.match[1];
    const isUz = ctx.session.language === "uz";

    const [tgConfig] = await db.select().from(telegramConfigTable).limit(1);
    const requiredChanId = tgConfig?.requiredChannelId;

    if (requiredChanId) {
      const subscribed = await checkChannelSub(
        bot,
        ctx.from.id,
        requiredChanId,
      );
      if (!subscribed) {
        await bot.api.answerCallbackQuery(ctx.callbackQuery.id, {
          text: isUz ? "Hali obuna bo'lmadingiz!" : "Вы ещё не подписались!",
          show_alert: true,
        });
        return;
      }
    }

    const [entry] = await db
      .select()
      .from(videoCodesTable)
      .where(
        and(
          eq(videoCodesTable.code, code),
          eq(videoCodesTable.status, "active"),
        ),
      )
      .limit(1);

    if (!entry?.telegramFileId) {
      await bot.api.answerCallbackQuery(ctx.callbackQuery.id, {
        text: isUz ? "Kod topilmadi" : "Код не найден",
        show_alert: true,
      });
      return;
    }

    await ctx.answerCallbackQuery();
    // Delete the "subscribe first" message
    await ctx.deleteMessage().catch(() => {});
    const allowed = await consumeCodeAllowance(String(ctx.from.id));
    if (!allowed) {
      await ctx.reply(
        isUz
          ? "⏳ Kino kodi limitingiz tugadi. Limit davri yangilangach yana foydalanishingiz mumkin."
          : "⏳ Лимит кодов закончился. Вы сможете снова использовать коды после обновления лимита.",
      );
      return;
    }
    await sendVideoCode(ctx, entry);
  });

  // Handle text input: video code step OR search step OR plain video code
  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text.trim().toUpperCase();
    const isUz = ctx.session.language === "uz";

    // ─── Video code lookup ──────────────────────────────────────────────────
    const isVideoCode = /^[A-Z0-9]{4,6}$/.test(text);
    if (isVideoCode && ctx.session.step !== "search") {
      ctx.session.step = undefined;

      // 1. Require an active paid subscription before any code is checked
      const telegramId = String(ctx.from.id);
      const hasSub = await checkUserSubscription(telegramId);
      if (!hasSub) {
        await ctx.reply(
          isUz
            ? `🔒 <b>Faol obuna talab qilinadi</b>\n\nKino kodlaridan foydalanish uchun avval obuna sotib olishingiz kerak.`
            : `🔒 <b>Требуется активная подписка</b>\n\nЧтобы использовать коды фильмов, сначала оформите подписку.`,
          {
            parse_mode: "HTML",
            reply_markup: new InlineKeyboard()
              .text(
                isUz ? "💳 Obuna sotib olish" : "💳 Купить подписку",
                "subscription:status",
              )
              .row()
              .text(isUz ? "🔙 Menyu" : "🔙 Меню", "menu:main"),
          },
        );
        return;
      }

      // 2. Look up the code
      const [entry] = await db
        .select()
        .from(videoCodesTable)
        .where(
          and(
            eq(videoCodesTable.code, text),
            eq(videoCodesTable.status, "active"),
          ),
        )
        .limit(1);

      if (!entry?.telegramFileId) {
        await ctx.reply(
          isUz
            ? `❌ <b>${text}</b> kodi topilmadi yoki hali faol emas.\n\n<i>To'g'ri kodni tekshirib qaytadan yuboring.</i>`
            : `❌ Код <b>${text}</b> не найден или ещё не активен.\n\n<i>Проверьте код и попробуйте снова.</i>`,
          {
            parse_mode: "HTML",
            reply_markup: new InlineKeyboard()
              .text(
                isUz ? "🎬 Boshqa kod" : "🎬 Другой код",
                "videocodes:enter",
              )
              .text(isUz ? "🔙 Menyu" : "🔙 Меню", "menu:main"),
          },
        );
        return;
      }

      // 3. Check channel subscription (if required)
      const [tgConfig] = await db.select().from(telegramConfigTable).limit(1);
      const requiredChanId = tgConfig?.requiredChannelId;

      if (requiredChanId) {
        const subscribed = await checkChannelSub(
          bot,
          ctx.from.id,
          requiredChanId,
        );
        if (!subscribed) {
          // Build channel link — @username works as a URL, numeric ID doesn't
          const chanLink = requiredChanId.startsWith("@")
            ? `https://t.me/${requiredChanId.slice(1)}`
            : `https://t.me/c/${requiredChanId.replace("-100", "")}`;

          await ctx.reply(
            isUz
              ? `🔔 <b>Kanalga obuna bo'ling!</b>\n\nKinoni ko'rish uchun avval kanalimizga obuna bo'lishingiz kerak.\n\nObuna bo'lgach, <b>"✅ Obuna bo'ldim"</b> tugmasini bosing.`
              : `🔔 <b>Подпишитесь на канал!</b>\n\nДля просмотра фильма сначала подпишитесь на наш канал.\n\nПосле подписки нажмите кнопку <b>"✅ Я подписался"</b>.`,
            {
              parse_mode: "HTML",
              reply_markup: new InlineKeyboard()
                .url(
                  isUz ? "📢 Kanalga o'tish" : "📢 Перейти в канал",
                  chanLink,
                )
                .row()
                .text(
                  isUz
                    ? "✅ Obuna bo'ldim — tekshirish"
                    : "✅ Я подписался — проверить",
                  `vidcode:recheck:${text}`,
                ),
            },
          );
          return;
        }
      }

      // 3. All clear — send video
      const allowed = await consumeCodeAllowance(String(ctx.from.id));
      if (!allowed) {
        await ctx.reply(
          isUz
            ? `⏳ Kino kodi limitingiz tugadi. Limit davri yangilangach yana foydalanishingiz mumkin.`
            : `⏳ Лимит кодов закончился. Вы сможете снова использовать коды после обновления лимита.`,
        );
        return;
      }

      await sendVideoCode(ctx, entry);
      return;
    }

    // ─── Search step ───────────────────────────────────────────────────────
    if (ctx.session.step !== "search") return;
    ctx.session.step = undefined;

    const query = text;

    const [movies, series] = await Promise.all([
      db
        .select({
          id: moviesTable.id,
          title: moviesTable.title,
          type: sql<string>`'movie'`,
        })
        .from(moviesTable)
        .where(
          and(
            eq(moviesTable.isPublished, true),
            ilike(moviesTable.title, `%${query}%`),
            sql`${moviesTable.deletedAt} IS NULL`,
          ),
        )
        .limit(5),
      db
        .select({
          id: seriesTable.id,
          title: seriesTable.title,
          type: sql<string>`'series'`,
        })
        .from(seriesTable)
        .where(
          and(
            eq(seriesTable.isPublished, true),
            ilike(seriesTable.title, `%${query}%`),
            sql`${seriesTable.deletedAt} IS NULL`,
          ),
        )
        .limit(5),
    ]);

    const results = [...movies, ...series];

    if (results.length === 0) {
      await ctx.reply(
        isUz
          ? `😔 "${query}" bo'yicha hech narsa topilmadi.`
          : `😔 По запросу "${query}" ничего не найдено.`,
        {
          reply_markup: new InlineKeyboard().text(
            isUz ? "🔙 Menyu" : "🔙 Меню",
            "menu:main",
          ),
        },
      );
      return;
    }

    const keyboard = new InlineKeyboard();
    for (const item of results) {
      const icon = item.type === "movie" ? "🎬" : "📺";
      keyboard
        .text(
          `${icon} ${item.title}`,
          `${item.type === "movie" ? "movie" : "series"}:${item.id}`,
        )
        .row();
    }
    keyboard.text(isUz ? "🔙 Menyu" : "🔙 Меню", "menu:main");

    await ctx.reply(
      isUz ? `🔍 "${query}" natijalar:` : `🔍 Результаты по "${query}":`,
      { reply_markup: keyboard },
    );
  });
}
