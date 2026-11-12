import { createHash, createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  ExternalIdentityProofConfigurationError,
  InvalidExternalIdentityProofError,
} from "../../application/errors/customer-identity.errors";
import {
  TelegramLoginWidgetProofVerifier,
  type TelegramLoginWidgetProof,
} from "./telegram-login-widget-proof-verifier";

const botToken = "test-telegram-bot-token";
const now = 1_700_000_000_000;

function createProof(
  fields: Omit<TelegramLoginWidgetProof, "hash">,
): TelegramLoginWidgetProof {
  const dataCheckString = Object.entries(fields)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = createHash("sha256").update(botToken).digest();
  const hash = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  return { ...fields, hash };
}

describe("TelegramLoginWidgetProofVerifier", () => {
  it("validates the signed Telegram subject and fresh auth date", async () => {
    const verifier = new TelegramLoginWidgetProofVerifier(
      () => botToken,
      () => now,
    );
    const proof = createProof({
      id: "12345",
      auth_date: String(now / 1000),
      first_name: "Test",
      username: "test_user",
    });

    await expect(verifier.verify(proof)).resolves.toMatchObject({
      provider: "telegram",
      subject: "12345",
      verifiedAt: new Date(now),
    });
  });

  it("rejects modified or stale signed proof", async () => {
    const verifier = new TelegramLoginWidgetProofVerifier(
      () => botToken,
      () => now,
    );
    const proof = createProof({
      id: "12345",
      auth_date: String(now / 1000),
      first_name: "Test",
    });

    await expect(
      verifier.verify({ ...proof, first_name: "Modified" }),
    ).rejects.toBeInstanceOf(InvalidExternalIdentityProofError);
    await expect(
      verifier.verify(
        createProof({
          id: "12345",
          auth_date: String(now / 1000 - 301),
        }),
      ),
    ).rejects.toBeInstanceOf(InvalidExternalIdentityProofError);
  });

  it("fails explicitly when Telegram verification is not configured", async () => {
    const verifier = new TelegramLoginWidgetProofVerifier(
      () => undefined,
      () => now,
    );

    await expect(
      verifier.verify(
        createProof({
          id: "12345",
          auth_date: String(now / 1000),
        }),
      ),
    ).rejects.toBeInstanceOf(ExternalIdentityProofConfigurationError);
  });
});
