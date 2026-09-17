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
  watchSessionsTable,
} from "@workspace/db";
import type { BotContext } from "@/bot/index";
import { checkUserSubscription } from "@/bot/handlers/subscription";
import { checkVideoCodeRateLimit } from "@/bot/video-code-rate-limit";
import { safeParseRequiredChannelIds } from "@/bot/required-channels";

const PAGE_SIZE = 5;

async function recordVideoCodeWatch(
  telegramId: string,
  entry: typeof videoCodesTable.$inferSelect,
) {
  const [user] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.telegramId, telegramId))
    .limit(1);

  if (!user) return;

  await db.insert(watchSessionsTable).values({
    userId: user.id,
    contentId: entry.id,
    contentType: "video_code",
    durationWatched: entry.duration ?? 0,
    completedAt: null,
  });
}

export function isDifferentUtcDay(resetAt: Date, now: Date): boolean {
  return resetAt.toISOString().slice(0, 10) !== now.toISOString().slice(0, 10);
}

export function isDifferentUtcWeek(resetAt: Date, now: Date): boolean {
  const getUtcWeekStart = (date: Date) => {
    const copy = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
    const day = copy.getUTCDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    copy.setUTCDate(copy.getUTCDate() + diffToMonday);
    copy.setUTCHours(0, 0, 0, 0);
    return copy;
  };

  return getUtcWeekStart(resetAt).getTime() !== getUtcWeekStart(now).getTime();
}

export function isDifferentUtcMonth(resetAt: Date, now: Date): boolean {
  return (
    resetAt.getUTCFullYear() !== now.getUTCFullYear() ||
    resetAt.getUTCMonth() !== now.getUTCMonth()
  );
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] ?? character,
  );
}

/**
 * Consume one daily code allowance. A null limit means unlimited.
 * The counter is reset lazily on the first request after the UTC day changes.
 */
async function consumeCodeAllowance(telegramId: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [user] = await tx
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.telegramId, telegramId))
      .limit(1);

    if (!user) return false;

    await tx.execute(
      sql`SELECT ${usersTable.id} FROM ${usersTable} WHERE ${usersTable.id} = ${user.id} FOR UPDATE`,
    );

    const [currentUser] = await tx
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
      .where(eq(usersTable.id, user.id))
      .limit(1);
    const [config] = await tx
      .select({
        defaultDailyCodeLimit: telegramConfigTable.defaultDailyCodeLimit,
        defaultWeeklyCodeLimit: telegramConfigTable.defaultWeeklyCodeLimit,
        defaultMonthlyCodeLimit: telegramConfigTable.defaultMonthlyCodeLimit,
      })
      .from(telegramConfigTable)
      .limit(1);

    if (!currentUser) return false;

    const dailyLimit =
      currentUser.dailyCodeLimit ?? config?.defaultDailyCodeLimit ?? null;
    const weeklyLimit =
      currentUser.weeklyCodeLimit ?? config?.defaultWeeklyCodeLimit ?? null;
    const monthlyLimit =
      currentUser.monthlyCodeLimit ?? config?.defaultMonthlyCodeLimit ?? null;
    const now = new Date();
    const dailyChanged = isDifferentUtcDay(currentUser.dailyCodeResetAt, now);
    const weeklyChanged = isDifferentUtcWeek(
      currentUser.weeklyCodeResetAt,
      now,
    );
    const monthlyChanged = isDifferentUtcMonth(
      currentUser.monthlyCodeResetAt,
      now,
    );

    const [consumed] = await tx
      .update(usersTable)
      .set({
        dailyCodeUsed: dailyChanged ? 1 : sql`${usersTable.dailyCodeUsed} + 1`,
        dailyCodeResetAt: dailyChanged ? now : usersTable.dailyCodeResetAt,
        weeklyCodeUsed: weeklyChanged
          ? 1
          : sql`${usersTable.weeklyCodeUsed} + 1`,
        weeklyCodeResetAt: weeklyChanged ? now : usersTable.weeklyCodeResetAt,
        monthlyCodeUsed: monthlyChanged
          ? 1
          : sql`${usersTable.monthlyCodeUsed} + 1`,
        monthlyCodeResetAt: monthlyChanged
          ? now
          : usersTable.monthlyCodeResetAt,
      })
      .where(
        and(
          eq(usersTable.id, currentUser.id),
          sql`(${dailyLimit === null ? sql`true` : sql`${dailyChanged ? 0 : usersTable.dailyCodeUsed} < ${dailyLimit}`})
            AND (${weeklyLimit === null ? sql`true` : sql`${weeklyChanged ? 0 : usersTable.weeklyCodeUsed} < ${weeklyLimit}`})
            AND (${monthlyLimit === null ? sql`true` : sql`${monthlyChanged ? 0 : usersTable.monthlyCodeUsed} < ${monthlyLimit}`})`,
        ),
      )
      .returning({ id: usersTable.id });

    return Boolean(consumed);
  });
}

