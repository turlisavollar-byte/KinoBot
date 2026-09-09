import { type Bot, InlineKeyboard } from "grammy";
import { eq, and, gt } from "drizzle-orm";
import { container } from "tsyringe";
import {
  db,
  usersTable,
  subscriptionsTable,
  subscriptionPlansTable,
  telegramConfigTable,
} from "@workspace/db";
import type { BotContext } from "@/bot/index";
import {
  CreateAnorPaymentUseCase,
  CreateClickPaymentUseCase,
  CreateInvoiceUseCase,
  CreateNBUPaymentUseCase,
  CreateOctoPaymentUseCase,
  CreatePaymePaymentUseCase,
  CreatePaynetPaymentUseCase,
  CreateUzumPaymentUseCase,
  CreateUzcardPaymentUseCase,
} from "@/modules/billing/application";
import { billingConfig } from "@/modules/billing/infrastructure/billingConfig";

const providerPaymentUseCases = {
  anor: CreateAnorPaymentUseCase,
  click: CreateClickPaymentUseCase,
  nbu: CreateNBUPaymentUseCase,
  octo: CreateOctoPaymentUseCase,
  payme: CreatePaymePaymentUseCase,
  paynet: CreatePaynetPaymentUseCase,
  uzcard: CreateUzcardPaymentUseCase,
  uzum: CreateUzumPaymentUseCase,
} as const;

