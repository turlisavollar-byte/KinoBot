import { and, count, eq, inArray, or, sql } from "drizzle-orm";
import {
  db,
  broadcastJobsTable,
  notificationTemplatesTable,
  usersTable,
} from "@workspace/db";

export class NotificationAdminService {
  async listTemplates() {
    return db
      .select()
      .from(notificationTemplatesTable)
      .where(sql`${notificationTemplatesTable.deletedAt} IS NULL`)
      .orderBy(notificationTemplatesTable.createdAt);
  }

  async createTemplate(input: {
    name: string;
    channel: string;
    content: string;
    contentType?:
      "text" | "photo" | "video" | "animation" | "audio" | "voice" | "document";
    mediaFileId?: string | null;
    parseMode?: "HTML" | "Markdown" | "MarkdownV2";
    buttons?: Array<{ text: string; url: string }>;
    variables?: string[];
  }) {
    const contentType = input.contentType ?? "text";
    if (contentType !== "text" && !input.mediaFileId?.trim()) {
      throw new Error("mediaFileId is required for media templates");
    }
    const [template] = await db
      .insert(notificationTemplatesTable)
      .values({  
        ...input,
        contentType,
        mediaFileId: input.mediaFileId?.trim() || null,
        parseMode: input.parseMode ?? "HTML",
      })
      .returning();
    return template;
  }

  async createBroadcast(input: {
    templateId: string;
    recipients?: string[];
    recipientType?: "users" | "channels";
    data?: Record<string, unknown>;
  }) {
    const recipients = input.recipients?.filter(Boolean) ?? [];
    const recipientType = input.recipientType ?? "users";
    if (recipientType === "channels" && recipients.length === 0) {
      throw new Error("At least one Telegram channel is required");
    }
    const [{ estimatedRecipients }] = await db
      .select({ estimatedRecipients: count() })
      .from(usersTable)
      .where(
        recipientType === "channels"
          ? sql`false`
          : recipients.length
            ? and(
                or(
                  inArray(usersTable.id, recipients),
                  inArray(usersTable.telegramId, recipients),
                ),
                eq(usersTable.isActive, true),
              )
            : eq(usersTable.isActive, true),
      );
    const recipientCount =
      recipientType === "channels"
        ? recipients.length
        : Number(estimatedRecipients);
    const [job] = await db
      .insert(broadcastJobsTable)
      .values({
        templateId: input.templateId,
        targetAudience:
          recipientType === "channels"
            ? JSON.stringify({ type: "channels", ids: recipients })
            : recipients.length
              ? JSON.stringify(recipients)
              : "all",
        variables: input.data ? JSON.stringify(input.data) : null,
        totalRecipients: recipientCount,
        status: "pending",
      })
      .returning();
    return {
      success: true,
      data: {
        messageId: job.id,
        recipientCount,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
