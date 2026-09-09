import { AppError } from "@/shared/errors/AppError";
import { ErrorCodes } from "@/shared/errors/errorCodes";
import { deviceRepository } from "@/modules/device/device.repository";
import type { RegisterDeviceDTO } from "./device.types";

const MAX_DEVICES_PER_USER = 5;

export class DeviceService {
  async getUserDevices(userId: string) {
    return deviceRepository.findByUserId(userId);
  }

  async registerDevice(userId: string, dto: RegisterDeviceDTO) {
    const count = await deviceRepository.countActiveByUser(userId);
    if (count >= MAX_DEVICES_PER_USER) {
      throw new AppError("Device limit reached", 403, ErrorCodes.DEVICE_LIMIT_EXCEEDED);
    }
    return deviceRepository.create(userId, dto);
  }

  async removeDevice(deviceId: string, userId: string) {
    const device = await deviceRepository.findById(deviceId);
    if (!device) throw AppError.notFound("Device", deviceId);
    if (device.userId !== userId) throw AppError.forbidden("permission");
    await deviceRepository.remove(deviceId);
  }

  async blockDevice(deviceId: string) {
    const device = await deviceRepository.findById(deviceId);
    if (!device) throw AppError.notFound("Device", deviceId);
    await deviceRepository.block(deviceId);
  }
}

export const deviceService = new DeviceService();
