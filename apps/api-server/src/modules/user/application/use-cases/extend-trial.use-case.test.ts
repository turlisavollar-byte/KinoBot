import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { User } from "../../domain/entities/user.entity";

const { auditLogMock } = vi.hoisted(() => ({
  auditLogMock: vi.fn().mockResolvedValue({ success: true, logId: "audit-1" }),
}));

vi.mock("@/shared/utils/audit", () => ({
  logAuditEvent: auditLogMock,
}));

import { ExtendTrialUseCase } from "./extend-trial.use-case";

const fixedNow = new Date("2026-11-08T12:00:00.000Z");

function createUser(trialExpiresAt?: Date) {
  return User.createWithDefaults({
    telegramId: "test-telegram-1",
    trialExpiresAt,
  });
}

describe("ExtendTrialUseCase", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);
    auditLogMock.mockClear();
    auditLogMock.mockResolvedValue({ success: true, logId: "audit-1" });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("extends an expired trial from the current time", async () => {
    const user = createUser(new Date(fixedNow.getTime() - 2 * 86_400_000));
    const repository = {
      findById: vi.fn().mockResolvedValue(user),
      update: vi.fn(async (updatedUser: User) => updatedUser),
    };
    const useCase = new ExtendTrialUseCase(repository as any);

    const result = await useCase.execute(user.id, 3, "admin-1");

    expect(result.trialExpiresAt?.toISOString()).toBe(
      new Date(fixedNow.getTime() + 3 * 86_400_000).toISOString(),
    );
    expect(repository.update).toHaveBeenCalledOnce();
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "TRIAL_EXTENDED", actorId: "admin-1" }),
    );
  });

  it("extends an active trial from its existing expiry", async () => {
    const currentExpiry = new Date(fixedNow.getTime() + 2 * 86_400_000);
    const user = createUser(currentExpiry);
    const repository = {
      findById: vi.fn().mockResolvedValue(user),
      update: vi.fn(async (updatedUser: User) => updatedUser),
    };
    const useCase = new ExtendTrialUseCase(repository as any);

    const result = await useCase.execute(user.id, 3, "admin-1");

    expect(result.trialExpiresAt?.toISOString()).toBe(
      new Date(currentExpiry.getTime() + 3 * 86_400_000).toISOString(),
    );
  });

  it("rejects invalid extension days without updating the user", async () => {
    const repository = {
      findById: vi.fn(),
      update: vi.fn(),
    };
    const useCase = new ExtendTrialUseCase(repository as any);

    await expect(useCase.execute("user-1", 0, "admin-1")).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(repository.findById).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });
});
