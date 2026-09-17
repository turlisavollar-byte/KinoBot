import { type Bot, InlineKeyboard } from "grammy";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { container } from "tsyringe";
import {
  db,
  usersTable,
  subscriptionsTable,
  subscriptionPlansTable,
} from "@workspace/db";
import type { BotContext } from "@/bot/index";
import {
  CreateAnorPaymentUseCase,
  CreateClickPaymentUseCase,
  CreateInvoiceUseCase,
  CreateNBUPaymentUseCase,
  CreateOctoPaymentUseCase,
  CreateP2PPaymentUseCase,
  CreatePaymePaymentUseCase,
  CreatePaynetPaymentUseCase,
  CreateUzumPaymentUseCase,
  CreateUzcardPaymentUseCase,
} from "@/modules/billing/application";
import { billingConfig } from "@/modules/billing/infrastructure/billingConfig";
import { resolveActiveSubscriptionSnapshot } from "@/modules/billing/infrastructure/subscriptionCompatibility";
import { logger } from "@/lib/logger";

type PaymentUseCase = {
  execute(input: { invoiceId: string }): Promise<{ paymentUrl: string }>;
};

const providers = {
  anor: {
    label: "Anor",
    resolve: () =>
      container.resolve(CreateAnorPaymentUseCase) as PaymentUseCase,
  },
  click: {
    label: "Click",
    resolve: () =>
      container.resolve(CreateClickPaymentUseCase) as PaymentUseCase,
  },
  nbu: {
    label: "NBU",
    resolve: () => container.resolve(CreateNBUPaymentUseCase) as PaymentUseCase,
  },
  octo: {
    label: "Octo",
    resolve: () =>
      container.resolve(CreateOctoPaymentUseCase) as PaymentUseCase,
  },
  p2p: {
    label: "P2P",
    resolve: () => container.resolve(CreateP2PPaymentUseCase) as PaymentUseCase,
  },
  payme: {
    label: "Payme",
    resolve: () =>
      container.resolve(CreatePaymePaymentUseCase) as PaymentUseCase,
  },
  paynet: {
    label: "Paynet",
    resolve: () =>
      container.resolve(CreatePaynetPaymentUseCase) as PaymentUseCase,
  },
  uzcard: {
    label: "Uzcard",
    resolve: () =>
      container.resolve(CreateUzcardPaymentUseCase) as PaymentUseCase,
  },
  uzum: {
    label: "Uzum",
    resolve: () =>
      container.resolve(CreateUzumPaymentUseCase) as PaymentUseCase,
  },
} as const;

type ProviderKey = keyof typeof providers;

