export interface IStorageChannelService {
  getById(
    channelId: string,
  ): Promise<{ channelId: string; isActive: boolean } | null>;
  getDefault(): Promise<{ channelId: string; isActive: boolean } | null>;
}
