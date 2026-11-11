import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserDetailModal } from "./user-detail-modal";

const mocks = vi.hoisted(() => ({
  blockMutate: vi.fn(),
  updateMutate: vi.fn(),
}));

vi.mock("@workspace/api-client-react", () => ({
  useIdentityGetMe: () => ({ data: { role: "admin" } }),
  useGetUser: () => ({
    data: {
      data: {
        id: "user-1",
        fullName: "Ada Lovelace",
        firstName: "Ada",
        lastName: "Lovelace",
        username: "ada",
        email: "ada@example.com",
        phone: null,
        role: "user",
        isBlocked: false,
        createdAt: "2024-01-01T00:00:00.000Z",
        lastLoginAt: null,
        watchCount: 3,
        activeSubscription: null,
      },
    },
    isLoading: false,
    isError: false,
  }),
  useGetUserAuditHistory: () => ({
    data: {
      data: [{
        id: "audit-1",
        action: "user.updated",
        targetType: "user",
        createdAt: "2024-03-01T12:00:00.000Z",
      }],
    },
  }),
  useUpdateUser: () => ({ mutate: mocks.updateMutate, isPending: false }),
  useBlockUser: () => ({ mutate: mocks.blockMutate, isPending: false }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("UserDetailModal", () => {
  beforeEach(() => {
    mocks.blockMutate.mockReset();
    mocks.updateMutate.mockReset();
  });

  it("shows user profile and recent audit history", () => {
    render(<UserDetailModal userId="user-1" open onClose={vi.fn()} />);

    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    expect(screen.getByText("user.updated")).toBeInTheDocument();
    expect(screen.getByText("Watch sessions")).toBeInTheDocument();
  });

  it("blocks the selected user through the mutation hook", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<UserDetailModal userId="user-1" open onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Block" }));

    await waitFor(() => expect(mocks.blockMutate).toHaveBeenCalledWith(
      {
        id: "user-1",
        data: { blocked: true, reason: "Blocked by admin" },
      },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    ));
  });
});
