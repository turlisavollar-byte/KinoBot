import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AddAdminModal } from "./add-admin-modal";

const { mutateAsync } = vi.hoisted(() => ({ mutateAsync: vi.fn() }));

vi.mock("@workspace/api-client-react", () => ({
  useCreateAdminUser: () => ({ mutateAsync, isPending: false }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("AddAdminModal", () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    mutateAsync.mockResolvedValue({ data: { email: "new-admin@example.com" } });
  });

  it("requires an email before creating an admin", async () => {
    const user = userEvent.setup();
    render(<AddAdminModal open onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("creates the selected admin account and shows the one-time password", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    render(<AddAdminModal open onClose={vi.fn()} onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText("Email"), "  new-admin@example.com  ");
    await user.click(screen.getByRole("button", { name: /generate/i }));
    const password = (screen.getByLabelText("Password") as HTMLInputElement).value;
    expect(password).toHaveLength(16);

    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({
      data: {
        email: "new-admin@example.com",
        role: "admin",
        password,
      },
    }));
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(screen.getByText(password)).toBeInTheDocument();
    expect(screen.getByText(/will not be shown again/i)).toBeInTheDocument();
  });
});
