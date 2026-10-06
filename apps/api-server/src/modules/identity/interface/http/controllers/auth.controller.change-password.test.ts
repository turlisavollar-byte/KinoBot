import { describe, expect, it, vi } from "vitest";
import { AuthController } from "./auth.controller";

function makeController(changePassword: ReturnType<typeof vi.fn>) {
  return new AuthController(
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    { execute: changePassword } as any,
  );
}

function makeResponse() {
  const response: any = {
    statusCode: 200,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json: vi.fn(),
  };
  return response;
}

describe("AuthController changePassword", () => {
  it("returns 200 when an authenticated user changes their password", async () => {
    const changePassword = vi.fn().mockResolvedValue({
      success: true,
      message: "Password changed successfully",
    });
    const controller = makeController(changePassword);
    const req: any = {
      user: { id: "admin-1" },
      body: { currentPassword: "Temporary123!", newPassword: "Updated123!" },
    };
    const res = makeResponse();

    await controller.changePassword(req, res);

    expect(changePassword).toHaveBeenCalledWith(
      "admin-1",
      "Temporary123!",
      "Updated123!",
    );
    expect(res.statusCode).toBe(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Password changed successfully",
    });
  });

  it("does not report an incorrect current password as an authentication failure", async () => {
    const changePassword = vi.fn().mockRejectedValue(
      new Error("Current password is incorrect"),
    );
    const controller = makeController(changePassword);
    const req: any = {
      user: { id: "admin-1" },
      body: { currentPassword: "incorrect", newPassword: "Updated123!" },
    };
    const res = makeResponse();

    await controller.changePassword(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: "PASSWORD_CHANGE_FAILED",
          message: "Current password is incorrect",
        }),
      }),
    );
  });
});
