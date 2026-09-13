import { beforeEach, describe, expect, it, vi } from "vitest";

const { dbMock, featureFlagsTableMock } = vi.hoisted(() => ({
  dbMock: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  featureFlagsTableMock: {
    id: "id",
    key: "key",
    name: "name",
    description: "description",
    status: "status",
    rolloutPercentage: "rollout_percentage",
    enabledForUserIds: "enabled_for_user_ids",
    metadata: "metadata",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
}));

vi.mock("@workspace/db", () => ({
  db: dbMock,
  featureFlagsTable: featureFlagsTableMock,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { featureFlagService } from "./feature-flag.service";

describe("feature-flag service", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    dbMock.select.mockReturnValue({
      from: () => ({
        where: () => ({
          orderBy: () => ({
            limit: async () => [],
          }),
        }),
      }),
    });

    dbMock.insert.mockReturnValue({
      values: () => ({
        onConflictDoUpdate: () => ({
          returning: async () => [
            {
              id: "flag-1",
              key: "new_dashboard",
              name: "New Dashboard",
              description: "Test feature",
              status: "enabled",
              rolloutPercentage: 50,
              enabledForUserIds: [],
              metadata: {},
              createdAt: new Date("2024-01-01T00:00:00.000Z"),
              updatedAt: new Date("2024-01-01T00:00:00.000Z"),
            },
          ],
        }),
      }),
    });
  });

  it("persists feature flags through the database-backed table instead of an in-memory map", async () => {
    const flag = await featureFlagService.upsert({
      key: "new_dashboard",
      name: "New Dashboard",
      description: "Test feature",
      status: "enabled",
      rolloutPercentage: 50,
    });

    expect(flag.key).toBe("new_dashboard");
    expect(dbMock.insert).toHaveBeenCalled();
  });
});
