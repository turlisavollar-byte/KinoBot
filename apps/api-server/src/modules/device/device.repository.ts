import { and, count, eq, isNull } from "drizzle-orm";
import { db, devicesTable } from "@workspace/db";
import type {
  DeviceInfo,
  RegisterDeviceDTO,
} from "@/modules/device/device.types";

const toDeviceInfo = (row: typeof devicesTable.$inferSelect): DeviceInfo => ({
  id: row.id,
  userId: row.userId,
  telegramId: row.telegramId ?? undefined,
  platform: row.platform as DeviceInfo["platform"],
  deviceName: row.deviceName,
  deviceModel: row.deviceModel ?? undefined,
  osVersion: row.osVersion ?? undefined,
  appVersion: row.appVersion ?? undefined,
  fcmToken: row.fcmToken ?? undefined,
  status: row.status as DeviceInfo["status"],
  lastActiveAt: row.lastActiveAt ?? undefined,
  createdAt: row.createdAt,
});

export class DeviceRepository {
  async findByUserId(userId: string): Promise<DeviceInfo[]> {
    const rows = await db
      .select()
      .from(devicesTable)
      .where(
        and(eq(devicesTable.userId, userId), isNull(devicesTable.deletedAt)),
      );
    return rows.map(toDeviceInfo);
  }

  async findById(id: string): Promise<DeviceInfo | null> {
    const [row] = await db
      .select()
      .from(devicesTable)
      .where(and(eq(devicesTable.id, id), isNull(devicesTable.deletedAt)))
      .limit(1);
    return row ? toDeviceInfo(row) : null;
  }

  async create(userId: string, dto: RegisterDeviceDTO): Promise<DeviceInfo> {
    const [row] = await db
      .insert(devicesTable)
      .values({
        userId,
        ...dto,
        lastActiveAt: new Date(),
      })
      .returning();
    return toDeviceInfo(row);
  }

  async updateLastActive(id: string): Promise<void> {
    await db
      .update(devicesTable)
      .set({ lastActiveAt: new Date() })
      .where(eq(devicesTable.id, id));
  }

  async block(id: string): Promise<void> {
    await db
      .update(devicesTable)
      .set({ status: "blocked" })
      .where(eq(devicesTable.id, id));
  }

  async remove(id: string): Promise<void> {
    await db
      .update(devicesTable)
      .set({ status: "removed", deletedAt: new Date() })
      .where(eq(devicesTable.id, id));
  }

  async countActiveByUser(userId: string): Promise<number> {
    const [{ total }] = await db
      .select({ total: count() })
      .from(devicesTable)
      .where(
        and(
          eq(devicesTable.userId, userId),
          eq(devicesTable.status, "active"),
          isNull(devicesTable.deletedAt),
        ),
      );
    return Number(total);
  }
}

export const deviceRepository = new DeviceRepository();