const providerLabels = {
  anor: "Anor",
  click: "Click",
  nbu: "NBU",
  octo: "Octo",
  payme: "Payme",
  paynet: "Paynet",
  uzcard: "Uzcard",
  uzum: "Uzum",
} as const;

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
      dailyCodeLimit: usersTable.dailyCodeLimit,
      weeklyCodeLimit: usersTable.weeklyCodeLimit,
      monthlyCodeLimit: usersTable.monthlyCodeLimit,
    })
    .from(usersTable)
    .where(eq(usersTable.telegramId, telegramId))
    .limit(1);

  if (!user) return false;
  if (user.isBlocked) return false;

  const now = new Date();
  if (user.trialExpiresAt && user.trialExpiresAt > now) return true;
  if (
    user.dailyCodeLimit !== null ||
    user.weeklyCodeLimit !== null ||
    user.monthlyCodeLimit !== null
  ) {
    return true;
  }
  const [config] = await db
    .select({
      daily: telegramConfigTable.defaultDailyCodeLimit,
      weekly: telegramConfigTable.defaultWeeklyCodeLimit,
      monthly: telegramConfigTable.defaultMonthlyCodeLimit,
    })
    .from(telegramConfigTable)
    .limit(1);
  if (
    config?.daily != null ||
    config?.weekly != null ||
    config?.monthly != null
  ) {
    return true;
  }
  const [activeSub] = await db
    .select()
    .from(subscriptionsTable)
    .where(
      and(
        eq(subscriptionsTable.userId, user.id),
        eq(subscriptionsTable.status, "active"),
        gt(subscriptionsTable.endDate, now),
      ),
    )
    .limit(1);

  return !!activeSub;
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
        ? `✅ <b>Faol obuna</b>\n\nReja: <b>${activeSub.plan.name}</b>\nNarxi: ${parseFloat(activeSub.plan.price).toLocaleString()} ${activeSub.plan.currency}\nAmal qiladi: <b>${endDate}</b>`
        : `✅ <b>Активная подписка</b>\n\nПлан: <b>${activeSub.plan.name}</b>\nЦена: ${parseFloat(activeSub.plan.price).toLocaleString()} ${activeSub.plan.currency}\nДействует до: <b>${endDate}</b>`;
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
      .where(eq(subscriptionPlansTable.isActive, true))
      .orderBy(subscriptionPlansTable.price);

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
      const price = parseFloat(plan.price).toLocaleString();
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
      .where(eq(subscriptionPlansTable.id, planId))
      .limit(1);

    if (!plan) {
      await ctx.answerCallbackQuery();
      return;
    }

    const price = parseFloat(plan.price).toLocaleString();
    const hasEnabledProvider = billingConfig.enabledProviders.some(
      (provider) => provider in providerLabels,
    );
    const text = !hasEnabledProvider
      ? isUz
        ? `💳 <b>${plan.name}</b>\n\nHozircha to'lov usullari sozlanmoqda. Iltimos, keyinroq urinib ko'ring.`
        : `💳 <b>${plan.name}</b>\n\nПлатежные методы пока настраиваются. Пожалуйста, попробуйте позже.`
      : isUz
        ? `💳 <b>${plan.name}</b>\n\nNarxi: <b>${price} ${plan.currency}</b>\nMuddati: ${plan.durationDays} kun\nQurilmalar: ${plan.maxDevices} ta\n\n${plan.description ?? ""}\n\nTo'lov tizimini tanlang:`
        : `💳 <b>${plan.name}</b>\n\nЦена: <b>${price} ${plan.currency}</b>\nСрок: ${plan.durationDays} дней\nУстройств: ${plan.maxDevices}\n\n${plan.description ?? ""}\n\nВыберите платежную систему:`;

    const keyboard = new InlineKeyboard();
    for (const enabledProvider of billingConfig.enabledProviders) {
      if (!(enabledProvider in providerLabels)) continue;
      const provider = enabledProvider as keyof typeof providerLabels;
      keyboard
        .text(`💳 ${providerLabels[provider]}`, `payment:${provider}:${planId}`)
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
  bot.callbackQuery(/^payment:(.+):(.+)$/, async (ctx) => {
    const provider = ctx.match[1];
    const planId = ctx.match[2];
    const isUz = ctx.session.language === "uz";

    if (!billingConfig.enabledProviders.includes(provider as never)) {
      await ctx.answerCallbackQuery({
        text: isUz
          ? "Bu to'lov usuli hozircha mavjud emas."
          : "Этот способ оплаты сейчас недоступен.",
        show_alert: true,
      });
      return;
    }

    const [plan] = await db
      .select()
      .from(subscriptionPlansTable)
      .where(eq(subscriptionPlansTable.id, planId))
      .limit(1);

    if (!plan) {
      await ctx.answerCallbackQuery();
      return;
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.telegramId, String(ctx.from.id)))
      .limit(1);

    if (!user) {
      await ctx.answerCallbackQuery();
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
      if (!(provider in providerPaymentUseCases)) {
        throw new Error(`Unsupported billing provider: ${provider}`);
      }

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
        `telegram:${user.id}:${plan.id}:${provider}`,
      );

      const PaymentUseCase =
        providerPaymentUseCases[
          provider as keyof typeof providerPaymentUseCases
        ];
      const paymentUseCase = container.resolve(PaymentUseCase as any) as {
        execute(input: { invoiceId: string }): Promise<{ paymentUrl: string }>;
      };
      const result = await paymentUseCase.execute({
        invoiceId: invoice.id,
      });
      paymentUrl = result.paymentUrl;
    } catch (error) {
      console.error(`Payment creation error for ${provider}:`, error);
    }

    if (paymentUrl) {
      const text = isUz
        ? `✅ <b>To'lov yaratildi</b>\n\nProvayder: <b>${provider.toUpperCase()}</b>\nReja: <b>${plan.name}</b>\nNarxi: ${parseFloat(plan.price).toLocaleString()} ${plan.currency}\n\nQuyidagi tugma orqali to'lovni amalga oshiring:`
        : `✅ <b>Платёж создан</b>\n\nПровайдер: <b>${provider.toUpperCase()}</b>\nПлан: <b>${plan.name}</b>\nЦена: ${parseFloat(plan.price).toLocaleString()} ${plan.currency}\n\nНажмите кнопку ниже для оплаты:`;

      const keyboard = new InlineKeyboard()
        .url(isUz ? "💳 To'lov qilish" : "💳 Оплатить", paymentUrl)
        .row()
        .text(isUz ? "🔙 Orqaga" : "🔙 Назад", `plan:select:${planId}`);

      await ctx.answerCallbackQuery();
      await ctx.editMessageText(text, {
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
    } else {
      const text = isUz
        ? `❌ <b>To'lov yaratilmadi</b>\n\nProvayder: <b>${provider.toUpperCase()}</b>\n\nIltimos, keyinroq urinib ko'ring yoki boshqa provayderni tanlang.`
        : `❌ <b>Платёж не создан</b>\n\nПровайдер: <b>${provider.toUpperCase()}</b>\n\nПожалуйста, попробуйте позже или выберите другого провайдера.`;

      const keyboard = new InlineKeyboard().text(
        isUz ? "🔙 Orqaga" : "🔙 Назад",
        `plan:select:${planId}`,
      );

      await ctx.answerCallbackQuery();
      await ctx.editMessageText(text, {
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
    }
  });
}
