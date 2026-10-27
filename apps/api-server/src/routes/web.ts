import bcrypt from "bcrypt";
import { createHash, randomUUID } from "node:crypto";
import { and, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { z } from "zod";
import {
  db,
  episodesTable,
  favoritesTable,
  genresTable,
  movieGenresTable,
  moviesTable,
  seasonsTable,
  seriesGenresTable,
  seriesTable,
  subscriptionPlansTable,
  subscriptionsTable,
  userProfilesTable,
  usersTable,
  watchProgressTable,
  webRefreshSessionsTable,
} from "@workspace/db";
import { authRateLimit } from "@/shared/middleware";
import {
  JwtService,
  type JwtPayload,
} from "@/modules/identity/infrastructure/services/jwt.service";
import { storage } from "@/infrastructure/storage/minio";
import { AuthUser } from "@/lib/auth";

const router = Router();
const jwtService = JwtService.getInstance();

function routeParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
): void {
  res.status(status).json({ success: false, error: { code, message } });
}

function requireWebAuth(req: Request, res: Response, next: NextFunction): void {
  void (async () => {
    const authorization = req.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) {
      sendError(res, 401, "UNAUTHORIZED", "Authentication required");
      return;
    }

    let decoded: JwtPayload;
    try {
      decoded = await jwtService.verify(
        authorization.slice(7),
        "access",
        "web",
      );
    } catch {
      sendError(res, 401, "UNAUTHORIZED", "Invalid or expired Web token");
      return;
    }
    if (!decoded.sessionId) {
      sendError(res, 401, "UNAUTHORIZED", "Web session is missing");
      return;
    }

    try {
      const [session] = await db
        .select({ id: webRefreshSessionsTable.id })
        .from(webRefreshSessionsTable)
        .where(
          and(
            eq(webRefreshSessionsTable.id, decoded.sessionId),
            eq(webRefreshSessionsTable.userId, decoded.sub),
            isNull(webRefreshSessionsTable.revokedAt),
            gt(webRefreshSessionsTable.expiresAt, new Date()),
            gt(webRefreshSessionsTable.absoluteExpiresAt, new Date()),
          ),
        )
        .limit(1);
      if (!session) {
        sendError(
          res,
          401,
          "UNAUTHORIZED",
          "Web session has been revoked or expired",
        );
        return;
      }
      const [user] = await db
        .select({
          id: usersTable.id,
          email: usersTable.email,
          firstName: usersTable.firstName,
          lastName: usersTable.lastName,
          isActive: usersTable.isActive,
          isBlocked: usersTable.isBlocked,
        })
        .from(usersTable)
        .where(
          and(eq(usersTable.id, decoded.sub), isNull(usersTable.deletedAt)),
        )
        .limit(1);

      if (!user || !user.isActive || user.isBlocked) {
        sendError(res, 401, "UNAUTHORIZED", "Account is unavailable");
        return;
      }

      req.user = {
        id: user.id,
        email: user.email ?? undefined,
        name: [user.firstName, user.lastName].filter(Boolean).join(" "),
        role: "customer",
        permissions: [],
      } satisfies AuthUser;
      next();
    } catch (error) {
      next(error);
    }
  })();
}

function createTokens(
  user: { id: string; email: string; name: string },
  sessionId: string,
) {
  const payload = {
    sub: user.id,
    email: user.email,
    role: "customer",
    permissions: [] as string[],
    audience: "web" as const,
    sessionId,
  };
  return {
    accessToken: jwtService.generateAccessToken(payload),
    refreshToken: jwtService.generateRefreshToken(payload),
    expiresIn: 3600,
    user: { ...user, role: "customer", plan: "basic" },
  };
}

function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function issueTokens(user: { id: string; email: string; name: string }) {
  const now = Date.now();
  const sessionId = randomUUID();
  const tokens = createTokens(user, sessionId);
  await db.insert(webRefreshSessionsTable).values({
    id: sessionId,
    userId: user.id,
    tokenHash: hashRefreshToken(tokens.refreshToken),
    expiresAt: new Date(now + 7 * 24 * 60 * 60 * 1000),
    absoluteExpiresAt: new Date(now + 30 * 24 * 60 * 60 * 1000),
  });
  return tokens;
}

