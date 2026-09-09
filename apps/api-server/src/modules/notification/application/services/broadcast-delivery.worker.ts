import { and, eq, inArray, or, sql } from "drizzle-orm";
import {
  broadcastJobsTable,
  db,
  notificationTemplatesTable,
  notifications,
  usersTable,
} from "@workspace/db";
import { getBot } from "@/bot/index";
import { InlineKeyboard } from "grammy";
import { logger } from "@/lib/logger";

const POLL_INTERVAL_MS = 2_000;

export class BroadcastDeliveryWorker {
  private timer: ReturnType<typeof setInterval> | undefined;
  private processing = false;

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.processNext();
    }, POLL_INTERVAL_MS);
    void this.processNext();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  private async processNext(): Promise<void> {
    if (this.processing) return;
    const bot = getBot();
    if (!bot) return;

    this.processing = true;
    try {
      const [job] = await db
        .select()
        .from(broadcastJobsTable)
        .where(eq(broadcastJobsTable.status, "pending"))
        .orderBy(broadcastJobsTable.createdAt)
        .limit(1);
      if (!job) return;

      const [claimed] = await db
        .update(broadcastJobsTable)
        .set({ status: "processing", startedAt: new Date() })
        .where(
          and(
            eq(broadcastJobsTable.id, job.id),
            eq(broadcastJobsTable.status, "pending"),
          ),
        )
        .returning({ id: broadcastJobsTable.id });
      if (!claimed) return;

      try {
        await this.deliver(
          job.id,
          job.templateId,
          job.targetAudience,
          job.variables,
          bot,
        );
      } catch (error) {
        await this.finish(job.id, "failed");
        throw error;
      }
    } catch (error) {
      logger.error({ error }, "Broadcast delivery worker failed");
    } finally {
      this.processing = false;
    }
  }

  private async deliver(
    jobId: string,
    templateId: string,
    targetAudience: string,
    variables: string | null,
    bot: NonNullable<ReturnType<typeof getBot>>,
  ): Promise<void> {
    const [template] = await db
      .select()
      .from(notificationTemplatesTable)
      .where(eq(notificationTemplatesTable.id, templateId))
      .limit(1);
    if (!template || !template.isActive) {
      await this.finish(jobId, "failed");
      return;
    }

    const parsedAudience =
      targetAudience === "all" ? null : JSON.parse(targetAudience);
    const channelIds =
      parsedAudience?.type === "channels"
        ? (parsedAudience.ids as string[])
        : undefined;
    if (channelIds?.length) {
      const values = variables
        ? (JSON.parse(variables) as Record<string, unknown>)
        : {};
      const message = this.render(template.content, values);
      for (const channelId of channelIds) {
        try {
          await this.sendTemplate(bot, channelId, template, message);
          await this.increment(jobId, "sentCount");
        } catch (error) {
          logger.warn({ error, channelId, jobId }, "Broadcast channel failed");
          await this.increment(jobId, "failedCount");
        }
      }
      await this.finish(jobId, "completed");
      return;
    }
    const selectedIds =
      targetAudience === "all" ? undefined : (parsedAudience as string[]);
    const users = await db
      .select({ id: usersTable.id, telegramId: usersTable.telegramId })
      .from(usersTable)
      .where(
        selectedIds?.length
          ? and(
              or(
                inArray(usersTable.id, selectedIds),
                inArray(usersTable.telegramId, selectedIds),
              ),
              eq(usersTable.isActive, true),
            )
          : eq(usersTable.isActive, true),
      );
    const values = variables
      ? (JSON.parse(variables) as Record<string, unknown>)
      : {};
    const message = this.render(template.content, values);

    for (const user of users) {
      try {
        await this.sendTemplate(bot, user.telegramId, template, message);
        await db.insert(notifications).values({
          userId: user.id,
          type: "promotion",
          title: template.name,
          message,
          data: values,
        });
        await this.increment(jobId, "sentCount");
      } catch (error) {
        logger.warn(
          { error, telegramId: user.telegramId, jobId },
          "Broadcast recipient failed",
        );
        await this.increment(jobId, "failedCount");
      }
    }
    await this.finish(jobId, "completed");
  }

  private render(content: string, values: Record<string, unknown>): string {
    return content.replace(/\{\{(\w+)\}\}/g, (_match, key: string) =>
      String(values[key] ?? ""),
    );
  }

  private async sendTemplate(
    bot: NonNullable<ReturnType<typeof getBot>>,
    chatId: string,
    template: {
      contentType: string;
      mediaFileId: string | null;
      content: string;
      parseMode: string;
      buttons: Array<{ text: string; url: string }> | null;
    },
    content: string,
  ): Promise<void> {
    const replyMarkup = template.buttons?.length
      ? new InlineKeyboard(
          template.buttons.map((button) => [
            { text: button.text, url: button.url },
          ]),
        )
      : undefined;
    const parseMode = template.parseMode as "HTML" | "Markdown" | "MarkdownV2";
    if (template.contentType === "text") {
      await bot.api.sendMessage(chatId, content, {
        parse_mode: parseMode,
        reply_markup: replyMarkup,
      });
      return;
    }
    if (!template.mediaFileId) throw new Error("Media template has no file ID");
    const options = {
      caption: content,
      parse_mode: parseMode,
      reply_markup: replyMarkup,
    };
    switch (template.contentType) {
      case "photo":
        await bot.api.sendPhoto(chatId, template.mediaFileId, options);
        break;
      case "video":
        await bot.api.sendVideo(chatId, template.mediaFileId, options);
        break;
      case "animation":
        await bot.api.sendAnimation(chatId, template.mediaFileId, options);
        break;
      case "audio":
        await bot.api.sendAudio(chatId, template.mediaFileId, options);
        break;
      case "voice":
        await bot.api.sendVoice(chatId, template.mediaFileId, options);
        break;
      case "document":
        await bot.api.sendDocument(chatId, template.mediaFileId, options);
        break;
      default:
        throw new Error(
          `Unsupported template content type: ${template.contentType}`,
        );
    }
  }

  private async increment(
    jobId: string,
    field: "sentCount" | "failedCount",
  ): Promise<void> {
    const column =
      field === "sentCount"
        ? broadcastJobsTable.sentCount
        : broadcastJobsTable.failedCount;
    await db
      .update(broadcastJobsTable)
      .set({ [field]: sql`${column} + 1` } as never)
      .where(eq(broadcastJobsTable.id, jobId));
  }

  private async finish(
    jobId: string,
    status: "completed" | "failed",
  ): Promise<void> {
    await db
      .update(broadcastJobsTable)
      .set({ status, completedAt: new Date() })
      .where(eq(broadcastJobsTable.id, jobId));
  }
}
