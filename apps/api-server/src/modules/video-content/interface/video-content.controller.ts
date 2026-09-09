import type { NextFunction, Request, Response } from "express";
import * as fs from "node:fs";
import { VideoContentService } from "../application/services/video-content.service";
import type { VideoCodeEntity } from "../domain/entities/video-code.entity";

function toResponse(video: VideoCodeEntity) {
  return {
    id: video.id,
    code: video.code.toString(),
    title: video.title,
    description: video.description,
    telegramFileId: video.telegramFileId,
    channelId: video.channelId,
    messageId: video.messageId,
    fileSize: video.fileSize,
    duration: video.duration,
    status: video.status.toString(),
    viewsCount: video.viewsCount,
    createdAt: video.createdAt,
    updatedAt: video.updatedAt,
  };
}

export class VideoContentController {
  constructor(private readonly service: VideoContentService) {}

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const videos = await this.service.getVideos(
        req.query.status as string | undefined,
      );
      res.json(videos.map(toResponse));
    } catch (error) {
      next(error);
    }
  }

  async upload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No video file provided" });
        return;
      }
      try {
        const result = await this.service.uploadVideo({
          file: req.file,
          title: String(req.body.title ?? ""),
          description: req.body.description,
          channelId: req.body.channelId,
        });
        res.status(201).json(toResponse(result));
      } finally {
        fs.unlink(req.file.path, () => {});
      }
    } catch (error) {
      next(error);
    }
  }

  async import(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.service.importVideo(req.body);
      res.status(201).json(toResponse(result));
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      res.json(toResponse(await this.service.updateVideo(id, req.body)));
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      await this.service.deleteVideo(id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }
}
