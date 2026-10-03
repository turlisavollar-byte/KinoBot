import { describe, expect, it, vi } from "vitest";
import type { IVideoCodeRepository } from "../repositories/video-code.repository.interface";
import { VideoCodeEntity } from "../entities/video-code.entity";
import { VideoCode } from "../value-objects/video-code.vo";
import { VideoStatusValue } from "../value-objects/video-status.vo";
import { ListMovieVideoCodesUseCase } from "./list-movie-video-codes.use-case";

describe("ListMovieVideoCodesUseCase", () => {
  it("returns all codes linked to an existing movie", async () => {
    const code = VideoCodeEntity.create({
      id: "code-id",
      code: VideoCode.create("AB23"),
      title: "Film",
      description: null,
      movieId: "movie-id",
      telegramFileId: "telegram-file-id",
      channelId: null,
      messageId: null,
      fileSize: null,
      duration: null,
      status: VideoStatusValue.create("active"),
      accessPolicy: "free",
      requiredChannelIds: null,
      viewsCount: 12,
    });
    const repository: Pick<IVideoCodeRepository, "movieExists" | "findByMovieId"> = {
      movieExists: vi.fn(async () => true),
      findByMovieId: vi.fn(async () => [code]),
    };

    await expect(
      new ListMovieVideoCodesUseCase(repository).execute("movie-id"),
    ).resolves.toEqual([code]);
    expect(repository.findByMovieId).toHaveBeenCalledWith("movie-id");
  });

  it("rejects a missing or soft-deleted movie", async () => {
    const repository: Pick<IVideoCodeRepository, "movieExists" | "findByMovieId"> = {
      movieExists: vi.fn(async () => false),
      findByMovieId: vi.fn(async () => []),
    };

    await expect(
      new ListMovieVideoCodesUseCase(repository).execute("missing-movie"),
    ).rejects.toThrow("Movie not found");
    expect(repository.findByMovieId).not.toHaveBeenCalled();
  });
});