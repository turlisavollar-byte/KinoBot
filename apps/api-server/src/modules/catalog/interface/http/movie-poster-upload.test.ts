import { describe, expect, it } from "vitest";
import {
  createMoviePosterStorageKey,
  getMoviePosterExtension,
  hasMoviePosterSignature,
  isMoviePosterUpload,
  MAX_MOVIE_POSTER_UPLOAD_BYTES,
} from "./movie-poster-upload";

describe("movie poster upload validation", () => {
  it("accepts supported image extensions with matching MIME types", () => {
    expect(
      isMoviePosterUpload({
        originalname: "cover.JPG",
        mimetype: "image/jpeg",
      }),
    ).toBe(true);
    expect(
      isMoviePosterUpload({ originalname: "cover.png", mimetype: "image/png" }),
    ).toBe(true);
    expect(
      isMoviePosterUpload({
        originalname: "cover.webp",
        mimetype: "image/webp",
      }),
    ).toBe(true);
  });

  it("rejects unsupported extensions and mismatched MIME types", () => {
    expect(
      isMoviePosterUpload({
        originalname: "cover.svg",
        mimetype: "image/svg+xml",
      }),
    ).toBe(false);
    expect(
      isMoviePosterUpload({
        originalname: "cover.png",
        mimetype: "image/jpeg",
      }),
    ).toBe(false);
  });

  it("validates JPEG, PNG, and WebP signatures", () => {
    expect(
      hasMoviePosterSignature(Buffer.from([0xff, 0xd8, 0xff]), "image/jpeg"),
    ).toBe(true);
    expect(
      hasMoviePosterSignature(
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        "image/png",
      ),
    ).toBe(true);
    expect(
      hasMoviePosterSignature(Buffer.from("RIFF0000WEBP"), "image/webp"),
    ).toBe(true);
    expect(
      hasMoviePosterSignature(Buffer.from("not-image-data"), "image/png"),
    ).toBe(false);
  });

  it("generates isolated poster object keys and enforces the size cap", () => {
    const first = createMoviePosterStorageKey("movie-1", "cover.jpeg");
    expect(first).toMatch(/^movies\/movie-1\/posters\/[0-9a-f-]+\.jpeg$/i);
    expect(createMoviePosterStorageKey("movie-1", "cover.jpeg")).not.toBe(
      first,
    );
    expect(getMoviePosterExtension("cover.svg")).toBeNull();
    expect(MAX_MOVIE_POSTER_UPLOAD_BYTES).toBe(10 * 1024 * 1024);
  });
});
