import "reflect-metadata";
import { describe, expect, it, vi } from "vitest";
import { UpdateUserUseCase } from "./update-user.use-case";
import { User } from "../../domain/entities/user.entity";
import {
  UserRoleVO,
  UserStatusVO,
} from "../../domain/value-objects/user-status.vo";

function createUser(role: string) {
  return User.create({
    telegramId: `${role}-telegram`,
    role: UserRoleVO.fromString(role),
    status: UserStatusVO.fromString("active"),
    isActive: true,
    isBlocked: false,
  });
}

describe("UpdateUserUseCase", () => {
  it("rejects an actor from updating an equal or higher role", async () => {
    const target = createUser("superadmin");
    const actor = createUser("admin");
    const repository = {
      findById: vi
        .fn()
        .mockResolvedValueOnce(target)
        .mockResolvedValueOnce(actor),
      update: vi.fn(),
    } as any;
    const useCase = new UpdateUserUseCase(
      repository,
      { invalidate: vi.fn() } as any,
      { emit: vi.fn() } as any,
    );

    await expect(
      useCase.execute(target.id, { firstName: "Changed" }, actor.id),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(repository.update).not.toHaveBeenCalled();
  });
});
