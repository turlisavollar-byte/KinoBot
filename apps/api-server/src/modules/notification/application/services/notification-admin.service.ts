import { and, count, eq, inArray, or, sql } from "drizzle-orm";
import {
  db,
  broadcastJobsTable,
  notificationTemplatesTable,
  usersTable,
} from "@workspace/db";
import {
  resolveBroadcastAudience,
  type BroadcastRecipientType,
} from "./broadcast-audience";

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

  async updateTemplate(
    id: string,
    input: Partial<{
      name: string;
      channel: string;
      content: string;
      contentType:
        | "text"
        | "photo"
        | "video"
        | "animation"
        | "audio"
        | "voice"
        | "document";
      mediaFileId: string | null;
      parseMode: "HTML" | "Markdown" | "MarkdownV2";
      buttons: Array<{ text: string; url: string }>;
      variables: string[];
    }>,
  ) {
    const [existing] = await db
      .select()
      .from(notificationTemplatesTable)
      .where(
        and(
          eq(notificationTemplatesTable.id, id),
          sql`${notificationTemplatesTable.deletedAt} IS NULL`,
        ),
      )
      .limit(1);
    if (!existing) throw new Error("Notification template not found");

    const contentType = input.contentType ?? existing.contentType;
    const mediaFileId =
      input.mediaFileId === undefined
        ? existing.mediaFileId
        : input.mediaFileId?.trim() || null;
    if (contentType !== "text" && !mediaFileId) {
      throw new Error("mediaFileId is required for media templates");
    }
    const [template] = await db
      .update(notificationTemplatesTable)
      .set({
        ...input,
        contentType,
        mediaFileId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(notificationTemplatesTable.id, id),
          sql`${notificationTemplatesTable.deletedAt} IS NULL`,
        ),
      )
      .returning();
    if (!template) throw new Error("Notification template not found");
    return template;
  }

  async deleteTemplate(id: string) {
    const [template] = await db
      .update(notificationTemplatesTable)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(notificationTemplatesTable.id, id),
          sql`${notificationTemplatesTable.deletedAt} IS NULL`,
        ),
      )
      .returning({ id: notificationTemplatesTable.id });
    if (!template) throw new Error("Notification template not found");
  }

  async createBroadcast(input: {
    templateId: string;
    recipients?: string[];
    recipientType?: BroadcastRecipientType;
    data?: Record<string, unknown>;
  }) {
    const recipientType = input.recipientType ?? "users";
    const audience = resolveBroadcastAudience(recipientType, input.recipients);
    const [{ estimatedRecipients }] = await db
      .select({ estimatedRecipients: count() })
      .from(usersTable)
      .where(
        audience.recipientType === "channels"
          ? sql`false`
          : audience.recipientType === "users"
            ? and(
                or(
                  inArray(usersTable.id, audience.recipients),
                  inArray(usersTable.telegramId, audience.recipients),
                ),
                eq(usersTable.isActive, true),
              )
            : eq(usersTable.isActive, true),
      );
    const recipientCount =
      audience.recipientType === "channels"
        ? audience.recipients.length
        : Number(estimatedRecipients);
    const [job] = await db
      .insert(broadcastJobsTable)
      .values({
        templateId: input.templateId,
        targetAudience: audience.targetAudience,
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
