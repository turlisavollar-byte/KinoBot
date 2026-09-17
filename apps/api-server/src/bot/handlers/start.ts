import { type Bot, InlineKeyboard, Keyboard } from "grammy";
import { and, desc, eq, gt } from "drizzle-orm";
import { container } from "tsyringe";
import {
  db,
  usersTable,
  subscriptionsTable,
  subscriptionPlansTable,
} from "@workspace/db";
import type { BotContext } from "@/bot/index";
import { logger } from "@/lib/logger";
import { deliverVideoCodeByDeeplink } from "@/bot/handlers/catalog";

// Deep-link payload formats (t.me/<bot>?start=<payload>):
//   ig            — generic Instagram-sourced entry (tracked, no content)
//   ig_<CODE>     — Instagram-sourced entry that should also open a specific video code
const DEEPLINK_SOURCE_PREFIXES: Record<string, string> = {
  ig: "instagram",
};
const TRIAL_DAYS = 30;

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

function resolveTelegramLanguage(
  languageCode: string | undefined,
): "uz" | "ru" {
  return languageCode?.toLowerCase().startsWith("ru") ? "ru" : "uz";
}

function parseDeeplinkPayload(payload: string | undefined): {
  source: string | null;
  code: string | null;
} {
  if (!payload) return { source: null, code: null };

  const separatorIndex = payload.indexOf("_");
  const prefix =
    separatorIndex === -1 ? payload : payload.slice(0, separatorIndex);
  const code =
    separatorIndex === -1 ? null : payload.slice(separatorIndex + 1) || null;
  const source = DEEPLINK_SOURCE_PREFIXES[prefix.toLowerCase()] ?? null;
  if (!source || (code !== null && !code)) {
    return { source: null, code: null };
  }

  return { source, code };
}

async function registerOrGetUser(
  ctx: BotContext,
  acquisitionSource: string | null,
) {
  const tg = ctx.from!;
  const telegramId = String(tg.id);

  const [user] = await db
    .insert(usersTable)
    .values({
      telegramId,
      username: tg.username ?? null,
      firstName: tg.first_name ?? null,
      lastName: tg.last_name ?? null,
      languageCode: resolveTelegramLanguage(tg.language_code),
      isActive: true,
      acquisitionSource,
      trialExpiresAt: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
    })
    .onConflictDoNothing({ target: usersTable.telegramId })
    .returning();

  if (user) {
    logger.info(
      { telegramId, userId: user.id, acquisitionSource },
      "New user registered via bot",
    );
    return user;
  }

  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.telegramId, telegramId))
    .limit(1);

  if (!existing) {
    throw new Error("User registration conflict could not be resolved");
  }

  if (!existing.isActive && !existing.isBlocked) {
    await db
      .update(usersTable)
      .set({ isActive: true })
      .where(eq(usersTable.id, existing.id));
  }

  return existing;
}

function mainMenuInline(isUz: boolean) {
  return new InlineKeyboard()
    .text(isUz ? "🎬 Kino kodi" : "🎬 Код фильма", "videocodes:enter")
    .row()
    .text(isUz ? "🎥 Filmlar katalogi" : "🎥 Каталог фильмов", "catalog:movies")
    .text(isUz ? "📺 Seriallar" : "📺 Сериалы", "catalog:series")
    .row()
    .text(isUz ? "🔍 Qidirish" : "🔍 Поиск", "search:start")
    .text(isUz ? "👤 Profil" : "👤 Профиль", "profile:show")
    .row()
    .text(isUz ? "💳 Obuna" : "💳 Подписка", "subscription:status")
    .row()
    .text("🌐 Til / Язык", "lang:menu");
}

function menuReplyKeyboard(isUz: boolean) {
  return new Keyboard()
    .text(isUz ? "📱 Menyu" : "📱 Меню")
    .resized()
    .persistent();
}

function languageKeyboard() {
  return new InlineKeyboard()
    .text("🇺🇿 O'zbek", "lang:uz")
    .text("🇷🇺 Русский", "lang:ru");
}

function hasMediaMessage(message: unknown): boolean {
  if (!message || typeof message !== "object") return false;
  return ["photo", "video", "audio", "document", "sticker", "animation"].some(
    (key) => key in message,
  );
}

async function editOrReplyMenu(
  ctx: BotContext,
  text: string,
  isUz: boolean,
): Promise<void> {
  const extra = {
    parse_mode: "HTML" as const,
    reply_markup: mainMenuInline(isUz),
  };
  if (hasMediaMessage(ctx.callbackQuery?.message)) {
    await ctx.reply(text, extra);
    return;
  }
  await ctx.editMessageText(text, extra);
}

