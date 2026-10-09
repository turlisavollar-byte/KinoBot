'use client';

import { Film, Mail, Phone, Send, Facebook, Instagram, Youtube, Github, Twitter, Linkedin, type LucideIcon } from 'lucide-react';
import { useLang } from '@/components/language-provider';
import { siteConfig, VISIBLE_SOCIAL_LINKS } from '@/config';

const socialIcons: Record<string, LucideIcon> = {
  Send,
  Facebook,
  Instagram,
  Youtube,
  Github,
  Twitter,
  Linkedin,
};

export function Footer() {
  const { t } = useLang();
  const sectionLinks = ['#features', '#pricing', '#demo', '#faq'];
  const emailUrl = siteConfig.contactEmail ? `mailto:${siteConfig.contactEmail}` : '#contact';
  const phoneUrl = siteConfig.contactPhone ? `tel:${siteConfig.contactPhone.replace(/\s/g, '')}` : '#contact';

  const footerHref = (categoryIndex: number, linkIndex: number) => {
    if (categoryIndex === 0) return sectionLinks[linkIndex] ?? '#contact';
    if (categoryIndex === 1 || categoryIndex === 2) return linkIndex === 2 && categoryIndex === 2 ? '#faq' : '#contact';
    return '#contact';
  };

  return (
    <footer className="bg-slate-900 pt-16 pb-8 dark:bg-black">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <a
              href="#"
              className="flex items-center gap-2 text-xl font-extrabold"
              onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 text-white">
                <Film className="h-5 w-5" />
              </span>
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">{siteConfig.name}</span>
            </a>
            <p className="mt-4 max-w-xs text-sm text-slate-400">{t.footer.description}</p>
            <div className="mt-6 flex gap-3">
              {VISIBLE_SOCIAL_LINKS.map((link) => {
                const Icon = socialIcons[link.icon];
                if (!Icon) return null;
                return (
                  <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 transition-colors hover:bg-blue-600 hover:text-white dark:bg-slate-800" style={{ color: link.color }} aria-label={link.name} title={link.name}>
                    <Icon className="h-5 w-5" />
                  </a>
                );
              })}
              <a href={emailUrl} className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-slate-400 transition-colors hover:bg-blue-600 hover:text-white dark:bg-slate-800" aria-label="Email">
                <Mail className="h-5 w-5" />
              </a>
              <a href={phoneUrl} className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-slate-400 transition-colors hover:bg-blue-600 hover:text-white dark:bg-slate-800" aria-label="Phone">
                <Phone className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-8">
            {Object.entries(t.footer.columns).map(([category, links]) => (
              <div key={category}>
                <h4 className="text-sm font-bold uppercase tracking-wide text-white">{category}</h4>
                <ul className="mt-4 space-y-3">
                  {links.map((link, i) => (
                    <li key={i}>
                      <a
                        href={footerHref(Object.keys(t.footer.columns).indexOf(category), i)}
                        className="text-sm text-slate-400 transition-colors hover:text-white"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 border-t border-slate-800 pt-8 text-center">
          <p className="text-sm text-slate-500">&copy; {t.footer.copyright}</p>
        </div>
      </div>
    </footer>
  );
}
