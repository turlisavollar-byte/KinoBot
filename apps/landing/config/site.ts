export const SITE_CONFIG = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || 'StreamX',
  url: (process.env.NEXT_PUBLIC_SITE_URL || 'https://streamx.uz').replace(/\/$/, ''),
  description: process.env.NEXT_PUBLIC_SITE_DESCRIPTION || 'Kino streaming platformasi',
  locale: process.env.NEXT_PUBLIC_SITE_LOCALE || 'uz',
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'info@streamx.uz',
  phone: process.env.NEXT_PUBLIC_CONTACT_PHONE || '',
  contactAddress: process.env.NEXT_PUBLIC_CONTACT_ADDRESS || '',
  demo: {
    videoUrl: process.env.NEXT_PUBLIC_DEMO_VIDEO_URL || '',
    botUrl: process.env.NEXT_PUBLIC_DEMO_BOT_URL || 'https://t.me/streamx_demo_bot',
    adminUrl: process.env.NEXT_PUBLIC_DEMO_ADMIN_URL || '',
  },
  socials: {
    telegramSupport: process.env.NEXT_PUBLIC_TELEGRAM_SUPPORT || 'https://t.me/streamx_support',
    telegramChannel: process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL || 'https://t.me/streamx',
    facebook: process.env.NEXT_PUBLIC_FACEBOOK_URL || '',
  },
  analytics: {
    ga4Id: process.env.NEXT_PUBLIC_GA4_ID || '',
    yandexMetricaId: process.env.NEXT_PUBLIC_YANDEX_METRICA_ID || '',
  },
  features: {
    showDemo: process.env.NEXT_PUBLIC_SHOW_DEMO === 'true',
    showTestimonials: process.env.NEXT_PUBLIC_SHOW_TESTIMONIALS === 'true',
    showPricing: process.env.NEXT_PUBLIC_SHOW_PRICING === 'true',
    showFaq: process.env.NEXT_PUBLIC_SHOW_FAQ === 'true',
  },
} as const;

export const siteConfig = {
  url: SITE_CONFIG.url,
  name: SITE_CONFIG.name,
  description: SITE_CONFIG.description,
  contactEmail: SITE_CONFIG.email,
  contactPhone: SITE_CONFIG.phone,
  contactAddress: SITE_CONFIG.contactAddress,
  telegramSupport: SITE_CONFIG.socials.telegramSupport,
  telegramChannel: SITE_CONFIG.socials.telegramChannel,
  facebookUrl: SITE_CONFIG.socials.facebook,
  ga4Id: SITE_CONFIG.analytics.ga4Id,
  yandexMetricaId: SITE_CONFIG.analytics.yandexMetricaId,
  showDemo: SITE_CONFIG.features.showDemo,
  showTestimonials: SITE_CONFIG.features.showTestimonials,
  showPricing: SITE_CONFIG.features.showPricing,
  showFaq: SITE_CONFIG.features.showFaq,
} as const;

export const contactConfig = {
  email: siteConfig.contactEmail,
  phone: siteConfig.contactPhone,
  address: siteConfig.contactAddress,
  telegram: siteConfig.telegramSupport,
} as const;