export function registerStartHandler(bot: Bot<BotContext>) {
  // ─── /start ────────────────────────────────────────────────────────────────
  bot.command("start", async (ctx) => {
    const payload = ctx.match ? String(ctx.match).trim() : undefined;
    const { source, code } = parseDeeplinkPayload(payload);

    const user = await registerOrGetUser(ctx, source);
    ctx.session.language = user.languageCode === "ru" ? "ru" : "uz";
    ctx.session.step = undefined;

    const isUz = ctx.session.language === "uz";
    const name = escapeHtml(
      ctx.from?.first_name ?? (isUz ? "Foydalanuvchi" : "Пользователь"),
    );

    // Log the touch even for existing users so we can measure ongoing campaign traffic,
    // not just first-time signups (acquisitionSource on the user row is first-touch only).
    if (source) {
      logger.info(
        { telegramId: String(ctx.from!.id), source, code },
        "Deeplink visit",
      );
    }

    const welcomeUz =
      `🎬 <b>Xush kelibsiz, ${name}!</b>\n\n` +
      `Biz bilan maroqli xordiq oling — yangi filmlar, seriallar va eksklyuziv kontentlar sizni kutmoqda!\n\n` +
      `<i>Pastdagi <b>Menyu</b> tugmasini bosing va o'zingiz qiziqtirgan bo'limga o'ting.</i>`;

    const welcomeRu =
      `🎬 <b>Добро пожаловать, ${name}!</b>\n\n` +
      `Приятного отдыха с нами — новые фильмы, сериалы и эксклюзивный контент ждут вас!\n\n` +
      `<i>Нажмите кнопку <b>Меню</b> внизу и перейдите в нужный раздел.</i>`;

    // Send welcome with persistent bottom keyboard
    await ctx.reply(isUz ? welcomeUz : welcomeRu, {
      parse_mode: "HTML",
      reply_markup: menuReplyKeyboard(isUz),
    });

    // If the deeplink pointed at a specific video code, deliver it right away
    if (code) {
      await deliverVideoCodeByDeeplink(bot, ctx, code);
    }
  });

  // ─── "Menyu" / "Меню" bottom button ───────────────────────────────────────
  bot.hears([/^📱\s*Menyu$/i, /^📱\s*Меню$/i], async (ctx) => {
    const isUz = ctx.session.language === "uz";
    ctx.session.step = undefined;

    await ctx.reply(
      isUz
        ? `📱 <b>Asosiy menyu</b>\n\nQuyidagi bo'limlardan birini tanlang:`
        : `📱 <b>Главное меню</b>\n\nВыберите один из разделов:`,
      { parse_mode: "HTML", reply_markup: mainMenuInline(isUz) },
    );
  });

  // ─── /lang command ─────────────────────────────────────────────────────────
  bot.command("lang", async (ctx) => {
    await ctx.reply("Tilni tanlang / Выберите язык:", {
      reply_markup: languageKeyboard(),
    });
  });

  bot.callbackQuery("lang:menu", async (ctx) => {
    await ctx.answerCallbackQuery();
    if (hasMediaMessage(ctx.callbackQuery.message)) {
      await ctx.reply("Tilni tanlang / Выберите язык:", {
        reply_markup: languageKeyboard(),
      });
    } else {
      await ctx.editMessageText("Tilni tanlang / Выберите язык:", {
        reply_markup: languageKeyboard(),
      });
    }
  });

  bot.callbackQuery(/^lang:(uz|ru)$/, async (ctx) => {
    const lang = ctx.match[1] === "ru" ? "ru" : "uz";
    ctx.session.language = lang;

    const telegramId = String(ctx.from.id);
    await db
      .update(usersTable)
      .set({ languageCode: lang })
      .where(eq(usersTable.telegramId, telegramId));

    const msg =
      lang === "uz"
        ? "✅ Til o'zgartirildi: O'zbek 🇺🇿"
        : "✅ Язык изменён: Русский 🇷🇺";
    await ctx.answerCallbackQuery(msg);
    await editOrReplyMenu(ctx, msg, lang === "uz");
  });

  // ─── Profile ───────────────────────────────────────────────────────────────
  bot.callbackQuery("profile:show", async (ctx) => {
    const telegramId = String(ctx.from.id);
    const isUz = ctx.session.language === "uz";

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.telegramId, telegramId))
      .limit(1);

    if (!user) {
      await ctx.answerCallbackQuery();
      return;
    }

    const [activeSub] = await db
      .select({ sub: subscriptionsTable, plan: subscriptionPlansTable })
      .from(subscriptionsTable)
      .innerJoin(
        subscriptionPlansTable,
        eq(subscriptionsTable.planId, subscriptionPlansTable.id),
      )
      .where(
        and(
          eq(subscriptionsTable.userId, user.id),
          eq(subscriptionsTable.status, "active"),
          gt(subscriptionsTable.endDate, new Date()),
        ),
      )
      .orderBy(desc(subscriptionsTable.endDate))
      .limit(1);

    const subStatus = activeSub
      ? `✅ ${escapeHtml(activeSub.plan.name)} (до ${new Date(activeSub.sub.endDate).toLocaleDateString()})`
      : isUz
        ? "❌ Obuna yo'q"
        : "❌ Нет подписки";

    const text = isUz
      ? `👤 <b>Profil</b>\n\nIsm: ${escapeHtml(user.firstName ?? "—")}\nUsername: @${escapeHtml(user.username ?? "—")}\nTil: O'zbek 🇺🇿\n\n💳 Obuna: ${subStatus}`
      : `👤 <b>Профиль</b>\n\nИмя: ${escapeHtml(user.firstName ?? "—")}\nUsername: @${escapeHtml(user.username ?? "—")}\nЯзык: Русский 🇷🇺\n\n💳 Подписка: ${subStatus}`;

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(text, {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard().text(
        isUz ? "🔙 Menyu" : "🔙 Меню",
        "menu:main",
      ),
    });
  });

  // ─── Main menu (inline, from callback) ────────────────────────────────────
  bot.callbackQuery("menu:main", async (ctx) => {
    const isUz = ctx.session.language === "uz";
    ctx.session.step = undefined;

    const text = isUz
      ? `📱 <b>Asosiy menyu</b>\n\nQuyidagi bo'limlardan birini tanlang:`
      : `📱 <b>Главное меню</b>\n\nВыберите один из разделов:`;

    await ctx.answerCallbackQuery();

    await editOrReplyMenu(ctx, text, isUz);
  });
}
