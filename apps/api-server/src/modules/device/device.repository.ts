/**
 * Device Repository — STUB
 *
 * TODO: Add `devicesTable` to DB schema (lib/db/src/schema/).
 * Schema fields: id, userId, telegramId, platform, deviceName,
 *   deviceModel, osVersion, appVersion, fcmToken, status,
 *   lastActiveAt, createdAt, deletedAt
 */

import { logger } from "@/lib/logger";
import type { DeviceInfo, RegisterDeviceDTO } from "@/modules/device/device.types";

export class DeviceRepository {
  async findByUserId(_userId: string): Promise<DeviceInfo[]> {
    logger.warn("DeviceRepository.findByUserId: stub — schema not yet created");
    return [];
  }

  async findById(_id: string): Promise<DeviceInfo | null> {
    return null;
  }

  async create(_userId: string, _dto: RegisterDeviceDTO): Promise<DeviceInfo> {
    throw new Error("DeviceRepository.create: stub");
  }

  async updateLastActive(_id: string): Promise<void> {}

  async block(_id: string): Promise<void> {}

  async remove(_id: string): Promise<void> {}

  async countActiveByUser(_userId: string): Promise<number> {
    return 0;
  }
}

export const deviceRepository = new DeviceRepository();