function isProviderKey(value: string): value is ProviderKey {
  return value in providers;
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

function formatPrice(value: string): string {
  const price = Number(value);
  return Number.isFinite(price) ? price.toLocaleString() : "—";
}

function isValidPaymentUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Checks if user has an active subscription.
 * Returns true if user has a valid subscription OR content is free.
 */
export async function checkUserSubscription(
  telegramId: string,
): Promise<boolean> {
  const [user] = await db
    .select({
      id: usersTable.id,
      isBlocked: usersTable.isBlocked,
      trialExpiresAt: usersTable.trialExpiresAt,
    })
    .from(usersTable)
    .where(eq(usersTable.telegramId, telegramId))
    .limit(1);

  if (!user) return false;
  if (user.isBlocked) return false;

  const now = new Date();
  if (user.trialExpiresAt && user.trialExpiresAt > now) return true;
  return Boolean(await resolveActiveSubscriptionSnapshot(user.id));
}

export function registerSubscriptionHandler(bot: Bot<BotContext>) {
  // Subscription status
  bot.callbackQuery("subscription:status", async (ctx) => {
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

    const now = new Date();
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
          gt(subscriptionsTable.endDate, now),
        ),
      )
      .orderBy(desc(subscriptionsTable.endDate))
      .limit(1);

    const keyboard = new InlineKeyboard()
      .text(
        isUz ? "📋 Obuna rejalari" : "📋 Планы подписки",
        "subscription:plans",
      )
      .row()
      .text(isUz ? "🔙 Menyu" : "🔙 Меню", "menu:main");

    let text: string;
    if (activeSub) {
      const endDate = new Date(activeSub.sub.endDate).toLocaleDateString(
        isUz ? "uz-UZ" : "ru-RU",
      );
      text = isUz
        ? `✅ <b>Faol obuna</b>\n\nReja: <b>${escapeHtml(activeSub.plan.name)}</b>\nNarxi: ${parseFloat(activeSub.plan.price).toLocaleString()} ${escapeHtml(activeSub.plan.currency)}\nAmal qiladi: <b>${escapeHtml(endDate)}</b>`
        : `✅ <b>Активная подписка</b>\n\nПлан: <b>${escapeHtml(activeSub.plan.name)}</b>\nЦена: ${parseFloat(activeSub.plan.price).toLocaleString()} ${escapeHtml(activeSub.plan.currency)}\nДействует до: <b>${escapeHtml(endDate)}</b>`;
    } else {
      text = isUz
        ? `❌ <b>Obuna yo'q</b>\n\nHozirda faol obunangiz yo'q.\nObuna olib, barcha kino va seriallardan bahramand bo'ling!`
        : `❌ <b>Нет подписки</b>\n\nУ вас нет активной подписки.\nОформите подписку и наслаждайтесь всеми фильмами!`;
    }

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(text, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  });

  // Plans list
  bot.callbackQuery("subscription:plans", async (ctx) => {
    const isUz = ctx.session.language === "uz";

    const plans = await db
      .select()
      .from(subscriptionPlansTable)
      .where(
        and(
          eq(subscriptionPlansTable.isActive, true),
          isNull(subscriptionPlansTable.deletedAt),
        ),
      )
      .orderBy(sql`${subscriptionPlansTable.price}::numeric`);

    if (plans.length === 0) {
      await ctx.answerCallbackQuery();
      await ctx.editMessageText(
        isUz
          ? "Hozirda obuna rejalari mavjud emas."
          : "Планов подписки пока нет.",
        {
          reply_markup: new InlineKeyboard().text(
            isUz ? "🔙 Orqaga" : "🔙 Назад",
            "subscription:status",
          ),
        },
      );
      return;
    }

    const keyboard = new InlineKeyboard();
    for (const plan of plans) {
      const price = formatPrice(plan.price);
      keyboard
        .text(
          `${plan.name} — ${price} ${plan.currency}/${plan.durationDays}${isUz ? " kun" : " дн."}`,
          `plan:select:${plan.id}`,
        )
        .row();
    }
    keyboard.text(isUz ? "🔙 Orqaga" : "🔙 Назад", "subscription:status");

    const text = isUz
      ? `📋 <b>Obuna rejalari</b>\n\nO'zingizga mos rejani tanlang:`
      : `📋 <b>Планы подписки</b>\n\nВыберите подходящий план:`;

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(text, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  });

  // Plan detail / payment provider selection
  bot.callbackQuery(/^plan:select:(.+)$/, async (ctx) => {
    const planId = ctx.match[1];
    const isUz = ctx.session.language === "uz";

    const [plan] = await db
      .select()
      .from(subscriptionPlansTable)
      .where(
        and(
          eq(subscriptionPlansTable.id, planId),
          eq(subscriptionPlansTable.isActive, true),
          isNull(subscriptionPlansTable.deletedAt),
        ),
      )
      .limit(1);

    if (!plan) {
      await ctx.answerCallbackQuery();
      return;
    }

    const price = formatPrice(plan.price);
    const hasEnabledProvider = billingConfig.enabledProviders.some((provider) =>
      isProviderKey(provider),
    );
    const text = !hasEnabledProvider
      ? isUz
        ? `💳 <b>${escapeHtml(plan.name)}</b>\n\nHozircha to'lov usullari sozlanmoqda. Iltimos, keyinroq urinib ko'ring.`
        : `💳 <b>${escapeHtml(plan.name)}</b>\n\nПлатежные методы пока настраиваются. Пожалуйста, попробуйте позже.`
      : isUz
        ? `💳 <b>${escapeHtml(plan.name)}</b>\n\nNarxi: <b>${price} ${escapeHtml(plan.currency)}</b>\nMuddati: ${plan.durationDays} kun\nQurilmalar: ${plan.maxDevices} ta\n\n${escapeHtml(plan.description ?? "")}\n\nTo'lov tizimini tanlang:`
        : `💳 <b>${escapeHtml(plan.name)}</b>\n\nЦена: <b>${price} ${escapeHtml(plan.currency)}</b>\nСрок: ${plan.durationDays} дней\nУстройств: ${plan.maxDevices}\n\n${escapeHtml(plan.description ?? "")}\n\nВыберите платежную систему:`;

    const keyboard = new InlineKeyboard();
    for (const enabledProvider of billingConfig.enabledProviders) {
      if (!isProviderKey(enabledProvider)) continue;
      const provider = enabledProvider;
      keyboard
        .text(
          `💳 ${providers[provider].label}`,
          `payment:${provider}:${planId}`,
        )
        .row();
    }
    keyboard.text(
      isUz ? "🔙 Rejalarga qaytish" : "🔙 К планам",
      "subscription:plans",
    );

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(text, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  });

  // Payment provider selection handler
  bot.callbackQuery(/^payment:([^:]+):([^:]+)$/, async (ctx) => {
    const provider = ctx.match[1];
    const planId = ctx.match[2];
    const isUz = ctx.session.language === "uz";

    await ctx.answerCallbackQuery();

    if (
      !provider ||
      !isProviderKey(provider) ||
      !billingConfig.enabledProviders.includes(provider)
    ) {
      await ctx.editMessageText(
        isUz
          ? "❌ Bu to'lov usuli hozircha mavjud emas."
          : "❌ Этот способ оплаты сейчас недоступен.",
      );
      return;
    }

    const [plan] = await db
      .select()
      .from(subscriptionPlansTable)
      .where(
        and(
          eq(subscriptionPlansTable.id, planId),
          eq(subscriptionPlansTable.isActive, true),
          isNull(subscriptionPlansTable.deletedAt),
        ),
      )
      .limit(1);

    if (!plan) {
      await ctx.editMessageText(
        isUz ? "❌ Reja topilmadi." : "❌ План не найден.",
      );
      return;
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.telegramId, String(ctx.from.id)))
      .limit(1);

    if (!user) {
      await ctx.editMessageText(
        isUz
          ? "❌ Xatolik: Foydalanuvchi topilmadi."
          : "❌ Ошибка: Пользователь не найден.",
        {
          reply_markup: new InlineKeyboard().text(
            isUz ? "🔙 Orqaga" : "🔙 Назад",
            `plan:select:${planId}`,
          ),
        },
      );
      return;
    }

    // Create an invoice and provider checkout URL through the billing module.
    let paymentUrl: string | null = null;
    try {
      const price = Number(plan.price);
      if (!Number.isFinite(price) || price <= 0) {
        throw new Error("Billing plan has an invalid price");
      }

      const invoice = await container.resolve(CreateInvoiceUseCase).execute(
        {
          userId: user.id,
          lineItems: [
            {
              description: plan.name,
              quantity: 1,
              unitAmountCents: Math.round(price * 100),
            },
          ],
          currency: plan.currency,
          metadata: {
            source: "telegram_bot",
            planId: plan.id,
            provider,
          },
        },
        `telegram:${user.id}:${plan.id}:${provider}:${crypto.randomUUID()}`,
      );

      const paymentUseCase = providers[provider].resolve();
      const result = await paymentUseCase.execute({
        invoiceId: invoice.id,
      });
      if (!isValidPaymentUrl(result.paymentUrl)) {
        throw new Error("Provider returned an invalid payment URL");
      }
      paymentUrl = result.paymentUrl;
    } catch (error) {
      logger.error(
        { err: error, provider, planId, userId: user.id },
        "Payment creation failed",
      );
    }

    if (paymentUrl) {
      const text = isUz
        ? `✅ <b>To'lov yaratildi</b>\n\nProvayder: <b>${escapeHtml(provider.toUpperCase())}</b>\nReja: <b>${escapeHtml(plan.name)}</b>\nNarxi: ${formatPrice(plan.price)} ${escapeHtml(plan.currency)}\n\nQuyidagi tugma orqali to'lovni amalga oshiring:`
        : `✅ <b>Платёж создан</b>\n\nПровайдер: <b>${escapeHtml(provider.toUpperCase())}</b>\nПлан: <b>${escapeHtml(plan.name)}</b>\nЦена: ${formatPrice(plan.price)} ${escapeHtml(plan.currency)}\n\nНажмите кнопку ниже для оплаты:`;

      const keyboard = new InlineKeyboard()
        .url(isUz ? "💳 To'lov qilish" : "💳 Оплатить", paymentUrl)
        .row()
        .text(isUz ? "🔙 Orqaga" : "🔙 Назад", `plan:select:${planId}`);

      await ctx.editMessageText(text, {
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
    } else {
      const text = isUz
        ? `❌ <b>To'lov yaratilmadi</b>\n\nProvayder: <b>${escapeHtml(provider.toUpperCase())}</b>\n\nIltimos, keyinroq urinib ko'ring yoki boshqa provayderni tanlang.`
        : `❌ <b>Платёж не создан</b>\n\nПровайдер: <b>${escapeHtml(provider.toUpperCase())}</b>\n\nПожалуйста, попробуйте позже или выберите другого провайдера.`;

      const keyboard = new InlineKeyboard().text(
        isUz ? "🔙 Orqaga" : "🔙 Назад",
        `plan:select:${planId}`,
      );

      await ctx.editMessageText(text, {
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
    }
  });
}
