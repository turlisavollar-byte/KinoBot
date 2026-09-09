export type DevicePlatform = "android" | "ios" | "web" | "smart_tv" | "desktop";
export type DeviceStatus = "active" | "blocked" | "removed";

export interface DeviceInfo {
  id: string;
  userId: string;
  telegramId?: string;
  platform: DevicePlatform;
  deviceName: string;
  deviceModel?: string;
  osVersion?: string;
  appVersion?: string;
  fcmToken?: string;
  status: DeviceStatus;
  lastActiveAt?: Date;
  createdAt: Date;
}

export interface RegisterDeviceDTO {
  platform: DevicePlatform;
  deviceName: string;
  deviceModel?: string;
  osVersion?: string;
  appVersion?: string;
  fcmToken?: string;
}
