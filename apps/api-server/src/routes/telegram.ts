import { Router, type IRouter } from "express";
import { eq, count, sql } from "drizzle-orm";
import {
  db,
  telegramConfigTable,
  telegramChannelsTable,
  usersTable,
  telegramMessagesTable,
} from "@workspace/db";
import {
  UpdateTelegramConfigBody,
  CreateTelegramChannelBody,
} from "@workspace/api-zod";
import { requireAuth, requirePermission } from "@/lib/auth";
import { Permission } from "@/shared/constants/permissions";
import { startBot, stopBot, isBotRunning } from "@/bot/index";
import { getRecentFileIds } from "@/bot/handlers/storage";

const router: IRouter = Router();
router.use(requireAuth);

router.get(
  "/telegram/config",
  requirePermission(Permission.READ_TELEGRAM),
  async (_req, res): Promise<void> => {
    let [config] = await db.select().from(telegramConfigTable).limit(1);
    if (!config) {
      [config] = await db.insert(telegramConfigTable).values({}).returning();
    }
    res.json({
      ...config,
      botToken: config.botToken ? "***configured***" : null,
    });
  },
);

router.patch(
  "/telegram/config",
  requirePermission(Permission.MANAGE_TELEGRAM),
  async (req, res): Promise<void> => {
    const body = UpdateTelegramConfigBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }

    let [existing] = await db.select().from(telegramConfigTable).limit(1);
    let config;

    // Auto-enable bot if token is provided and isActive is not explicitly set
    const updateData = { ...body.data };
    if (body.data.botToken && body.data.isActive === undefined) {
      updateData.isActive = true;
    }

    if (existing) {
      [config] = await db
        .update(telegramConfigTable)
        .set(updateData)
        .where(eq(telegramConfigTable.id, existing.id))
        .returning();
    } else {
      [config] = await db
        .insert(telegramConfigTable)
        .values(updateData)
        .returning();
    }

    // Restart bot if config changed (async, non-blocking)
    if (
      updateData.isActive !== undefined ||
      updateData.botToken !== undefined
    ) {
      startBot().catch(() => {});
    }

    res.json({
      ...config,
      botToken: config.botToken ? "***configured***" : null,
    });
  },
);

router.get(
  "/telegram/status",
  requirePermission(Permission.READ_TELEGRAM),
  async (_req, res): Promise<void> => {
    const [config] = await db.select().from(telegramConfigTable).limit(1);
    const [{ totalUsers }] = await db
      .select({ totalUsers: count() })
      .from(usersTable);
    const [{ totalMessages }] = await db
      .select({ totalMessages: count() })
      .from(telegramMessagesTable);
    const [{ storageFiles }] = await db
      .select({
        storageFiles: sql<number>`COALESCE(SUM(${telegramChannelsTable.filesCount}), 0)`,
      })
      .from(telegramChannelsTable);

    res.json({
      isOnline: isBotRunning(),
      botUsername: config?.botUsername ?? null,
      totalUsers,
      totalMessages,
      storageFilesCount: storageFiles ?? 0,
      lastActivity: config?.updatedAt ?? null,
    });
  },
);

// ─── Bot control ──────────────────────────────────────────────────────────────
router.post(
  "/telegram/bot/start",
  requirePermission(Permission.MANAGE_TELEGRAM),
  async (_req, res): Promise<void> => {
    await startBot();
    res.json({ running: isBotRunning() });
  },
);

router.post(
  "/telegram/bot/stop",
  requirePermission(Permission.MANAGE_TELEGRAM),
  async (_req, res): Promise<void> => {
    await stopBot();
    res.json({ running: false });
  },
);

// ─── Captured file_ids (for linking to content) ───────────────────────────────
router.get(
  "/telegram/file-ids",
  requirePermission(Permission.READ_TELEGRAM),
  (_req, res): void => {
    res.json(getRecentFileIds());
  },
);

// ─── Storage channels ─────────────────────────────────────────────────────────
router.get(
  "/telegram/channels",
  requirePermission(Permission.READ_TELEGRAM),
  async (_req, res): Promise<void> => {
    const channels = await db
      .select()
      .from(telegramChannelsTable)
      .where(sql`${telegramChannelsTable.deletedAt} IS NULL`)
      .orderBy(telegramChannelsTable.createdAt);
    res.json(channels);
  },
);

router.post(
  "/telegram/channels",
  requirePermission(Permission.MANAGE_TELEGRAM),
  async (req, res): Promise<void> => {
    const body = CreateTelegramChannelBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }
    const [channel] = await db
      .insert(telegramChannelsTable)
      .values(body.data)
      .returning();
    res.status(201).json(channel);
  },
);

