import "reflect-metadata";
import { describe, expect, it, vi } from "vitest";
import { DeleteUserUseCase } from "./delete-user.use-case";
import { User } from "../../domain/entities/user.entity";
import {
  UserRoleVO,
  UserStatusVO,
} from "../../domain/value-objects/user-status.vo";

function makeUser(role: string) {
  return User.create({
    telegramId: `${role}-telegram`,
    role: UserRoleVO.fromString(role),
    status: UserStatusVO.fromString("active"),
    isActive: true,
    isBlocked: false,
  });
}

describe("DeleteUserUseCase role scope", () => {
  it("allows an admin to delete a user but rejects a peer moderator", async () => {
    const user = makeUser("moderator");
    const repository = {
      findById: vi.fn().mockResolvedValue(user),
      delete: vi.fn().mockResolvedValue(user),
    };
    const useCase = new DeleteUserUseCase(
      repository as any,
      { invalidate: vi.fn() } as any,
      { emit: vi.fn() } as any,
    );

    await useCase.execute(user.id, "admin-1", true, "admin");
    expect(repository.delete).toHaveBeenCalledWith(user.id, true);

    repository.delete.mockClear();
    await expect(
      useCase.execute(user.id, "moderator-2", true, "moderator"),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(repository.delete).not.toHaveBeenCalled();
  });
});