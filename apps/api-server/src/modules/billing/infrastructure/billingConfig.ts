type Env = Record<string, string | undefined>;

function read(env: Env, key: string): string {
  return env[key]?.trim() ?? "";
}

function readBoolean(env: Env, key: string, fallback: boolean): boolean {
  const value = read(env, key).toLowerCase();
  if (!value) return fallback;
  return value === "true" || value === "1" || value === "yes";
}

const supportedPaymentProviders = [
  "payme",
  "click",
  "uzum",
  "paynet",
  "anor",
  "nbu",
  "uzcard",
  "octo",
  "p2p",
] as const;

export type ConfiguredPaymentProvider =
  (typeof supportedPaymentProviders)[number];

function enabledPaymentProviders(env: Env): ConfiguredPaymentProvider[] {
  const configured = read(env, "BILLING_ENABLED_PROVIDERS")
    .split(",")
    .map((provider) => provider.trim().toLowerCase())
    .filter((provider): provider is ConfiguredPaymentProvider =>
      supportedPaymentProviders.includes(provider as ConfiguredPaymentProvider),
    );

  return [...new Set(configured)];
}

function positiveSeconds(env: Env): number {
  const value = Number(read(env, "BILLING_WEBHOOK_MAX_AGE_SECONDS") || "300");
  return Number.isInteger(value) && value > 0 ? value : 300;
}

export interface BillingConfig {
  webhookMaxAgeSeconds: number;
  enabledProviders: ConfiguredPaymentProvider[];
  click: {
    merchantId: string;
    serviceId: string;
    secretKey: string;
    merchantUserId: string;
    checkoutBaseUrl: string;
  };
  payme: {
    merchantId: string;
    secretKey: string;
    checkoutBaseUrl: string;
  };
  uzum: {
    merchantId: string;
    secretKey: string;
    terminalId: string;
    checkoutBaseUrl: string;
  };
  paynet: {
    merchantId: string;
    serviceId: string;
    secretKey: string;
    checkoutBaseUrl: string;
  };
  anor: {
    merchantId: string;
    secretKey: string;
    checkoutBaseUrl: string;
  };
  nbu: {
    merchantId: string;
    terminalId: string;
    secretKey: string;
    checkoutBaseUrl: string;
  };
  uzcard: {
    merchantId: string;
    terminalId: string;
    secretKey: string;
    checkoutBaseUrl: string;
  };
  octo: {
    merchantId: string;
    shopId: string;
    secretKey: string;
    checkoutBaseUrl: string;
  };
  p2p: {
    enabled: boolean;
    merchantId: string;
    secretKey: string;
    apiUrl: string;
    checkoutBaseUrl: string;
  };
}

export function loadBillingConfig(env: Env = process.env): BillingConfig {
  return {
    webhookMaxAgeSeconds: positiveSeconds(env),
    enabledProviders: enabledPaymentProviders(env),
    click: {
      merchantId: read(env, "CLICK_MERCHANT_ID"),
      serviceId: read(env, "CLICK_SERVICE_ID"),
      secretKey: read(env, "CLICK_SECRET_KEY"),
      merchantUserId: read(env, "CLICK_MERCHANT_USER_ID"),
      checkoutBaseUrl:
        read(env, "CLICK_CHECKOUT_BASE_URL") ||
        "https://my.click.uz/services/pay",
    },
    payme: {
      merchantId: read(env, "PAYME_MERCHANT_ID"),
      secretKey: read(env, "PAYME_KEY"),
      checkoutBaseUrl:
        read(env, "PAYME_CHECKOUT_BASE_URL") || "https://checkout.paycom.uz",
    },
    uzum: {
      merchantId: read(env, "UZUM_MERCHANT_ID"),
      secretKey: read(env, "UZUM_SECRET_KEY"),
      terminalId: read(env, "UZUM_TERMINAL_ID"),
      checkoutBaseUrl:
        read(env, "UZUM_CHECKOUT_BASE_URL") || "https://checkout.uzum.uz/pay",
    },
    paynet: {
      merchantId: read(env, "PAYNET_TERMINAL_ID"),
      serviceId: read(env, "PAYNET_SERVICE_ID"),
      secretKey: read(env, "PAYNET_PASSWORD"),
      checkoutBaseUrl:
        read(env, "PAYNET_CHECKOUT_BASE_URL") ||
        "https://checkout.paynet.uz/pay",
    },
    anor: {
      merchantId: read(env, "ANOR_MERCHANT_ID"),
      secretKey: read(env, "ANOR_SECRET_KEY"),
      checkoutBaseUrl:
        read(env, "ANOR_CHECKOUT_BASE_URL") || "https://checkout.anor.uz/pay",
    },
    nbu: {
      merchantId: read(env, "NBU_MERCHANT_ID"),
      terminalId: read(env, "NBU_TERMINAL_ID"),
      secretKey: read(env, "NBU_SECRET_KEY"),
      checkoutBaseUrl:
        read(env, "NBU_CHECKOUT_BASE_URL") || "https://checkout.nbu.uz/pay",
    },
    uzcard: {
      merchantId: read(env, "UZCARD_MERCHANT_ID"),
      terminalId: read(env, "UZCARD_TERMINAL_ID"),
      secretKey: read(env, "UZCARD_SECRET_KEY"),
      checkoutBaseUrl:
        read(env, "UZCARD_CHECKOUT_BASE_URL") ||
        "https://checkout.uzcard.uz/pay",
    },
    octo: {
      merchantId: read(env, "OCTO_MERCHANT_ID"),
      shopId: read(env, "OCTO_SHOP_ID"),
      secretKey: read(env, "OCTO_SECRET_KEY"),
      checkoutBaseUrl:
        read(env, "OCTO_CHECKOUT_BASE_URL") || "https://checkout.octo.uz/pay",
    },
    p2p: {
      enabled: readBoolean(env, "P2P_ENABLED", false),
      merchantId: read(env, "P2P_MERCHANT_ID"),
      secretKey: read(env, "P2P_SECRET_KEY"),
      apiUrl: read(env, "P2P_API_URL"),
      checkoutBaseUrl: read(env, "P2P_CHECKOUT_BASE_URL"),
    },
  };
}

export const billingConfig = loadBillingConfig();