const registerBody = z.object({
  email: z.string().email().max(254),
  password: z.string().min(12).max(128),
  name: z.string().trim().min(1).max(120),
});
const loginBody = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
});

router.post("/auth/register", authRateLimit, async (req, res, next) => {
  try {
    const parsed = registerBody.safeParse(req.body);
    if (!parsed.success) {
      sendError(
        res,
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid registration",
      );
      return;
    }
    const email = parsed.data.email.trim().toLowerCase();
    const [existing] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(
        and(
          sql`lower(${usersTable.email}) = ${email}`,
          isNull(usersTable.deletedAt),
        ),
      )
      .limit(1);
    if (existing) {
      sendError(
        res,
        409,
        "EMAIL_IN_USE",
        "An account with this email already exists",
      );
      return;
    }

    const passwordHash = await bcrypt.hash(
      parsed.data.password,
      Number(process.env.BCRYPT_SALT_ROUNDS || 12),
    );
    const nameParts = parsed.data.name.trim().split(/\s+/, 2);
    const [user] = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(usersTable)
        .values({
          email,
          passwordHash,
          firstName: nameParts[0],
          lastName: nameParts[1] ?? null,
          role: "user",
        })
        .returning({
          id: usersTable.id,
          email: usersTable.email,
          firstName: usersTable.firstName,
          lastName: usersTable.lastName,
        });
      await tx
        .insert(userProfilesTable)
        .values({ userId: created.id, displayName: parsed.data.name.trim() });
      return [created];
    });
    res.status(201).json(
      await issueTokens({
        id: user.id,
        email: user.email!,
        name: [user.firstName, user.lastName].filter(Boolean).join(" "),
      }),
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "23505"
    ) {
      sendError(
        res,
        409,
        "EMAIL_IN_USE",
        "An account with this email already exists",
      );
      return;
    }
    next(error);
  }
});

router.post("/auth/login", authRateLimit, async (req, res, next) => {
  try {
    const parsed = loginBody.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "VALIDATION_ERROR", "Email or password is invalid");
      return;
    }
    const email = parsed.data.email.trim().toLowerCase();
    const [user] = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        passwordHash: usersTable.passwordHash,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        isActive: usersTable.isActive,
        isBlocked: usersTable.isBlocked,
      })
      .from(usersTable)
      .where(
        and(
          sql`lower(${usersTable.email}) = ${email}`,
          isNull(usersTable.deletedAt),
        ),
      )
      .limit(1);
    if (
      !user?.passwordHash ||
      !user.isActive ||
      user.isBlocked ||
      !(await bcrypt.compare(parsed.data.password, user.passwordHash))
    ) {
      sendError(res, 401, "AUTH_FAILED", "Invalid email or password");
      return;
    }
    await db
      .update(usersTable)
      .set({ lastLoginAt: new Date() })
      .where(eq(usersTable.id, user.id));
    res.json(
      await issueTokens({
        id: user.id,
        email: user.email!,
        name: [user.firstName, user.lastName].filter(Boolean).join(" "),
      }),
    );
  } catch (error) {
    next(error);
  }
});

