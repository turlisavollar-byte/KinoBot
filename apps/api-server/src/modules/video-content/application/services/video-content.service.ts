import { VideoCodeEntity } from "../../domain/entities/video-code.entity";
import type { IVideoCodeRepository } from "../../domain/repositories/video-code.repository.interface";
import { CodeGeneratorService } from "../../domain/services/code-generator.service";
import { VideoStatusValue } from "../../domain/value-objects/video-status.vo";
import type { ITelegramVideoService } from "../interfaces/telegram-video.service.interface";
import type { IStorageChannelService } from "../interfaces/channel.service.interface";
import { serializeRequiredChannelIds } from "@/bot/required-channels";

export type VideoAccessPolicy = "free" | "subscription" | "channels";

export interface UploadVideoInput {
  file: Express.Multer.File;
  title: string;
  description?: string;
  channelId?: string;
  accessPolicy?: VideoAccessPolicy;
  requiredChannelIds?: string | null;
}

export interface ImportVideoInput {
  title: string;
  description?: string;
  telegramFileId: string;
  channelId?: string;
  fileSize?: number;
  duration?: number;
  accessPolicy?: VideoAccessPolicy;
  requiredChannelIds?: string | null;
}

function normalizeAccessPolicy(value?: string | null): VideoAccessPolicy {
  if (value === "subscription" || value === "channels") return value;
  return "free";
}

function normalizeRequiredChannels(
  accessPolicy: VideoAccessPolicy,
  value?: string | null,
): string | null {
  if (accessPolicy !== "channels") return null;
  return serializeRequiredChannelIds(value);
}

export class VideoContentService {
  constructor(
    private readonly repository: IVideoCodeRepository,
    private readonly codeGenerator: CodeGeneratorService,
    private readonly telegram: ITelegramVideoService,
    private readonly channels: IStorageChannelService,
  ) {}

  getVideos(status?: string): Promise<VideoCodeEntity[]> {
    return this.repository.findAll(
      status
        ? { status: VideoStatusValue.create(status).toString() }
        : undefined,
    );
  }

  async uploadVideo(input: UploadVideoInput): Promise<VideoCodeEntity> {
    const title = input.title.trim();
    if (!title) throw new Error("title is required");
    const accessPolicy = normalizeAccessPolicy(input.accessPolicy);
    const requiredChannelIds = normalizeRequiredChannels(
      accessPolicy,
      input.requiredChannelIds,
    );
    if (accessPolicy === "channels" && !requiredChannelIds) {
      throw new Error(
        "requiredChannelIds are required for channel-gated videos",
      );
    }
    const channel = input.channelId
      ? await this.channels.getById(input.channelId)
      : await this.channels.getDefault();
    if (!channel || !channel.isActive) {
      throw new Error("No active storage channel found");
    }
    if (!this.telegram.isRunning()) {
      throw new Error("Telegram bot is not running. Start the bot first.");
    }

    const code = await this.codeGenerator.generateUniqueCode((candidate) =>
      this.repository.exists(candidate),
    );
    const result = await this.telegram.sendVideo(
      channel.channelId,
      input.file.path,
      `🎬 ${title}\n📋 Kod: ${code}`,
    );
    return this.repository.create(
      VideoCodeEntity.create({
        id: crypto.randomUUID(),
        code,
        title,
        description: input.description?.trim() || null,
        telegramFileId: result.fileId,
        channelId: channel.channelId,
        messageId: result.messageId,
        fileSize: result.fileSize,
        duration: result.duration,
        status: VideoStatusValue.pending(),
        accessPolicy,
        requiredChannelIds,
        viewsCount: 0,
      }),
    );
  }

  async importVideo(input: ImportVideoInput): Promise<VideoCodeEntity> {
    const title = input.title.trim();
    const telegramFileId = input.telegramFileId.trim();
    if (!title || !telegramFileId) {
      throw new Error("title va telegramFileId majburiy");
    }
    const accessPolicy = normalizeAccessPolicy(input.accessPolicy);
    const requiredChannelIds = normalizeRequiredChannels(
      accessPolicy,
      input.requiredChannelIds,
    );
    if (accessPolicy === "channels" && !requiredChannelIds) {
      throw new Error(
        "requiredChannelIds are required for channel-gated videos",
      );
    }
    const channel = input.channelId
      ? await this.channels.getById(input.channelId)
      : await this.channels.getDefault();
    const code = await this.codeGenerator.generateUniqueCode((candidate) =>
      this.repository.exists(candidate),
    );
    return this.repository.create(
      VideoCodeEntity.create({
        id: crypto.randomUUID(),
        code,
        title,
        description: input.description?.trim() || null,
        telegramFileId,
        channelId: channel?.channelId ?? null,
        messageId: null,
        fileSize: input.fileSize ?? null,
        duration: input.duration ?? null,
        status: VideoStatusValue.pending(),
        accessPolicy,
        requiredChannelIds,
        viewsCount: 0,
      }),
    );
  }

  async updateVideo(
    id: string,
    input: { title?: string; description?: string; status?: string },
  ): Promise<VideoCodeEntity> {
    const video = await this.repository.findById(id);
    if (!video) throw new Error("Video code not found");
    if (input.title !== undefined && !input.title.trim()) {
      throw new Error("title cannot be empty");
    }
    if (input.title !== undefined || input.description !== undefined) {
      video.updateDetails(input.title, input.description);
    }
    if (input.status !== undefined) {
      video.updateStatus(VideoStatusValue.create(input.status));
    }
    const updated = await this.repository.update(video);
    if (!updated) throw new Error("Video code not found");
    return updated;
  }

  async deleteVideo(id: string): Promise<void> {
    if (!(await this.repository.delete(id))) {
      throw new Error("Video code not found");
    }
  }
}
