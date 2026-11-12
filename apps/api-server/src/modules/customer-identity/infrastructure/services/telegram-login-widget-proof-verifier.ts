import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import {
  ExternalIdentityProofConfigurationError,
  InvalidExternalIdentityProofError,
} from "../../application/errors/customer-identity.errors";
import type { ExternalIdentityProofVerifier } from "../../application/ports/customer-identity.unit-of-work";

export interface TelegramLoginWidgetProof {
  id: string | number;
  auth_date: string | number;
  hash: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

export class TelegramLoginWidgetProofVerifier implements ExternalIdentityProofVerifier<TelegramLoginWidgetProof> {
  constructor(
    private readonly getBotToken: () => string | undefined = () =>
      process.env.TELEGRAM_BOT_TOKEN,
    private readonly now: () => number = Date.now,
    private readonly maxAgeSeconds = 300,
  ) {}

  async verify(proof: TelegramLoginWidgetProof): Promise<{
    provider: "telegram";
    subject: string;
    verifiedAt: Date;
  }> {
    const botToken = this.getBotToken();
    if (!botToken) {
      throw new ExternalIdentityProofConfigurationError();
    }

    const subject = String(proof.id);
    const authDate = Number(proof.auth_date);
    if (
      !/^\d+$/.test(subject) ||
      BigInt(subject) <= 0n ||
      !Number.isSafeInteger(authDate) ||
      !/^[a-f0-9]{64}$/i.test(proof.hash)
    ) {
      throw new InvalidExternalIdentityProofError();
    }

    const nowSeconds = Math.floor(this.now() / 1000);
    if (
      authDate > nowSeconds + 30 ||
      nowSeconds - authDate > this.maxAgeSeconds
    ) {
      throw new InvalidExternalIdentityProofError();
    }

    const fields: Array<[string, string | number | undefined]> = [
      ["auth_date", proof.auth_date],
      ["first_name", proof.first_name],
      ["id", proof.id],
      ["last_name", proof.last_name],
      ["photo_url", proof.photo_url],
      ["username", proof.username],
    ];
    const dataCheckString = fields
      .filter(([, value]) => value !== undefined)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");
    const secretKey = createHash("sha256").update(botToken).digest();
    const expectedHash = createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest();
    const suppliedHash = Buffer.from(proof.hash, "hex");
    if (
      suppliedHash.length !== expectedHash.length ||
      !timingSafeEqual(suppliedHash, expectedHash)
    ) {
      throw new InvalidExternalIdentityProofError();
    }

    return {
      provider: "telegram",
      subject,
      verifiedAt: new Date(authDate * 1000),
    };
  }
}