router.post("/auth/refresh", authRateLimit, async (req, res, next) => {
  try {
    const parsed = z
      .object({ refreshToken: z.string().min(1).max(8192) })
      .safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 401, "UNAUTHORIZED", "A valid refresh token is required");
      return;
    }
    let decoded: JwtPayload;
    try {
      decoded = await jwtService.verify(
        parsed.data.refreshToken,
        "refresh",
        "web",
      );
    } catch {
      sendError(
        res,
        401,
        "UNAUTHORIZED",
        "Invalid or expired Web refresh token",
      );
      return;
    }
    if (!decoded.sessionId) {
      sendError(res, 401, "UNAUTHORIZED", "Web refresh session is missing");
      return;
    }
    const [user] = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        isActive: usersTable.isActive,
        isBlocked: usersTable.isBlocked,
      })
      .from(usersTable)
      .where(and(eq(usersTable.id, decoded.sub), isNull(usersTable.deletedAt)))
      .limit(1);
    if (!user?.email || !user.isActive || user.isBlocked) {
      sendError(res, 401, "UNAUTHORIZED", "Account is unavailable");
      return;
    }
    const userData = {
      id: user.id,
      email: user.email,
      name: [user.firstName, user.lastName].filter(Boolean).join(" "),
    };
    const now = new Date();
    const replacement = await db.transaction(async (tx) => {
      const [oldSession] = await tx
        .update(webRefreshSessionsTable)
        .set({ revokedAt: now })
        .where(
          and(
            eq(webRefreshSessionsTable.userId, user.id),
            eq(webRefreshSessionsTable.id, decoded.sessionId ?? ""),
            eq(
              webRefreshSessionsTable.tokenHash,
              hashRefreshToken(parsed.data.refreshToken),
            ),
            isNull(webRefreshSessionsTable.revokedAt),
            gt(webRefreshSessionsTable.expiresAt, now),
            gt(webRefreshSessionsTable.absoluteExpiresAt, now),
          ),
        )
        .returning({
          id: webRefreshSessionsTable.id,
          absoluteExpiresAt: webRefreshSessionsTable.absoluteExpiresAt,
        });
      if (!oldSession) return null;
      const newSessionId = randomUUID();
      const replacementTokens = createTokens(userData, newSessionId);
      await tx.insert(webRefreshSessionsTable).values({
        id: newSessionId,
        userId: user.id,
        tokenHash: hashRefreshToken(replacementTokens.refreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        absoluteExpiresAt: oldSession.absoluteExpiresAt,
      });
      return replacementTokens;
    });
    if (!replacement) {
      sendError(
        res,
        401,
        "UNAUTHORIZED",
        "Refresh token was already used or revoked",
      );
      return;
    }
    res.json(replacement);
  } catch (error) {
    next(error);
  }
});

