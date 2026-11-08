import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/lib/api-fetch", () => ({ apiFetch: mocks.apiFetch }));
vi.mock("@workspace/api-client-react", () => ({
  useIdentityGetMe: () => ({
    data: { email: "admin@example.com", role: "admin" },
  }),
}));
vi.mock("@/lib/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    formatDate: () => "Jan 1, 2026",
  }),
}));
vi.mock("sonner", () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));

describe("Settings trial duration controls", () => {
  beforeEach(() => {
    mocks.apiFetch.mockReset();
    mocks.toastSuccess.mockReset();
    mocks.toastError.mockReset();
  });

  it("loads and displays the saved trial duration", async () => {
    mocks.apiFetch.mockResolvedValueOnce({
      success: true,
      data: { trial_duration_days: 7 },
    });

    render(<SettingsPage />);

    await waitFor(() =>
      expect(screen.getByLabelText("settings.trialDurationDays")).toHaveValue(
        7,
      ),
    );
    expect(mocks.apiFetch).toHaveBeenCalledWith("/api/settings");
  });

  it("saves the trial duration and shows a success toast", async () => {
    mocks.apiFetch
      .mockResolvedValueOnce({
        success: true,
        data: { trial_duration_days: 30 },
      })
      .mockResolvedValueOnce({
        success: true,
        data: { trial_duration_days: 14 },
      });
    const user = userEvent.setup();

    render(<SettingsPage />);
    const input = await screen.findByLabelText("settings.trialDurationDays");
    await waitFor(() => expect(input).toHaveValue(30));
    await user.clear(input);
    await user.type(input, "14");
    await user.click(
      screen.getByRole("button", { name: "settings.trialSave" }),
    );

    await waitFor(() =>
      expect(mocks.apiFetch).toHaveBeenLastCalledWith(
        "/api/settings",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ trial_duration_days: 14 }),
        }),
      ),
    );
    expect(mocks.toastSuccess).toHaveBeenCalledWith("settings.trialSaved");
  });

  it("shows an inline error when loading settings fails", async () => {
    mocks.apiFetch.mockRejectedValueOnce(new Error("network error"));

    render(<SettingsPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "settings.trialLoadFailed",
    );
  });

  it("shows an error toast when saving settings fails", async () => {
    mocks.apiFetch
      .mockResolvedValueOnce({
        success: true,
        data: { trial_duration_days: 30 },
      })
      .mockRejectedValueOnce(new Error("network error"));
    const user = userEvent.setup();

    render(<SettingsPage />);
    const input = await screen.findByLabelText("settings.trialDurationDays");
    await waitFor(() => expect(input).toHaveValue(30));
    await user.click(
      screen.getByRole("button", { name: "settings.trialSave" }),
    );

    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith("settings.trialSaveFailed"),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "settings.trialSaveFailed",
    );
  });
});

import SettingsPage from "./index";
