import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminUsersList from "./admin-list";

const mocks = vi.hoisted(() => ({
  updateAsync: vi.fn(),
  deleteAsync: vi.fn(),
  invalidateQueries: vi.fn(),
}));

vi.mock("@workspace/api-client-react", () => ({
  getListAdminUsersQueryKey: (args: unknown) => ["admin-users", args],
  useDeleteAdminUser: () => ({ mutateAsync: mocks.deleteAsync, isPending: false }),
  useIdentityGetMe: () => ({ data: { role: "admin" } }),
  useListAdminUsers: () => ({
    data: {
      data: [{
        id: "admin-1",
        name: "Morgan Moderator",
        email: "morgan@example.com",
        role: "moderator",
        isActive: true,
      }],
    },
    isLoading: false,
  }),
  useUpdateAdminUser: () => ({ mutateAsync: mocks.updateAsync, isPending: false }),
}));
vi.mock("@/lib/i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("AdminUsersList", () => {
  beforeEach(() => {
    mocks.updateAsync.mockReset();
    mocks.updateAsync.mockResolvedValue({});
    mocks.deleteAsync.mockReset();
    mocks.invalidateQueries.mockReset();
  });

  it("renders scoped admins and allows editing a lower-role account", async () => {
    const user = userEvent.setup();
    render(<AdminUsersList />);

    expect(screen.getByText("Morgan Moderator")).toBeInTheDocument();
    expect(screen.getByText("morgan@example.com")).toBeInTheDocument();

    await user.click(screen.getByTitle("Edit admin account"));
    const nameField = screen.getByLabelText("Name");
    await user.clear(nameField);
    await user.type(nameField, "Morgan Lee");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(mocks.updateAsync).toHaveBeenCalledWith({
      id: "admin-1",
      data: {
        name: "Morgan Lee",
        email: "morgan@example.com",
        role: "moderator",
      },
    }));
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["admin-users", { search: "" }],
    });
  });

  it("filters the list using the search field", async () => {
    const user = userEvent.setup();
    render(<AdminUsersList />);

    await user.type(screen.getByPlaceholderText("users.searchAdminPlaceholder"), "morgan");

    expect(screen.getByDisplayValue("morgan")).toBeInTheDocument();
  });
});