router.post("/auth/logout", authRateLimit, async (req, res, next) => {
  try {
    const parsed = z
      .object({ refreshToken: z.string().min(1).max(8192) })
      .safeParse(req.body);
    if (parsed.success) {
      let decoded: JwtPayload | undefined;
      try {
        decoded = await jwtService.verify(
          parsed.data.refreshToken,
          "refresh",
          "web",
        );
      } catch {
        decoded = undefined;
      }
      if (decoded?.sessionId) {
        await db
          .update(webRefreshSessionsTable)
          .set({ revokedAt: new Date() })
          .where(
            and(
              eq(webRefreshSessionsTable.userId, decoded.sub),
              eq(webRefreshSessionsTable.id, decoded.sessionId),
              eq(
                webRefreshSessionsTable.tokenHash,
                hashRefreshToken(parsed.data.refreshToken),
              ),
              isNull(webRefreshSessionsTable.revokedAt),
            ),
          );
      }
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.get("/auth/me", requireWebAuth, async (req, res, next) => {
  try {
    const [[profile], [user], [subscription]] = await Promise.all([
      db
        .select({
          displayName: userProfilesTable.displayName,
          avatar: userProfilesTable.avatar,
        })
        .from(userProfilesTable)
        .where(eq(userProfilesTable.userId, req.user!.id))
        .limit(1),
      db
        .select({
          id: usersTable.id,
          email: usersTable.email,
          firstName: usersTable.firstName,
          lastName: usersTable.lastName,
          createdAt: usersTable.createdAt,
        })
        .from(usersTable)
        .where(eq(usersTable.id, req.user!.id))
        .limit(1),
      db
        .select({ tier: subscriptionPlansTable.tier })
        .from(subscriptionsTable)
        .innerJoin(
          subscriptionPlansTable,
          eq(subscriptionsTable.planId, subscriptionPlansTable.id),
        )
        .where(
          and(
            eq(subscriptionsTable.userId, req.user!.id),
            eq(subscriptionsTable.status, "active"),
            gt(subscriptionsTable.endDate, new Date()),
          ),
        )
        .orderBy(desc(subscriptionsTable.endDate))
        .limit(1),
    ]);
    res.json({
      id: user.id,
      email: user.email,
      name:
        profile?.displayName ||
        [user.firstName, user.lastName].filter(Boolean).join(" "),
      avatarUrl: profile?.avatar ?? null,
      role: "customer",
      plan: subscription?.tier ?? "basic",
      createdAt: user.createdAt,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/subscriptions/current", requireWebAuth, async (req, res, next) => {
  try {
    const [subscription] = await db
      .select({
        status: subscriptionsTable.status,
        expiresAt: subscriptionsTable.endDate,
        plan: subscriptionPlansTable.tier,
        planName: subscriptionPlansTable.name,
      })
      .from(subscriptionsTable)
      .innerJoin(
        subscriptionPlansTable,
        eq(subscriptionsTable.planId, subscriptionPlansTable.id),
      )
      .where(
        and(
          eq(subscriptionsTable.userId, req.user!.id),
          eq(subscriptionsTable.status, "active"),
          gt(subscriptionsTable.endDate, new Date()),
        ),
      )
      .orderBy(desc(subscriptionsTable.endDate))
      .limit(1);
    const active = Boolean(subscription);
    res.json({
      subscription: active
        ? {
            plan: subscription!.plan,
            planName: subscription!.planName,
            status: subscription!.status,
            expiresAt: subscription!.expiresAt.toISOString(),
            features: ["stream"],
          }
        : null,
      isPremium:
        active &&
        ["premium", "family"].includes(subscription!.plan.toLowerCase()),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/movies", async (_req, res, next) => {
  try {
    const movies = await db
      .select({
        id: moviesTable.id,
        title: moviesTable.title,
        description: moviesTable.description,
        releaseYear: moviesTable.releaseYear,
        duration: moviesTable.duration,
        ageRating: moviesTable.ageRating,
        posterUrl: moviesTable.posterUrl,
        backgroundUrl: moviesTable.backgroundUrl,
        trailerUrl: moviesTable.trailerUrl,
        ratingAvg: moviesTable.ratingAvg,
      })
      .from(moviesTable)
      .where(
        and(eq(moviesTable.isPublished, true), isNull(moviesTable.deletedAt)),
      )
      .orderBy(desc(moviesTable.createdAt));
    res.json({ data: movies });
  } catch (error) {
    next(error);
  }
});

router.get("/catalog", async (_req, res, next) => {
  try {
    const [movies, series] = await Promise.all([
      db
        .select({
          id: moviesTable.id,
          title: moviesTable.title,
          description: moviesTable.description,
          releaseYear: moviesTable.releaseYear,
          duration: moviesTable.duration,
          ageRating: moviesTable.ageRating,
          posterUrl: moviesTable.posterUrl,
          backgroundUrl: moviesTable.backgroundUrl,
          ratingAvg: moviesTable.ratingAvg,
        })
        .from(moviesTable)
        .where(
          and(eq(moviesTable.isPublished, true), isNull(moviesTable.deletedAt)),
        )
        .orderBy(desc(moviesTable.createdAt)),
      db
        .select({
          id: seriesTable.id,
          title: seriesTable.title,
          description: seriesTable.description,
          releaseYear: seriesTable.releaseYear,
          ageRating: seriesTable.ageRating,
          posterUrl: seriesTable.posterUrl,
          backgroundUrl: seriesTable.backgroundUrl,
          seasonsCount: seriesTable.seasonsCount,
          ratingAvg: seriesTable.ratingAvg,
        })
        .from(seriesTable)
        .where(
          and(eq(seriesTable.isPublished, true), isNull(seriesTable.deletedAt)),
        )
        .orderBy(desc(seriesTable.createdAt)),
    ]);
    res.json({ data: { movies, series } });
  } catch (error) {
    next(error);
  }
});

router.get("/series", async (_req, res, next) => {
  try {
    const series = await db
      .select({
        id: seriesTable.id,
        title: seriesTable.title,
        description: seriesTable.description,
        releaseYear: seriesTable.releaseYear,
        ageRating: seriesTable.ageRating,
        posterUrl: seriesTable.posterUrl,
        backgroundUrl: seriesTable.backgroundUrl,
        seasonsCount: seriesTable.seasonsCount,
        ratingAvg: seriesTable.ratingAvg,
      })
      .from(seriesTable)
      .where(
        and(eq(seriesTable.isPublished, true), isNull(seriesTable.deletedAt)),
      )
      .orderBy(desc(seriesTable.createdAt));
    res.json({ data: series });
  } catch (error) {
    next(error);
  }
});

router.get("/series/:id", async (req, res, next) => {
  try {
    const id = routeParam(req.params.id);
    const [series] = await db
      .select({
        id: seriesTable.id,
        title: seriesTable.title,
        description: seriesTable.description,
        releaseYear: seriesTable.releaseYear,
        ageRating: seriesTable.ageRating,
        posterUrl: seriesTable.posterUrl,
        backgroundUrl: seriesTable.backgroundUrl,
        seasonsCount: seriesTable.seasonsCount,
        ratingAvg: seriesTable.ratingAvg,
      })
      .from(seriesTable)
      .where(
        and(
          eq(seriesTable.id, id),
          eq(seriesTable.isPublished, true),
          isNull(seriesTable.deletedAt),
        ),
      )
      .limit(1);
    if (!series) {
      sendError(res, 404, "SERIES_NOT_FOUND", "Series not found");
      return;
    }
    const seasons = await db
      .select()
      .from(seasonsTable)
      .where(
        and(eq(seasonsTable.seriesId, id), isNull(seasonsTable.deletedAt)),
      );
    const seasonIds = seasons.map((season) => season.id);
    const episodes = seasonIds.length
      ? await db
          .select()
          .from(episodesTable)
          .where(
            and(
              inArray(episodesTable.seasonId, seasonIds),
              eq(episodesTable.isPublished, true),
              isNull(episodesTable.deletedAt),
            ),
          )
      : [];
    res.json({ data: { ...series, seasons, episodes } });
  } catch (error) {
    next(error);
  }
});

router.get("/genres", async (_req, res, next) => {
  try {
    const genres = await db
      .select({
        id: genresTable.id,
        name: genresTable.name,
        slug: genresTable.slug,
      })
      .from(genresTable)
      .where(isNull(genresTable.deletedAt))
      .orderBy(genresTable.name);
    res.json({ data: genres });
  } catch (error) {
    next(error);
  }
});

router.get("/plans", async (_req, res, next) => {
  try {
    const plans = await db
      .select({
        id: subscriptionPlansTable.id,
        name: subscriptionPlansTable.name,
        tier: subscriptionPlansTable.tier,
        description: subscriptionPlansTable.description,
        price: subscriptionPlansTable.price,
        currency: subscriptionPlansTable.currency,
        durationDays: subscriptionPlansTable.durationDays,
        maxDevices: subscriptionPlansTable.maxDevices,
      })
      .from(subscriptionPlansTable)
      .where(
        and(
          eq(subscriptionPlansTable.isActive, true),
          isNull(subscriptionPlansTable.deletedAt),
        ),
      )
      .orderBy(subscriptionPlansTable.price);
    res.json({ data: plans });
  } catch (error) {
    next(error);
  }
});

router.get("/profile", requireWebAuth, async (req, res, next) => {
  try {
    const [profile] = await db
      .select({
        displayName: userProfilesTable.displayName,
        avatar: userProfilesTable.avatar,
        createdAt: userProfilesTable.createdAt,
      })
      .from(userProfilesTable)
      .where(eq(userProfilesTable.userId, req.user!.id))
      .limit(1);
    const [user] = await db
      .select({ id: usersTable.id, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, req.user!.id))
      .limit(1);
    res.json({
      id: user.id,
      fullName: profile?.displayName ?? null,
      avatarUrl: profile?.avatar ?? null,
      plan: "basic",
      createdAt: profile?.createdAt ?? new Date(),
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/profile", requireWebAuth, async (req, res, next) => {
  try {
    const parsed = z
      .object({
        fullName: z.string().trim().min(1).max(120).optional(),
        avatarUrl: z.string().url().max(2048).nullable().optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "VALIDATION_ERROR", "Invalid profile update");
      return;
    }
    const [profile] = await db
      .update(userProfilesTable)
      .set({
        ...(parsed.data.fullName !== undefined
          ? { displayName: parsed.data.fullName }
          : {}),
        ...(parsed.data.avatarUrl !== undefined
          ? { avatar: parsed.data.avatarUrl }
          : {}),
      })
      .where(eq(userProfilesTable.userId, req.user!.id))
      .returning({
        id: userProfilesTable.id,
        displayName: userProfilesTable.displayName,
        avatar: userProfilesTable.avatar,
        createdAt: userProfilesTable.createdAt,
      });
    if (!profile) {
      sendError(res, 404, "PROFILE_NOT_FOUND", "Profile not found");
      return;
    }
    res.json({
      id: profile.id,
      fullName: profile.displayName,
      avatarUrl: profile.avatar,
      plan: "basic",
      createdAt: profile.createdAt,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/watchlist", requireWebAuth, async (req, res, next) => {
  try {
    const items = await db
      .select({
        id: favoritesTable.id,
        contentId: favoritesTable.contentId,
        contentType: favoritesTable.contentType,
        createdAt: favoritesTable.createdAt,
      })
      .from(favoritesTable)
      .where(
        and(
          eq(favoritesTable.userId, req.user!.id),
          isNull(favoritesTable.deletedAt),
        ),
      );
    res.json({ data: items });
  } catch (error) {
    next(error);
  }
});

router.post("/watchlist/toggle", requireWebAuth, async (req, res, next) => {
  try {
    const parsed = z
      .object({
        contentId: z.string().min(1).max(128),
        contentType: z.enum(["movie", "series"]),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "VALIDATION_ERROR", "Invalid watchlist item");
      return;
    }
    const [existing] = await db
      .select()
      .from(favoritesTable)
      .where(
        and(
          eq(favoritesTable.userId, req.user!.id),
          eq(favoritesTable.contentId, parsed.data.contentId),
          eq(favoritesTable.contentType, parsed.data.contentType),
        ),
      )
      .limit(1);
    if (existing && !existing.deletedAt) {
      await db
        .update(favoritesTable)
        .set({ deletedAt: new Date() })
        .where(eq(favoritesTable.id, existing.id));
      res.json({ action: "removed" });
      return;
    }
    if (existing) {
      const [restored] = await db
        .update(favoritesTable)
        .set({ deletedAt: null })
        .where(eq(favoritesTable.id, existing.id))
        .returning();
      res.json({
        action: "added",
        item: {
          id: restored.id,
          contentId: restored.contentId,
          contentType: restored.contentType,
          createdAt: restored.createdAt,
        },
      });
      return;
    }
    const [created] = await db
      .insert(favoritesTable)
      .values({
        userId: req.user!.id,
        contentId: parsed.data.contentId,
        contentType: parsed.data.contentType,
      })
      .returning();
    res.status(201).json({
      action: "added",
      item: {
        id: created.id,
        contentId: created.contentId,
        contentType: created.contentType,
        createdAt: created.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/watchlist/:id", requireWebAuth, async (req, res, next) => {
  try {
    await db
      .update(favoritesTable)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(favoritesTable.id, routeParam(req.params.id)),
          eq(favoritesTable.userId, req.user!.id),
          isNull(favoritesTable.deletedAt),
        ),
      );
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

router.get("/history", requireWebAuth, async (req, res, next) => {
  try {
    const rows = await db
      .select({
        id: watchProgressTable.id,
        contentId: watchProgressTable.contentId,
        contentType: watchProgressTable.contentType,
        progress: watchProgressTable.completedPercent,
        watchedAt: watchProgressTable.updatedAt,
      })
      .from(watchProgressTable)
      .where(eq(watchProgressTable.userId, req.user!.id))
      .orderBy(desc(watchProgressTable.updatedAt));
    res.json({ data: rows.map((row) => ({ ...row, episode: null })) });
  } catch (error) {
    next(error);
  }
});

router.put("/history", requireWebAuth, async (req, res, next) => {
  try {
    const parsed = z
      .object({
        contentId: z.string().min(1).max(128),
        contentType: z.enum(["movie", "series"]),
        progress: z.number().min(0).max(100),
        episode: z.string().max(64).nullable().optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "VALIDATION_ERROR", "Invalid watch history entry");
      return;
    }
    const [saved] = await db
      .insert(watchProgressTable)
      .values({
        userId: req.user!.id,
        contentId: parsed.data.contentId,
        contentType: parsed.data.contentType,
        completedPercent: Math.round(parsed.data.progress),
      })
      .onConflictDoUpdate({
        target: [
          watchProgressTable.userId,
          watchProgressTable.contentId,
          watchProgressTable.contentType,
        ],
        set: {
          completedPercent: Math.round(parsed.data.progress),
          updatedAt: new Date(),
        },
      })
      .returning();
    res.json({
      id: saved.id,
      contentId: saved.contentId,
      contentType: saved.contentType,
      progress: saved.completedPercent,
      episode: null,
      watchedAt: saved.updatedAt,
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/history/:id", requireWebAuth, async (req, res, next) => {
  try {
    await db
      .delete(watchProgressTable)
      .where(
        and(
          eq(watchProgressTable.id, routeParam(req.params.id)),
          eq(watchProgressTable.userId, req.user!.id),
        ),
      );
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

router.delete("/history", requireWebAuth, async (req, res, next) => {
  try {
    await db
      .delete(watchProgressTable)
      .where(eq(watchProgressTable.userId, req.user!.id));
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

router.get("/movies/:id", async (req, res, next) => {
  try {
    const [movie] = await db
      .select({
        id: moviesTable.id,
        title: moviesTable.title,
        description: moviesTable.description,
        releaseYear: moviesTable.releaseYear,
        duration: moviesTable.duration,
        ageRating: moviesTable.ageRating,
        posterUrl: moviesTable.posterUrl,
        backgroundUrl: moviesTable.backgroundUrl,
        trailerUrl: moviesTable.trailerUrl,
        ratingAvg: moviesTable.ratingAvg,
      })
      .from(moviesTable)
      .where(
        and(
          eq(moviesTable.id, routeParam(req.params.id)),
          eq(moviesTable.isPublished, true),
          isNull(moviesTable.deletedAt),
        ),
      )
      .limit(1);
    if (!movie) {
      sendError(res, 404, "MOVIE_NOT_FOUND", "Movie not found");
      return;
    }
    res.json({ data: movie });
  } catch (error) {
    next(error);
  }
});

router.get("/movies/:id/stream", requireWebAuth, async (req, res, next) => {
  try {
    const [subscription] = await db
      .select({ tier: subscriptionPlansTable.tier })
      .from(subscriptionsTable)
      .innerJoin(
        subscriptionPlansTable,
        eq(subscriptionsTable.planId, subscriptionPlansTable.id),
      )
      .where(
        and(
          eq(subscriptionsTable.userId, req.user!.id),
          eq(subscriptionsTable.status, "active"),
          gt(subscriptionsTable.endDate, new Date()),
        ),
      )
      .orderBy(desc(subscriptionsTable.endDate))
      .limit(1);
    if (
      !subscription ||
      !["premium", "family"].includes(subscription.tier.toLowerCase())
    ) {
      sendError(res, 403, "PREMIUM_REQUIRED", "Premium subscription required");
      return;
    }

    const [movie] = await db
      .select({
        id: moviesTable.id,
        sourceType: moviesTable.sourceType,
        storageKey: moviesTable.storageKey,
      })
      .from(moviesTable)
      .where(
        and(
          eq(moviesTable.id, routeParam(req.params.id)),
          eq(moviesTable.isPublished, true),
          isNull(moviesTable.deletedAt),
        ),
      )
      .limit(1);
    if (!movie) {
      sendError(res, 404, "MOVIE_NOT_FOUND", "Movie not found");
      return;
    }
    if (
      !["s3", "minio"].includes(movie.sourceType.toLowerCase()) ||
      !movie.storageKey ||
      !(process.env.S3_ACCESS_KEY_ID || process.env.MINIO_ACCESS_KEY)
    ) {
      sendError(
        res,
        503,
        "STREAM_UNAVAILABLE",
        "This movie is not available for Web streaming yet",
      );
      return;
    }

    const bucket = process.env.VIDEO_BUCKET || "videos";
    const key = movie.storageKey.replace(/^\/+/, "");
    const streamUrl = await storage.getPresignedUrl(bucket, key, 300);
    res.json({
      streamUrl,
      expiresAt: new Date(Date.now() + 300_000).toISOString(),
      quality: "auto",
    });
  } catch (error) {
    next(error);
  }
});

export default router;
