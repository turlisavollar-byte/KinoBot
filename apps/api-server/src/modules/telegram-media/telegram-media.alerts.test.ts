import { describe, expect, it, vi } from "vitest";
import { sendTelegramMediaFailureAlert } from "./telegram-media.alerts";

describe("sendTelegramMediaFailureAlert", () => {
  it("sends a secret-free alert to the configured destination", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    await sendTelegramMediaFailureAlert({ sendMessage }, "ops-chat", "media-job-1");
    expect(sendMessage).toHaveBeenCalledWith(
      "ops-chat",
      "ALERT: Telegram media upload exhausted its retries. Job: media-job-1",
    );
  });

  it("does not attempt delivery without a destination", async () => {
    const sendMessage = vi.fn();
    await expect(
      sendTelegramMediaFailureAlert({ sendMessage }, "  ", "media-job-1"),
    ).rejects.toThrow("destination is not configured");
    expect(sendMessage).not.toHaveBeenCalled();
  });
});
