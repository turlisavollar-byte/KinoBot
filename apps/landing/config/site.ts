export const siteConfig = {
  url: process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? '',
  name: process.env.NEXT_PUBLIC_SITE_NAME ?? 'KinoBot',
  description:
    process.env.NEXT_PUBLIC_SITE_DESCRIPTION ??
    'Telegram bot + Admin panel platformasi. Kino biznesingizni avtomatlashtiring.',
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? '',
  contactPhone: process.env.NEXT_PUBLIC_CONTACT_PHONE ?? '',
  contactAddress: process.env.NEXT_PUBLIC_CONTACT_ADDRESS ?? '',
  telegramSupport: process.env.NEXT_PUBLIC_TELEGRAM_SUPPORT ?? '',
  telegramChannel: process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL ?? '',
  ga4Id: process.env.NEXT_PUBLIC_GA4_ID ?? '',
  yandexMetricaId: process.env.NEXT_PUBLIC_YANDEX_METRICA_ID ?? '',
  showDemo: process.env.NEXT_PUBLIC_SHOW_DEMO !== 'false',
  showTestimonials: process.env.NEXT_PUBLIC_SHOW_TESTIMONIALS !== 'false',
  showPricing: process.env.NEXT_PUBLIC_SHOW_PRICING !== 'false',
} as const;

export const contactConfig = {
  email: siteConfig.contactEmail,
  phone: siteConfig.contactPhone,
  address: siteConfig.contactAddress,
  telegram: siteConfig.telegramSupport,
} as const;
