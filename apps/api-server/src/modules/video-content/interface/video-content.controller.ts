import type { NextFunction, Request, Response } from "express";
import * as fs from "node:fs";
import { VideoContentService } from "../application/services/video-content.service";
import type { VideoCodeEntity } from "../domain/entities/video-code.entity";
import { UpdateVideoCodeBody } from "@workspace/api-zod";
import { ListMovieVideoCodesUseCase } from "../domain/use-cases/list-movie-video-codes.use-case";

function toResponse(video: VideoCodeEntity) {
  return {
    id: video.id,
    code: video.code.toString(),
    title: video.title,
    description: video.description,
    movieId: video.movieId,
    telegramFileId: video.telegramFileId,
    channelId: video.channelId,
    messageId: video.messageId,
    fileSize: video.fileSize,
    duration: video.duration,
    status: video.status.toString(),
    accessPolicy: video.accessPolicy,
    requiredChannelIds: video.requiredChannelIds,
    viewsCount: video.viewsCount,
    createdAt: video.createdAt,
    updatedAt: video.updatedAt,
  };
}

export class VideoContentController {
  constructor(
    private readonly service: VideoContentService,
    private readonly listMovieVideoCodes: ListMovieVideoCodesUseCase,
  ) {}

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
          movieId: req.body.movieId,
          channelId: req.body.channelId,
          accessPolicy: req.body.accessPolicy,
          requiredChannelIds: req.body.requiredChannelIds,
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
      const body = UpdateVideoCodeBody.safeParse(req.body);
      if (!body.success) {
        res.status(400).json({ error: body.error.message });
        return;
      }
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      res.json(toResponse(await this.service.updateVideo(id, body.data)));
    } catch (error) {
      if (error instanceof Error && error.message === "Movie not found") {
        res.status(404).json({ error: error.message });
        return;
      }
      next(error);
    }
  }

  async listMovie(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const movieId = Array.isArray(req.params.movieId)
        ? req.params.movieId[0]
        : req.params.movieId;
      res.json(
        (await this.listMovieVideoCodes.execute(movieId)).map(toResponse),
      );
    } catch (error) {
      if (error instanceof Error && error.message === "Movie not found") {
        res.status(404).json({ error: error.message });
        return;
      }
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
