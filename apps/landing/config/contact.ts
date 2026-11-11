import { siteConfig } from './site';

export const CONTACT_DETAILS = {
  email: siteConfig.contactEmail,
  phone: siteConfig.contactPhone,
  address: siteConfig.contactAddress,
  telegram: siteConfig.telegramSupport,
  hours: '24/7',
} as const;
