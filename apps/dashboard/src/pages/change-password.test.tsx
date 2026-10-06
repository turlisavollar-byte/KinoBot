import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ChangePassword from "./change-password";
import { setMustChangePasswordRequired } from "@/lib/password-change-flow";

const mocks = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  removeQueries: vi.fn(),
  setLocation: vi.fn(),
}));

vi.mock("@/lib/api-fetch", () => ({ apiFetch: mocks.apiFetch }));
vi.mock("@/lib/auth-token", () => ({ getAccessToken: () => "access-token" }));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ removeQueries: mocks.removeQueries }),
}));
vi.mock("@workspace/api-client-react", () => ({
  getIdentityGetMeQueryKey: () => ["identity", "me"],
}));
vi.mock("wouter", () => ({ useLocation: () => ["/change-password", mocks.setLocation] }));

describe("ChangePassword", () => {
  beforeEach(() => {
    sessionStorage.clear();
    setMustChangePasswordRequired(true);
    mocks.apiFetch.mockReset();
    mocks.apiFetch.mockResolvedValue({ success: true });
    mocks.removeQueries.mockReset();
    mocks.setLocation.mockReset();
  });

  it("validates matching strong passwords before making the request", async () => {
    const user = userEvent.setup();
    render(<ChangePassword />);
    await user.type(screen.getByLabelText("Joriy parol"), "Temporary123!");
    await user.type(screen.getByLabelText("Yangi parol"), "Weak");
    await user.type(screen.getByLabelText("Yangi parolni tasdiqlang"), "Weak");
    await user.click(screen.getByRole("button", { name: "Parolni yangilash" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/kamida 8 ta belgidan/);
    expect(mocks.apiFetch).not.toHaveBeenCalled();
  });

  it("submits password change, clears the forced flag, and returns to dashboard", async () => {
    const user = userEvent.setup();
    render(<ChangePassword />);
    await user.type(screen.getByLabelText("Joriy parol"), "Temporary123!");
    await user.type(screen.getByLabelText("Yangi parol"), "NewSecure123!");
    await user.type(screen.getByLabelText("Yangi parolni tasdiqlang"), "NewSecure123!");
    await user.click(screen.getByRole("button", { name: "Parolni yangilash" }));

    await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalledWith(
      "/api/identity/auth/change-password",
      {
        method: "POST",
        body: JSON.stringify({
          currentPassword: "Temporary123!",
          newPassword: "NewSecure123!",
        }),
      },
    ));
    await waitFor(() => expect(mocks.setLocation).toHaveBeenCalledWith("/"));
    expect(sessionStorage.getItem("must_change_password")).toBeNull();
    expect(mocks.removeQueries).toHaveBeenCalledWith({ queryKey: ["identity", "me"] });
  });
});
