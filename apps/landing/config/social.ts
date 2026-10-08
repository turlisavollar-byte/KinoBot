import { siteConfig } from './site';

export const SOCIAL_LINKS = {
  telegramSupport: siteConfig.telegramSupport,
  telegramChannel: siteConfig.telegramChannel,
  email: siteConfig.contactEmail,
  phone: siteConfig.contactPhone,
} as const;
