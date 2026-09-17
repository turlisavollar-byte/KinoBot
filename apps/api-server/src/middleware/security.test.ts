import { describe, expect, it } from "vitest";
import { getAllowedHosts, getClientIp } from "./security";

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
});
