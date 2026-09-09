import { loadBillingConfig } from "./billingConfig";

describe("billingConfig", () => {
  it("loads provider configuration from an injected environment", () => {
    const config = loadBillingConfig({
      CLICK_MERCHANT_ID: "click-merchant",
      CLICK_CHECKOUT_BASE_URL: "https://sandbox.click.test/pay",
      BILLING_WEBHOOK_MAX_AGE_SECONDS: "900",
    });

    expect(config.click.merchantId).toBe("click-merchant");
    expect(config.click.checkoutBaseUrl).toBe("https://sandbox.click.test/pay");
    expect(config.webhookMaxAgeSeconds).toBe(900);
    expect(config.p2p.enabled).toBe(false);
  });

  it("uses safe defaults for invalid replay configuration", () => {
    const config = loadBillingConfig({
      BILLING_WEBHOOK_MAX_AGE_SECONDS: "invalid",
    });

    expect(config.webhookMaxAgeSeconds).toBe(300);
    expect(config.nbu.secretKey).toBe("");
  });

  it("enables P2P only when explicitly configured", () => {
    const config = loadBillingConfig({
      P2P_ENABLED: "yes",
      P2P_MERCHANT_ID: "p2p-merchant",
      P2P_API_URL: "https://p2p.test/api",
    });

    expect(config.p2p.enabled).toBe(true);
    expect(config.p2p.merchantId).toBe("p2p-merchant");
    expect(config.p2p.apiUrl).toBe("https://p2p.test/api");
  });

  it("only enables explicitly listed payment providers", () => {
    const config = loadBillingConfig({
      BILLING_ENABLED_PROVIDERS: " p2p, payme, p2p, unsupported ",
    });

    expect(config.enabledProviders).toEqual(["p2p", "payme"]);
  });
});
