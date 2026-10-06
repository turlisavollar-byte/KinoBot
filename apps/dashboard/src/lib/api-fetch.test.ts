import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "./api-fetch";
import { isMustChangePasswordRequired } from "./password-change-flow";

vi.mock("@/lib/auth-token", () => ({ getToken: () => "access-token" }));

describe("apiFetch forced-password handling", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("marks the session when the server returns PASSWORD_CHANGE_REQUIRED", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        success: false,
        error: {
          code: "PASSWORD_CHANGE_REQUIRED",
          message: "Change your temporary password before continuing",
        },
      }), { status: 403, headers: { "Content-Type": "application/json" } }),
    ));

    await expect(apiFetch("/api/private")).rejects.toMatchObject({
      status: 403,
      data: { error: { code: "PASSWORD_CHANGE_REQUIRED" } },
    });
    expect(isMustChangePasswordRequired()).toBe(true);
  });

  it("does not mark a normal permission-denied 403 as a forced password change", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        success: false,
        error: { code: "FORBIDDEN", message: "Permission denied" },
      }), { status: 403, headers: { "Content-Type": "application/json" } }),
    ));

    await expect(apiFetch("/api/private")).rejects.toMatchObject({ status: 403 });
    expect(isMustChangePasswordRequired()).toBe(false);
  });
});
