export * from "./routes";
import { routes } from "./routes";

import { Film, Tv, Compass, Home } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const APP_NAME = "StreamX";

export const APP_CONFIG = {
  name: APP_NAME,
  description: "Premium streaming platform for movies and TV series",
  url: "https://streamx.com",
  locale: "en_US",
} as const;

export const CONTENT_LIMITS = {
  trendingMovies: 10,
  trendingSeries: 10,
  continueWatching: 10,
  top10: 10,
  newReleases: 12,
  searchResults: 24,
  similarItems: 6,
} as const;

export const PLAYER_CONFIG = {
  skipSeconds: 10,
  progressIntervalMs: 1000,
  defaultQuality: "auto",
  defaultVolume: 1,
  progressSaveIntervalMs: 5000,
} as const;

export const SOCIAL_LINKS = [
  { label: "Twitter", href: "https://twitter.com", icon: "Twitter" },
  { label: "Instagram", href: "https://instagram.com", icon: "Instagram" },
  { label: "GitHub", href: "https://github.com", icon: "Github" },
] as const;

export interface NavItem {
  href: string;
  label: string;
  icon?: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: routes.home, label: "Home", icon: Home },
  { href: routes.browse, label: "Browse", icon: Compass },
  { href: routes.movies, label: "Movies", icon: Film },
  { href: routes.series, label: "Series", icon: Tv },
];

export interface FooterLinkGroup {
  title: string;
  links: { label: string; href: string }[];
}

export const FOOTER_LINKS: FooterLinkGroup[] = [
  {
    title: "Product",
    links: [
      { label: "Movies", href: routes.movies },
      { label: "TV Series", href: routes.series },
      { label: "Browse", href: routes.browse },
      { label: "New Releases", href: "/browse?filter=new" },
      { label: "Trending", href: "/browse?filter=trending" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Press", href: "/press" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help Center", href: "/help" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Cookie Preferences", href: "/cookies" },
    ],
  },
  {
    title: "Subscriptions",
    links: [
      { label: "Plans", href: routes.subscriptions },
      { label: "Premium", href: "/subscriptions?plan=premium" },
      { label: "Gift Cards", href: "/gift-cards" },
    ],
  },
];
