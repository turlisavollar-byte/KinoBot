import { type Bot, InlineKeyboard, Keyboard } from "grammy";
import { eq } from "drizzle-orm";
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

function parseDeeplinkPayload(payload: string | undefined): {
  source: string | null;
  code: string | null;
} {
  if (!payload) return { source: null, code: null };

  const [prefix, code] = payload.split("_");
  const source = DEEPLINK_SOURCE_PREFIXES[prefix.toLowerCase()] ?? null;
  if (!source) return { source: null, code: null };

  return { source, code: code ?? null };
}

async function registerOrGetUser(
  ctx: BotContext,
  acquisitionSource: string | null,
) {
  const tg = ctx.from!;
  const telegramId = String(tg.id);

  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.telegramId, telegramId))
    .limit(1);

  if (existing) {
    if (!existing.isActive && !existing.isBlocked) {
      await db
        .update(usersTable)
        .set({ isActive: true })
        .where(eq(usersTable.id, existing.id));
    }
    return existing;
  }

  const [user] = await db
    .insert(usersTable)
    .values({
      telegramId,
      username: tg.username ?? null,
      firstName: tg.first_name ?? null,
      lastName: tg.last_name ?? null,
      languageCode: tg.language_code === "ru" ? "ru" : "uz",
      isActive: true,
      acquisitionSource,
      trialExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })
    .returning();

  logger.info(
    { telegramId, userId: user.id, acquisitionSource },
    "New user registered via bot",
  );
  return user;
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
    .text(isUz ? "💳 Obuna" : "💳 Подписка", "subscription:status");
}

function menuReplyKeyboard(isUz: boolean) {
  return new Keyboard()
    .text(isUz ? "📱 Menyu" : "📱 Меню")
    .resized()
    .persistent();
}

export function registerStartHandler(bot: Bot<BotContext>) {
  // ─── /start ────────────────────────────────────────────────────────────────
  bot.command("start", async (ctx) => {
    const payload = ctx.match ? String(ctx.match).trim() : undefined;
    const { source, code } = parseDeeplinkPayload(payload);

    const user = await registerOrGetUser(ctx, source);
    ctx.session.language = (user.languageCode as "uz" | "ru") ?? "uz";
    ctx.session.step = undefined;

    const isUz = ctx.session.language === "uz";
    const name =
      ctx.from?.first_name ?? (isUz ? "Foydalanuvchi" : "Пользователь");

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
    const keyboard = new InlineKeyboard()
      .text("🇺🇿 O'zbek", "lang:uz")
      .text("🇷🇺 Русский", "lang:ru");
    await ctx.reply("Tilni tanlang / Выберите язык:", {
      reply_markup: keyboard,
    });
  });

  bot.callbackQuery(/^lang:(uz|ru)$/, async (ctx) => {
    const lang = ctx.match[1] as "uz" | "ru";
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
    await ctx.editMessageText(msg);
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
      .where(eq(subscriptionsTable.userId, user.id))
      .limit(1);

    const subStatus = activeSub
      ? `✅ ${activeSub.plan.name} (до ${new Date(activeSub.sub.endDate).toLocaleDateString()})`
      : isUz
        ? "❌ Obuna yo'q"
        : "❌ Нет подписки";

    const text = isUz
      ? `👤 <b>Profil</b>\n\nIsm: ${user.firstName ?? "—"}\nUsername: @${user.username ?? "—"}\nTil: O'zbek 🇺🇿\n\n💳 Obuna: ${subStatus}`
      : `👤 <b>Профиль</b>\n\nИмя: ${user.firstName ?? "—"}\nUsername: @${user.username ?? "—"}\nЯзык: Русский 🇷🇺\n\n💳 Подписка: ${subStatus}`;

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

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      isUz
        ? `📱 <b>Asosiy menyu</b>\n\nQuyidagi bo'limlardan birini tanlang:`
        : `📱 <b>Главное меню</b>\n\nВыберите один из разделов:`,
      { parse_mode: "HTML", reply_markup: mainMenuInline(isUz) },
    );
  });
}
