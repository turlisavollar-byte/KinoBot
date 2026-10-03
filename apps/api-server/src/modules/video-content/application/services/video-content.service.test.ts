import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IVideoCodeRepository } from "../../domain/repositories/video-code.repository.interface";
import { VideoCodeEntity } from "../../domain/entities/video-code.entity";
import { CodeGeneratorService } from "../../domain/services/code-generator.service";
import { VideoCode } from "../../domain/value-objects/video-code.vo";
import { VideoStatusValue } from "../../domain/value-objects/video-status.vo";
import { VideoContentService } from "./video-content.service";

function createVideo() {
  return VideoCodeEntity.create({
    id: "code-id",
    code: VideoCode.create("AB23"),
    title: "Test film",
    description: null,
    movieId: null,
    telegramFileId: "telegram-file-id",
    channelId: null,
    messageId: null,
    fileSize: null,
    duration: null,
    status: VideoStatusValue.pending(),
    accessPolicy: "free",
    requiredChannelIds: null,
    viewsCount: 0,
  });
}

function createService(movieExists: () => Promise<boolean>) {
  const video = createVideo();
  const repository: IVideoCodeRepository = {
    create: vi.fn(async (entity) => entity),
    update: vi.fn(async (entity) => entity),
    findById: vi.fn(async () => video),
    findByCode: vi.fn(async () => null),
    findAll: vi.fn(async () => []),
    findByMovieId: vi.fn(async () => [video]),
    movieExists: vi.fn(movieExists),
    delete: vi.fn(async () => true),
    exists: vi.fn(async () => false),
  };
  const service = new VideoContentService(
    repository,
    new CodeGeneratorService(),
    { isRunning: () => true, sendVideo: vi.fn() },
    {
      getById: async () => ({ channelId: "channel-id", isActive: true }),
      getDefault: async () => ({ channelId: "channel-id", isActive: true }),
    },
  );
  return { service, repository, video };
}

describe("VideoContentService movie linkage", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("links a video code to an existing movie", async () => {
    const { service, repository, video } = createService(async () => true);

    await service.updateVideo("code-id", { movieId: "movie-id" });

    expect(video.movieId).toBe("movie-id");
    expect(repository.update).toHaveBeenCalledWith(video);
  });

  it("rejects a missing or soft-deleted movie without persisting the link", async () => {
    const { service, repository, video } = createService(async () => false);

    await expect(
      service.updateVideo("code-id", { movieId: "missing-movie" }),
    ).rejects.toThrow("Movie not found");

    expect(video.movieId).toBeNull();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("lists codes for one movie through the repository filter", async () => {
    const { service, repository, video } = createService(async () => true);

    await expect(service.getMovieVideoCodes("movie-id")).resolves.toEqual([video]);
    expect(repository.findByMovieId).toHaveBeenCalledWith("movie-id");
  });
});
