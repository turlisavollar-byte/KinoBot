import { InputFile } from "grammy";
import * as fs from "node:fs";
import * as path from "node:path";
import { getBot } from "@/bot/index";
import type { ITelegramVideoService } from "../../application/interfaces/telegram-video.service.interface";

export class TelegramVideoService implements ITelegramVideoService {
  async sendVideo(channelId: string, filePath: string, caption: string) {
    const bot = getBot();
    if (!bot) throw new Error("Telegram bot is not running");
    const inputFile = new InputFile(
      fs.createReadStream(filePath),
      path.basename(filePath),
    );
    const message = await bot.api.sendVideo(channelId, inputFile, { caption });
    return {
      fileId: message.video.file_id,
      messageId: message.message_id,
      duration: message.video.duration,
      fileSize: message.video.file_size ?? 0,
    };
  }

  isRunning(): boolean {
    return Boolean(getBot());
  }
}
