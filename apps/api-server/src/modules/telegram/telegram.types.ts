export interface TelegramConfig {
  id: string;
  botToken?: string;
  botUsername?: string;
  storageChannelId?: string;
  storageChannelUsername?: string;
  welcomeMessage?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateTelegramConfigDTO {
  botToken?: string;
  botUsername?: string;
  storageChannelId?: string;
  storageChannelUsername?: string;
  welcomeMessage?: string;
  isActive?: boolean;
}

export interface BotStatus {
  isRunning: boolean;
  botUsername?: string;
  startedAt?: Date;
}
