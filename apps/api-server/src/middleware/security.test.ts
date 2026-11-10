import { describe, expect, it, vi } from "vitest";
import {
  MAX_MOVIE_UPLOAD_BYTES,
  MAX_MOVIE_UPLOAD_MULTIPART_OVERHEAD_BYTES,
} from "@/config/upload-limits";
import { getAllowedHosts, getClientIp, requestSizeLimit } from "./security";

describe("security helpers", () => {
  it("prefers the forwarded client IP when running behind nginx", () => {
    const req = {
      ip: "10.0.0.2",
      headers: {
        "x-forwarded-for": "203.0.113.50, 10.0.0.2",
      },
      socket: {
        remoteAddress: "10.0.0.2",
      },
    } as any;

    expect(getClientIp(req)).toBe("203.0.113.50");
  });

  it("uses a strict localhost allowlist for Vite and local dev hosts", () => {
    const hosts = getAllowedHosts();

    expect(hosts).toEqual(
      expect.arrayContaining(["localhost", "127.0.0.1", "0.0.0.0", "::1"]),
    );
    expect(hosts).not.toContain("");
  });

  it("allows multipart overhead in addition to the movie file-size limit", () => {
    const next = vi.fn();
    const req = {
      path: "/api/catalog/movies/movie-1/upload",
      headers: {
        "content-length": String(
          MAX_MOVIE_UPLOAD_BYTES + MAX_MOVIE_UPLOAD_MULTIPART_OVERHEAD_BYTES,
        ),
      },
    } as any;

    requestSizeLimit(req, {} as any, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("rejects movie requests beyond the file limit plus multipart overhead", () => {
    const next = vi.fn();
    const response = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const req = {
      path: "/api/catalog/movies/movie-1/upload",
      headers: {
        "content-length": String(
          MAX_MOVIE_UPLOAD_BYTES +
            MAX_MOVIE_UPLOAD_MULTIPART_OVERHEAD_BYTES +
            1,
        ),
      },
    } as any;

    requestSizeLimit(req, response as any, next);

    expect(response.status).toHaveBeenCalledWith(413);
    expect(response.json).toHaveBeenCalledWith({
      error: {
        code: "MOVIE_UPLOAD_TOO_LARGE",
        message: "Movie upload exceeds the 1 GiB file limit",
        maxFileSizeBytes: MAX_MOVIE_UPLOAD_BYTES,
      },
    });
    expect(next).not.toHaveBeenCalled();
  });
});
