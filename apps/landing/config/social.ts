import { siteConfig } from './site';

export interface SocialLink {
  id: string;
  name: string;
  url: string;
  icon: string;
  color: string;
  visible: boolean;
}

export const SOCIAL_LINKS: SocialLink[] = [
  {
    id: 'telegram',
    name: 'Telegram',
    url: process.env.NEXT_PUBLIC_TELEGRAM_URL || siteConfig.telegramSupport || 'https://t.me/streamxuz',
    icon: 'Send',
    color: '#0088cc',
    visible: true,
  },
  {
    id: 'facebook',
    name: 'Facebook',
    url: process.env.NEXT_PUBLIC_FACEBOOK_URL || siteConfig.facebookUrl || 'https://www.facebook.com/share/p/1Db8hJeCnH/',
    icon: 'Facebook',
    color: '#1877f2',
    visible: true,
  },
  {
    id: 'instagram',
    name: 'Instagram',
    url: process.env.NEXT_PUBLIC_INSTAGRAM_URL || '',
    icon: 'Instagram',
    color: '#e4405f',
    visible: false,
  },
  {
    id: 'youtube',
    name: 'YouTube',
    url: process.env.NEXT_PUBLIC_YOUTUBE_URL || '',
    icon: 'Youtube',
    color: '#ff0000',
    visible: false,
  },
  {
    id: 'github',
    name: 'GitHub',
    url: process.env.NEXT_PUBLIC_GITHUB_URL || '',
    icon: 'Github',
    color: '#333333',
    visible: false,
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    url: process.env.NEXT_PUBLIC_TWITTER_URL || '',
    icon: 'Twitter',
    color: '#1da1f2',
    visible: false,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    url: process.env.NEXT_PUBLIC_LINKEDIN_URL || '',
    icon: 'Linkedin',
    color: '#0077b5',
    visible: false,
  },
];

export const VISIBLE_SOCIAL_LINKS = SOCIAL_LINKS.filter(
  (link) => link.visible && link.url !== '',
);