// ─── Get bot's admin channels from Telegram API ───────────────────────────────
router.get(
  "/telegram/admin-channels",
  requirePermission(Permission.MANAGE_TELEGRAM),
  async (_req, res): Promise<void> => {
    const [config] = await db.select().from(telegramConfigTable).limit(1);
    if (!config?.botToken) {
      res.status(400).json({ error: "Bot token not configured" });
      return;
    }

    try {
      // Get bot info
      const botInfoResponse = await fetch(
        `https://api.telegram.org/bot${config.botToken}/getMe`,
      );
      const botInfoData = (await botInfoResponse.json()) as any;

      if (!botInfoData.ok) {
        res
          .status(400)
          .json({ error: "Failed to get bot info from Telegram API" });
        return;
      }

      const botId = botInfoData.result.id;
      const botUsername = botInfoData.result.username;

      // Get bot's admin channels using getChatAdministrators
      // Note: This requires the bot to be admin in the channels
      const adminChannels = [];

      // Get channels from database first
      const existingChannels = await db
        .select()
        .from(telegramChannelsTable)
        .where(sql`${telegramChannelsTable.deletedAt} IS NULL`);

      // For each existing channel, check if bot is admin
      for (const channel of existingChannels) {
        try {
          const chatResponse = await fetch(
            `https://api.telegram.org/bot${config.botToken}/getChatAdministrators?chat_id=${channel.channelId}`,
          );
          const chatData = (await chatResponse.json()) as any;

          if (chatData.ok) {
            const isAdmin = chatData.result.some(
              (admin: any) =>
                admin.user.id === botId &&
                (admin.status === "administrator" ||
                  admin.status === "creator"),
            );

            if (isAdmin) {
              adminChannels.push({
                channelId: channel.channelId,
                title: channel.title,
                type: channel.type,
                isActive: channel.isActive,
                filesCount: channel.filesCount,
                isBotAdmin: true,
              });
            }
          }
        } catch (error) {
          // Skip channels that fail to check
          console.error(
            `Failed to check admin status for channel ${channel.channelId}:`,
            error,
          );
        }
      }

      res.json({
        botId,
        botUsername,
        adminChannels,
        totalChannels: adminChannels.length,
        message:
          adminChannels.length === 0
            ? "No admin channels found. Add channels to the database first, then the bot will check if it has admin access."
            : undefined,
      });
    } catch (error) {
      console.error("Error fetching admin channels:", error);
      res.status(500).json({ error: "Failed to fetch admin channels" });
    }
  },
);

// ─── Check if bot is admin in a specific channel ───────────────────────────────
router.get("/telegram/check-channel-admin", async (req, res): Promise<void> => {
  const { channelId } = req.query;
  if (!channelId || typeof channelId !== "string") {
    res.status(400).json({ error: "channelId is required" });
    return;
  }

  const [config] = await db.select().from(telegramConfigTable).limit(1);
  if (!config?.botToken) {
    res.status(400).json({ error: "Bot token not configured" });
    return;
  }

  try {
    // Get bot info
    const botInfoResponse = await fetch(
      `https://api.telegram.org/bot${config.botToken}/getMe`,
    );
    const botInfoData = (await botInfoResponse.json()) as any;

    if (!botInfoData.ok) {
      res
        .status(400)
        .json({ error: "Failed to get bot info from Telegram API" });
      return;
    }

    const botId = botInfoData.result.id;

    // Check if bot is admin in the channel
    const chatResponse = await fetch(
      `https://api.telegram.org/bot${config.botToken}/getChatAdministrators?chat_id=${channelId}`,
    );
    const chatData = (await chatResponse.json()) as any;

    if (!chatData.ok) {
      res.status(400).json({
        error:
          "Failed to get channel info. Make sure the bot has access to this channel.",
      });
      return;
    }

    const isAdmin = chatData.result.some(
      (admin: any) =>
        admin.user.id === botId &&
        (admin.status === "administrator" || admin.status === "creator"),
    );

    // Get channel info
    const chatInfoResponse = await fetch(
      `https://api.telegram.org/bot${config.botToken}/getChat?chat_id=${channelId}`,
    );
    const chatInfoData = (await chatInfoResponse.json()) as any;

    if (!chatInfoData.ok) {
      res.status(400).json({ error: "Failed to get channel info" });
      return;
    }

    const channelTitle =
      chatInfoData.result.title || chatInfoData.result.username || channelId;

    res.json({
      isAdmin,
      channelId,
      title: channelTitle,
      botId,
    });
  } catch (error) {
    console.error("Error checking channel admin status:", error);
    res.status(500).json({ error: "Failed to check channel admin status" });
  }
});

export default router;
