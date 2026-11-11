import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Login from "./login";

const mocks = vi.hoisted(() => ({
  loginMutate: vi.fn(),
  registerMutate: vi.fn(),
  setQueryData: vi.fn(),
  setLocation: vi.fn(),
  setTokens: vi.fn(),
  setMustChangePasswordRequired: vi.fn(),
  mustChange: true,
}));

vi.mock("@workspace/api-client-react", () => ({
  useIdentityLogin: () => ({ mutate: mocks.loginMutate, isPending: false }),
  useIdentityRegister: () => ({ mutate: mocks.registerMutate, isPending: false }),
  getIdentityGetMeQueryKey: () => ["identity", "me"],
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ setQueryData: mocks.setQueryData }),
}));
vi.mock("wouter", () => ({ useLocation: () => ["/", mocks.setLocation] }));
vi.mock("@/components/theme-provider", () => ({
  useTheme: () => ({ theme: "light", setTheme: vi.fn() }),
}));
vi.mock("@/lib/password-change-flow", () => ({
  setMustChangePasswordRequired: mocks.setMustChangePasswordRequired,
}));
vi.mock("@/lib/auth-token", () => ({ setTokens: mocks.setTokens }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ t: (key: string) => key }) }));

describe("login forced-password routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mustChange = true;
    mocks.loginMutate.mockImplementation((_variables, callbacks) => {
      callbacks.onSuccess({
        accessToken: "access",
        refreshToken: "refresh",
        mustChangePassword: mocks.mustChange,
        user: { id: "admin-1", email: "admin@example.com", role: "admin", permissions: [] },
      });
    });
  });

  it("sends temporary-password accounts to the mandatory change page", async () => {
    const user = userEvent.setup();
    render(<Login />);
    await user.type(screen.getByLabelText("login.email"), "admin@example.com");
    await user.type(screen.getByLabelText("login.password"), "Temporary123!");
    await user.click(screen.getByRole("button", { name: "login.signIn" }));

    await waitFor(() => expect(mocks.setLocation).toHaveBeenCalledWith("/change-password"));
    expect(mocks.setMustChangePasswordRequired).toHaveBeenCalledWith(true);
  });

  it("sends users without a forced change directly to dashboard", async () => {
    mocks.mustChange = false;
    const user = userEvent.setup();
    render(<Login />);
    await user.type(screen.getByLabelText("login.email"), "admin@example.com");
    await user.type(screen.getByLabelText("login.password"), "Regular123!");
    await user.click(screen.getByRole("button", { name: "login.signIn" }));

    await waitFor(() => expect(mocks.setLocation).toHaveBeenCalledWith("/"));
    expect(mocks.setMustChangePasswordRequired).toHaveBeenCalledWith(false);
  });
});
