import { eq, and, isNull } from "drizzle-orm";
import { db, telegramChannelsTable } from "@workspace/db";
import type { IStorageChannelService } from "../../application/interfaces/channel.service.interface";

export class DrizzleChannelService implements IStorageChannelService {
  async getById(channelId: string) {
    const [channel] = await db
      .select({
        channelId: telegramChannelsTable.channelId,
        isActive: telegramChannelsTable.isActive,
      })
      .from(telegramChannelsTable)
      .where(
        and(
          eq(telegramChannelsTable.channelId, channelId),
          isNull(telegramChannelsTable.deletedAt),
        ),
      )
      .limit(1);
    return channel ?? null;
  }

  async getDefault() {
    const [channel] = await db
      .select({
        channelId: telegramChannelsTable.channelId,
        isActive: telegramChannelsTable.isActive,
      })
      .from(telegramChannelsTable)
      .where(
        and(
          eq(telegramChannelsTable.isActive, true),
          isNull(telegramChannelsTable.deletedAt),
        ),
      )
      .limit(1);
    return channel ?? null;
  }
}
