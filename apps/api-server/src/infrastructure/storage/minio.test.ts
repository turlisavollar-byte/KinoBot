import { beforeEach, describe, expect, it, vi } from "vitest";
import { Readable } from "node:stream";

const { mockS3ClientOptions, mockS3Send, mockUploadDone, mockUploadOptions } =
  vi.hoisted(() => ({
    mockS3ClientOptions: vi.fn(),
    mockS3Send: vi.fn(),
    mockUploadDone: vi.fn(),
    mockUploadOptions: vi.fn(),
  }));

vi.mock("@aws-sdk/client-s3", () => {
  class Command {
    constructor(public input: unknown) {}
  }

  return {
    S3Client: class {
      constructor(options: unknown) {
        mockS3ClientOptions(options);
      }

      send = mockS3Send;
    },
    PutObjectCommand: Command,
    GetObjectCommand: Command,
    DeleteObjectCommand: Command,
    HeadBucketCommand: Command,
    HeadObjectCommand: Command,
    ListBucketsCommand: Command,
  };
});

vi.mock("@aws-sdk/lib-storage", () => ({
  Upload: class {
    constructor(options: unknown) {
      mockUploadOptions(options);
    }

    done() {
      return mockUploadDone();
    }
  },
}));

import { S3Storage } from "./minio";

describe("S3Storage.uploadStream", () => {
  beforeEach(() => {
    vi.stubEnv("S3_ACCESS_KEY_ID", "test-access-key");
    vi.stubEnv("S3_SECRET_ACCESS_KEY", "test-secret-key");
    vi.clearAllMocks();
    mockS3Send.mockResolvedValue({});
    mockUploadDone.mockResolvedValue({});
  });

  it("uses bounded multipart streaming for S3-compatible uploads", async () => {
    const storage = new S3Storage();
    const stream = Readable.from(["video data"]);

    await expect(
      storage.uploadStream(
        "videos",
        "movies/movie-1/video.mp4",
        stream,
        "video/mp4",
        10,
      ),
    ).resolves.toBe("videos/movies/movie-1/video.mp4");

    expect(mockUploadOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          Bucket: "videos",
          Key: "movies/movie-1/video.mp4",
          Body: stream,
          ContentType: "video/mp4",
          ContentLength: 10,
        }),
        queueSize: 2,
        partSize: 8 * 1024 * 1024,
        leavePartsOnError: false,
        abortController: expect.any(AbortController),
      }),
    );
    expect(mockS3ClientOptions).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ requestStreamBufferSize: 64 * 1024 }),
    );
    expect(mockS3Send).toHaveBeenCalledTimes(1);
  });

  it("propagates multipart upload failures", async () => {
    const storage = new S3Storage();
    const uploadError = Object.assign(new Error("stream chunk failure"), {
      name: "InvalidChunkSizeError",
    });
    mockUploadDone.mockRejectedValueOnce(uploadError);

    await expect(
      storage.uploadStream(
        "videos",
        "movies/movie-1/video.mp4",
        Readable.from(["video data"]),
        "video/mp4",
        10,
      ),
    ).rejects.toBe(uploadError);
  });
});