// ─── Shared: deliver a video code (used by both bot text handler and /start deeplinks) ──
async function getMissingRequiredChannels(
  bot: Bot<BotContext>,
  userId: number,
  channelId: string,
): Promise<string[]> {
  const channelIds = channelId
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const results = await Promise.all(
    channelIds.map(async (requiredChannelId) => {
      try {
        const member = await bot.api.getChatMember(requiredChannelId, userId);
        const subscribed =
          ["creator", "administrator", "member"].includes(member.status) ||
          (member.status === "restricted" && member.is_member);
        return subscribed ? null : requiredChannelId;
      } catch {
        return requiredChannelId;
      }
    }),
  );

  return results.filter((channelId): channelId is string => channelId !== null);
}

async function hasRequiredChannelMembership(
  bot: Bot<BotContext>,
  userId: number,
  additionalChannelIds?: string | null,
): Promise<boolean> {
  const [config] = await db.select().from(telegramConfigTable).limit(1);
  const requiredChannelIds = [
    ...new Set([
      ...safeParseRequiredChannelIds(config?.requiredChannelId),
      ...safeParseRequiredChannelIds(additionalChannelIds),
    ]),
  ];

  if (requiredChannelIds.length === 0) return true;
  return (
    (
      await getMissingRequiredChannels(
        bot,
        userId,
        requiredChannelIds.join(","),
      )
    ).length === 0
  );
}

