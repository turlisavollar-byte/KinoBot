import { describe, expect, it } from "vitest";
import { listUsersFilterSchema } from "../../../application/dto/user-request.dto";
import { UpdateUserSchema } from "./user.validator";

describe("UpdateUserSchema", () => {
  it("rejects role changes from the general user update endpoint", () => {
    expect(() =>
      UpdateUserSchema.parse({
        name: "ignored",
        role: "superadmin",
      }),
    ).toThrow();
  });
});

describe("listUsersFilterSchema", () => {
  it("accepts numeric page and limit values from query params", () => {
    const parsed = listUsersFilterSchema.parse({
      page: 1,
      limit: 20,
      includeDeleted: "false",
    });

    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(20);
    expect(parsed.includeDeleted).toBe(false);
  });

  it("does not apply false filters when optional booleans are omitted", () => {
    const parsed = listUsersFilterSchema.parse({ search: "" });

    expect(parsed.isActive).toBeUndefined();
    expect(parsed.isBlocked).toBeUndefined();
    expect(parsed.isDeleted).toBeUndefined();
    expect(parsed.includeDeleted).toBeUndefined();
  });
});
