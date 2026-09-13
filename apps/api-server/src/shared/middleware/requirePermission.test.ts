import { describe, expect, it, vi } from "vitest";
import { requirePermission } from "./requirePermission";

describe("requirePermission", () => {
  it("accepts legacy manage:security aliases for system routes", () => {
    const req = {
      user: {
        role: "admin",
        permissions: ["manage:security"],
      },
    } as any;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;

    const next = vi.fn();

    requirePermission("manage:system")(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
