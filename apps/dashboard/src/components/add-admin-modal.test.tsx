import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AddAdminModal } from "./add-admin-modal";

const { mutateAsync, toastMock } = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  toastMock: vi.fn(),
}));

vi.mock("@workspace/api-client-react", () => ({
  useCreateAdminUser: () => ({ mutateAsync, isPending: false }),
}));
vi.mock("@/hooks/use-toast", () => ({ toast: toastMock }));

describe("AddAdminModal", () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    mutateAsync.mockResolvedValue({ data: { email: "new-admin@example.com" } });
    toastMock.mockReset();
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

    await user.type(
      screen.getByLabelText("Email"),
      "  new-admin@example.com  ",
    );
    await user.click(screen.getByRole("button", { name: /generate/i }));
    const password = (screen.getByLabelText("Password") as HTMLInputElement)
      .value;
    expect(password).toHaveLength(16);
    expect(password).toMatch(/[A-Z]/);
    expect(password).toMatch(/[a-z]/);
    expect(password).toMatch(/[0-9]/);
    expect(password).toMatch(/[!@#$%^&*]/);
    expect(password).toMatch(/^[A-Za-z0-9!@#$%^&*]+$/);

    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        data: {
          email: "new-admin@example.com",
          role: "admin",
          password,
        },
      }),
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
    expect(screen.getByText(password)).toBeInTheDocument();
    expect(screen.getByText(/will not be shown again/i)).toBeInTheDocument();
  });

  it("selects the password and asks the user to copy it manually", async () => {
    const user = userEvent.setup();
    const clipboardWriteText = vi.fn();
    const execCommand = vi.fn();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: clipboardWriteText },
    });
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommand,
    });

    render(<AddAdminModal open onClose={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /generate/i }));
    const passwordInput = screen.getByLabelText("Password") as HTMLInputElement;
    const password = passwordInput.value;
    await user.click(screen.getByRole("button", { name: /copy password/i }));

    expect(passwordInput).toHaveFocus();
    expect(passwordInput.selectionStart).toBe(0);
    expect(passwordInput.selectionEnd).toBe(password.length);
    expect(clipboardWriteText).not.toHaveBeenCalled();
    expect(execCommand).not.toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith({
      title: "Parol belgilandi",
      description: "Nusxalash uchun Ctrl+C bosing.",
    });
  });
});
