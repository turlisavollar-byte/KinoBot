import { type Bot, InlineKeyboard } from "grammy";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import {
  actorsTable,
  db,
  movieActorsTable,
  moviesTable,
  telegramConfigTable,
  videoCodesTable,
} from "@workspace/db";
import type { BotContext } from "@/bot/index";
import { logger } from "@/lib/logger";
import { deliverVideoCodeByDeeplink } from "@/bot/handlers/catalog";

const MAX_FILMOGRAPHY_ITEMS = 20;
const MAX_CODES_PER_MOVIE = 8;
const MAX_PROFILE_CODE_BUTTONS = 20;

interface ActorMovieItem {
  movieId: string;
  title: string;
  releaseYear: number | null;
  role: string | null;
  codes: Array<{ code: string; status: string }>;
}

export function escapeActorText(value: string): string {
  return value.replace(/[&<>"']/g, (character) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
      character
    ] ?? character,
  );
}

export function formatActorProfileText(
  actor: { name: string; biography: string | null; birthDate: string | null; birthPlace: string | null },
  movies: ActorMovieItem[],
  isUz: boolean,
): string {
  const lines = [
    `🎭 <b>${escapeActorText(actor.name)}</b>`,
  ];
  if (actor.birthDate) {
    lines.push(`${isUz ? "📅 Tug'ilgan sana" : "📅 Дата рождения"}: ${escapeActorText(actor.birthDate)}`);
  }
  if (actor.birthPlace) {
    lines.push(`${isUz ? "📍 Tug'ilgan joy" : "📍 Место рождения"}: ${escapeActorText(actor.birthPlace)}`);
  }
  if (actor.biography) {
    lines.push(
      "",
      isUz ? "📖 <b>Biografiya</b>" : "📖 <b>Биография</b>",
      escapeActorText(actor.biography.slice(0, 900)),
    );
  }

  lines.push(
    "",
    isUz
      ? `🎬 <b>Filmografiya (${movies.length})</b>`
      : `🎬 <b>Фильмография (${movies.length})</b>`,
  );

  if (movies.length === 0) {
    lines.push(isUz ? "Hozircha filmlar biriktirilmagan." : "Фильмы пока не добавлены.");
    return lines.join("\n").slice(0, 3900);
  }

  for (const [index, movie] of movies.slice(0, MAX_FILMOGRAPHY_ITEMS).entries()) {
    const year = movie.releaseYear ? ` (${movie.releaseYear})` : "";
    lines.push(
      "",
      `${index + 1}. <b>${escapeActorText(movie.title)}${year}</b>`,
    );
    if (movie.role) {
      lines.push(
        `${isUz ? "🎭 Roli" : "🎭 Роль"}: ${escapeActorText(movie.role)}`,
      );
    }
    if (movie.codes.length > 0) {
      lines.push(
        `${isUz ? "🔑 Kodlar" : "🔑 Коды"}: ${movie.codes
          .slice(0, MAX_CODES_PER_MOVIE)
          .map((item) => `<code>${escapeActorText(item.code)}</code>`)
          .join(", ")}`,
      );
    } else {
      lines.push(isUz ? "🔑 Faol kod yo'q" : "🔑 Нет активного кода");
    }
    if (lines.join("\n").length > 3700) break;
  }

  if (movies.length > MAX_FILMOGRAPHY_ITEMS) {
    lines.push(
      "",
      isUz ? "Qolgan filmlar bot menyusidagi katalogda." : "Другие фильмы доступны в каталоге бота.",
    );
  }
  return lines.join("\n").slice(0, 3900);
}