async function sendVideoCode(
  ctx: BotContext,
  entry: typeof videoCodesTable.$inferSelect,
) {
  const isUz = ctx.session.language === "uz";
  const msg = await ctx.replyWithVideo(entry.telegramFileId!, {
    caption:
      `🎬 <b>${escapeHtml(entry.title)}</b>\n\n` +
      `📋 ${isUz ? "Kod" : "Код"}: <code>${escapeHtml(entry.code)}</code>\n\n` +
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
  await recordVideoCodeWatch(String(ctx.from!.id), entry);

  return msg;
}

function channelLink(channelId: string): string {
  return channelId.startsWith("@")
    ? `https://t.me/${channelId.slice(1)}`
    : `https://t.me/c/${channelId.replace("-100", "")}`;
}

function requiredChannelKeyboard(
  code: string,
  channelIds: string[],
  isUz: boolean,
): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  channelIds.forEach((channelId, index) => {
    keyboard
      .url(
        isUz
          ? `📢 ${index + 1}-kanalga o'tish`
          : `📢 Перейти в канал ${index + 1}`,
        channelLink(channelId),
      )
      .row();
  });
  keyboard.text(
    isUz ? "✅ Obuna bo'ldim — tekshirish" : "✅ Я подписался — проверить",
    `vidcode:recheck:${code}`,
  );
  return keyboard;
}

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
        ? `❌ <b>${escapeHtml(code)}</b> kodi topilmadi yoki hali faol emas.`
        : `❌ Код <b>${escapeHtml(code)}</b> не найден или ещё не активен.`,
      { parse_mode: "HTML" },
    );
    return;
  }

  const [tgConfig] = await db.select().from(telegramConfigTable).limit(1);
  const globalRequiredChannelIds = safeParseRequiredChannelIds(
    tgConfig?.requiredChannelId,
  );
  const videoRequiredChannelIds = safeParseRequiredChannelIds(
    entry.requiredChannelIds,
  );
  const requiredChannelIds = [
    ...new Set([...globalRequiredChannelIds, ...videoRequiredChannelIds]),
  ];

  if (requiredChannelIds.length > 0) {
    const missing = await getMissingRequiredChannels(
      bot,
      ctx.from!.id,
      requiredChannelIds.join(","),
    );
    if (missing.length > 0) {
      await ctx.reply(
        isUz
          ? `🔔 <b>${requiredChannelIds.length} ta kanalga obuna bo'ling</b>\n\nQuyidagi kanallarning barchasiga a'zo bo'ling, so'ng tekshirish tugmasini bosing.`
          : `🔔 <b>Подпишитесь на ${requiredChannelIds.length} канала</b>\n\nПодпишитесь на все каналы ниже, затем нажмите кнопку проверки.`,
        {
          parse_mode: "HTML",
          reply_markup: requiredChannelKeyboard(code, requiredChannelIds, isUz),
        },
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

  return sendVideoCode(ctx, entry);
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
        and(
          eq(moviesTable.id, movieId),
          eq(moviesTable.isPublished, true),
          sql`${moviesTable.deletedAt} IS NULL`,
        ),
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
      ? `\n\n${escapeHtml(movie.description.slice(0, 200))}${movie.description.length > 200 ? "..." : ""}`
      : "";

    const info = [year, duration, rating].filter(Boolean).join(" • ");
    const text = `🎬 <b>${escapeHtml(movie.title)}</b>${movie.originalTitle ? ` / ${escapeHtml(movie.originalTitle)}` : ""}\n${info}${desc}`;

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

    if (!(await hasRequiredChannelMembership(bot, ctx.from.id))) {
      await ctx.answerCallbackQuery(
        isUz ? "Avval kanalga obuna bo'ling" : "Сначала подпишитесь на канал",
      );
      return;
    }

    await ctx.answerCallbackQuery(isUz ? "Yuborilmoqda..." : "Отправляем...");
    await ctx.replyWithVideo(movie.telegramFileId, {
      caption: `🎬 <b>${escapeHtml(movie.title)}</b>${movie.releaseYear ? ` (${movie.releaseYear})` : ""}`,
      parse_mode: "HTML",
      protect_content: true,
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
  bot.callbackQuery(/^series:([^:]+)$/, async (ctx) => {
    const seriesId = ctx.match[1];
    const isUz = ctx.session.language === "uz";

    const [series] = await db
      .select()
      .from(seriesTable)
      .where(
        and(
          eq(seriesTable.id, seriesId),
          eq(seriesTable.isPublished, true),
          sql`${seriesTable.deletedAt} IS NULL`,
        ),
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

    // Add watch button if series has a direct video file
    if (series.telegramFileId) {
      keyboard
        .text(
          isUz ? "▶️ Serialni ko'rish" : "▶️ Смотреть сериал",
          `series:watch:${series.id}`,
        )
        .row();
    }

    keyboard.text(isUz ? "🔙 Seriallar" : "🔙 Сериалы", "catalog:series");

    if (seasons.length === 0) {
      await ctx.answerCallbackQuery(
        isUz
          ? "Bu serialda hali mavsum yo'q"
          : "У этого сериала пока нет сезонов",
      );
      await ctx.editMessageText(
        isUz
          ? `📺 <b>${escapeHtml(series.title)}</b>\n\n⚠️ Bu serialda hali mavsumlar qo'shilmagan.`
          : `📺 <b>${escapeHtml(series.title)}</b>\n\n⚠️ Для этого сериала ещё не добавлены сезоны.`,
        { parse_mode: "HTML", reply_markup: keyboard },
      );
      return;
    }

    const desc = series.description
      ? `\n\n${escapeHtml(series.description.slice(0, 150))}${series.description.length > 150 ? "..." : ""}`
      : "";
    const text = `📺 <b>${escapeHtml(series.title)}</b>${desc}`;

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(text, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  });

  // ─── SERIES WATCH (direct video if series has telegramFileId) ───────────────
  bot.callbackQuery(/^series:watch:(.+)$/, async (ctx) => {
    const seriesId = ctx.match[1];
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
          ? "🔒 Bu serial faqat obunachilarga mavjud."
          : "🔒 Этот сериал доступен только подписчикам.",
        { reply_markup: keyboard },
      );
      return;
    }

    const [series] = await db
      .select()
      .from(seriesTable)
      .where(
        and(eq(seriesTable.id, seriesId), eq(seriesTable.isPublished, true)),
      )
      .limit(1);

    if (!series) {
      await ctx.answerCallbackQuery();
      return;
    }

    if (!series.telegramFileId) {
      await ctx.answerCallbackQuery(
        isUz ? "Hali yuklanmagan" : "Ещё не загружено",
      );
      return;
    }

    if (!(await hasRequiredChannelMembership(bot, ctx.from.id))) {
      await ctx.answerCallbackQuery(
        isUz ? "Avval kanalga obuna bo'ling" : "Сначала подпишитесь на канал",
      );
      return;
    }

    await ctx.answerCallbackQuery(isUz ? "Yuborilmoqda..." : "Отправляем...");
    await ctx.replyWithVideo(series.telegramFileId, {
      caption: `📺 <b>${escapeHtml(series.title)}</b>`,
      parse_mode: "HTML",
      protect_content: true,
    });

    await db
      .update(seriesTable)
      .set({ viewsCount: sql`${seriesTable.viewsCount} + 1` })
      .where(eq(seriesTable.id, seriesId));
  });

  // ─── SEASON (EPISODES) ───────────────────────────────────────────────────────
  bot.callbackQuery(/^season:(.+)$/, async (ctx) => {
    const seasonId = ctx.match[1];
    const isUz = ctx.session.language === "uz";

    const [season] = await db
      .select()
      .from(seasonsTable)
      .where(
        and(
          eq(seasonsTable.id, seasonId),
          sql`${seasonsTable.deletedAt} IS NULL`,
        ),
      )
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
      await ctx.answerCallbackQuery();
      await ctx.editMessageText(
        isUz
          ? "⚠️ Bu mavsumda hali ko'rish uchun epizodlar yo'q."
          : "⚠️ В этом сезоне пока нет доступных эпизодов.",
        {
          reply_markup: new InlineKeyboard().text(
            isUz ? "🔙 Orqaga" : "🔙 Назад",
            `series:${season.seriesId}`,
          ),
        },
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
      isUz
        ? `📂 <b>${escapeHtml(seasonTitle)}</b>`
        : `📂 <b>${escapeHtml(seasonTitle)}</b>`,
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
          sql`${episodesTable.deletedAt} IS NULL`,
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

    if (!(await hasRequiredChannelMembership(bot, ctx.from.id))) {
      await ctx.answerCallbackQuery(
        isUz ? "Avval kanalga obuna bo'ling" : "Сначала подпишитесь на канал",
      );
      return;
    }

    await ctx.answerCallbackQuery(isUz ? "Yuborilmoqda..." : "Отправляем...");
    await ctx.replyWithVideo(ep.telegramFileId, {
      caption: `▶️ <b>${ep.episodeNumber}. ${escapeHtml(ep.title)}</b>`,
      parse_mode: "HTML",
      protect_content: true,
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

  // ─── ENTER VIDEO CODE ────────────────────────────────────────────────────
  bot.callbackQuery("videocodes:enter", async (ctx) => {
    const isUz = ctx.session.language === "uz";
    ctx.session.step = "video_code";

    await ctx.answerCallbackQuery();

    const text = isUz
      ? `🎬 <b>Kino kodi</b>\n\n4 xonali kino kodini yuboring.\n\nMasalan: <code>X7KP</code>`
      : `🎬 <b>Код фильма</b>\n\nОтправьте 4-значный код фильма.\n\nНапример: <code>X7KP</code>`;
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
    const hasSub = await checkUserSubscription(String(ctx.from.id));

    if (!hasSub) {
      await bot.api.answerCallbackQuery(ctx.callbackQuery.id, {
        text: isUz
          ? "Faol obuna talab qilinadi"
          : "Требуется активная подписка",
        show_alert: true,
      });
      return;
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

    if (
      !(await hasRequiredChannelMembership(
        bot,
        ctx.from.id,
        entry.requiredChannelIds,
      ))
    ) {
      const [config] = await db.select().from(telegramConfigTable).limit(1);
      const requiredChannelIds = [
        ...new Set([
          ...safeParseRequiredChannelIds(config?.requiredChannelId),
          ...safeParseRequiredChannelIds(entry.requiredChannelIds),
        ]),
      ];
      const missing = await getMissingRequiredChannels(
        bot,
        ctx.from.id,
        requiredChannelIds.join(","),
      );
      await bot.api.answerCallbackQuery(ctx.callbackQuery.id, {
        text: isUz
          ? `A'zo bo'lmagan kanal: ${missing.join(", ") || "noma'lum"}`
          : `Не оформлена подписка на: ${missing.join(", ") || "неизвестный канал"}`,
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

      const rateLimit = await checkVideoCodeRateLimit(telegramId);
      if (!rateLimit.allowed) {
        await ctx.reply(
          isUz
            ? `⏳ Juda ko'p kod urinishlari. ${rateLimit.retryAfterSeconds} soniyadan keyin qayta urinib ko'ring.`
            : `⏳ Слишком много попыток ввода кода. Повторите через ${rateLimit.retryAfterSeconds} сек.`,
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
            ? `❌ <b>${escapeHtml(text)}</b> kodi topilmadi yoki hali faol emas.\n\n<i>To'g'ri kodni tekshirib qaytadan yuboring.</i>`
            : `❌ Код <b>${escapeHtml(text)}</b> не найден или ещё не активен.\n\n<i>Проверьте код и попробуйте снова.</i>`,
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
      const requiredChannelIds = [
        ...new Set([
          ...safeParseRequiredChannelIds(tgConfig?.requiredChannelId),
          ...safeParseRequiredChannelIds(entry.requiredChannelIds),
        ]),
      ];

      if (requiredChannelIds.length > 0) {
        const missing = await getMissingRequiredChannels(
          bot,
          ctx.from.id,
          requiredChannelIds.join(","),
        );
        if (missing.length > 0) {
          await ctx.reply(
            isUz
              ? `🔔 <b>${requiredChannelIds.length} ta kanalga obuna bo'ling</b>\n\nQuyidagi kanallarning barchasiga a'zo bo'ling, so'ng tekshirish tugmasini bosing.`
              : `🔔 <b>Подпишитесь на ${requiredChannelIds.length} канала</b>\n\nПодпишитесь на все каналы ниже, затем нажмите кнопку проверки.`,
            {
              parse_mode: "HTML",
              reply_markup: requiredChannelKeyboard(
                text,
                requiredChannelIds,
                isUz,
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
