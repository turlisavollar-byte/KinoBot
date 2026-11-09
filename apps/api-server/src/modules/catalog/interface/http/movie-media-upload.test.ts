import { describe, expect, it } from "vitest";
import { createMovieStorageKey, hasMp4Signature, isMovieMp4Upload, MAX_MOVIE_UPLOAD_BYTES } from "./movie-media-upload";

describe("movie media upload validation", () => {
  it("accepts MP4 filenames with the MP4 MIME type", () => {
    expect(isMovieMp4Upload({ originalname: "feature.MP4", mimetype: "video/mp4" })).toBe(true);
  });
  it("rejects unsupported extensions and MIME types", () => {
    expect(isMovieMp4Upload({ originalname: "feature.mkv", mimetype: "video/mp4" })).toBe(false);
    expect(isMovieMp4Upload({ originalname: "feature.mp4", mimetype: "text/plain" })).toBe(false);
  });
  it("checks the ISO base media file signature", () => {
    expect(hasMp4Signature(Buffer.from("0000ftypisom"))).toBe(true);
    expect(hasMp4Signature(Buffer.from("not-a-video"))).toBe(false);
  });
  it("creates isolated MP4 object keys", () => {
    const first = createMovieStorageKey("movie-1");
    expect(first).toMatch(/^movies\/movie-1\/[0-9a-f-]+\.mp4$/i);
    expect(createMovieStorageKey("movie-1")).not.toBe(first);
    expect(MAX_MOVIE_UPLOAD_BYTES).toBe(1024 * 1024 * 1024);
  });
});
