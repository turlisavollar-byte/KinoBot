export interface ITelegramVideoService {
  sendVideo(
    channelId: string,
    filePath: string,
    caption: string,
  ): Promise<{
    fileId: string;
    messageId: number;
    duration: number;
    fileSize: number;
  }>;
  isRunning(): boolean;
}