async function loadActorProfile(actorId: string) {
  const [actor] = await db
    .select()
    .from(actorsTable)
    .where(and(eq(actorsTable.id, actorId), sql`${actorsTable.deletedAt} IS NULL`))
    .limit(1);
  if (!actor) return null;

  const movieRows = await db
    .select({
      movieId: moviesTable.id,
      title: moviesTable.title,
      releaseYear: moviesTable.releaseYear,
      role: movieActorsTable.role,
    })
    .from(movieActorsTable)
    .innerJoin(moviesTable, eq(movieActorsTable.movieId, moviesTable.id))
    .where(
      and(
        eq(movieActorsTable.actorId, actorId),
        eq(moviesTable.isPublished, true),
        sql`${moviesTable.deletedAt} IS NULL`,
      ),
    )
    .orderBy(asc(moviesTable.releaseYear), asc(moviesTable.title));

  const movieIds = movieRows.map((movie) => movie.movieId);
  const codeRows = movieIds.length
    ? await db
        .select({
          movieId: videoCodesTable.movieId,
          code: videoCodesTable.code,
          status: videoCodesTable.status,
        })
        .from(videoCodesTable)
        .where(
          and(
            inArray(videoCodesTable.movieId, movieIds),
            eq(videoCodesTable.status, "active"),
          ),
        )
        .orderBy(asc(videoCodesTable.code))
    : [];

  const codesByMovie = new Map<string, Array<{ code: string; status: string }>>();
  for (const row of codeRows) {
    if (!row.movieId) continue;
    const codes = codesByMovie.get(row.movieId) ?? [];
    codes.push({ code: row.code, status: row.status });
    codesByMovie.set(row.movieId, codes);
  }

  return {
    actor,
    movies: movieRows.map((movie) => ({
      ...movie,
      codes: codesByMovie.get(movie.movieId) ?? [],
    })),
  };
}

export async function sendActorProfile(
  bot: Bot<BotContext>,
  ctx: BotContext,
  actorId: string,
): Promise<void> {
  const isUz = ctx.session.language === "uz";
  const profile = await loadActorProfile(actorId);
  if (!profile) {
    await ctx.reply(isUz ? "Aktyor topilmadi." : "Актёр не найден.");
    return;
  }

  const text = formatActorProfileText(
    {
      name: profile.actor.name,
      biography: profile.actor.biography,
      birthDate: profile.actor.birthDate,
      birthPlace: profile.actor.birthPlace,
    },
    profile.movies,
    isUz,
  );
  const keyboard = new InlineKeyboard();
  let buttonsInRow = 0;
  let codeButtons = 0;
  for (const movie of profile.movies.slice(0, MAX_FILMOGRAPHY_ITEMS)) {
    for (const code of movie.codes.slice(0, MAX_CODES_PER_MOVIE)) {
      if (codeButtons >= MAX_PROFILE_CODE_BUTTONS) break;
      keyboard.text(`▶️ ${code.code}`, `actor:code:${code.code}`);
      buttonsInRow += 1;
      codeButtons += 1;
      if (buttonsInRow === 2) {
        keyboard.row();
        buttonsInRow = 0;
      }
    }
    if (codeButtons >= MAX_PROFILE_CODE_BUTTONS) break;
  }

  const [config] = await db.select({ botUsername: telegramConfigTable.botUsername }).from(telegramConfigTable).limit(1);
  if (config?.botUsername) {
    if (buttonsInRow > 0) keyboard.row();
    keyboard.url(
      isUz ? "🔗 Aktyorni ulashish" : "🔗 Поделиться актёром",
      `https://t.me/${config.botUsername.replace(/^@/, "")}?start=actor_${profile.actor.id}`,
    );
  }
  keyboard.row().text(isUz ? "📱 Menyu" : "📱 Меню", "menu:main");

  if (profile.actor.photoUrl) {
    try {
      await ctx.replyWithPhoto(profile.actor.photoUrl, {
        caption: `🎭 <b>${escapeActorText(profile.actor.name)}</b>`,
        parse_mode: "HTML",
      });
    } catch (error) {
      logger.warn(
        { actorId, error: error instanceof Error ? error.message : String(error) },
        "Failed to send actor photo in bot profile",
      );
    }
  }
  await ctx.reply(text, { parse_mode: "HTML", reply_markup: keyboard });
}

export function registerActorHandler(bot: Bot<BotContext>): void {
  bot.callbackQuery(/^actor:view:([0-9a-f-]{36})$/i, async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendActorProfile(bot, ctx, ctx.match[1]);
  });

  bot.callbackQuery(/^actor:code:([A-Z0-9]{4,6})$/i, async (ctx) => {
    await ctx.answerCallbackQuery();
    await deliverVideoCodeByDeeplink(bot, ctx, ctx.match[1]);
  });
}
