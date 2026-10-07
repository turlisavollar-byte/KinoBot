'use client';

import { useState, useEffect } from 'react';
import { Menu, X, Film, ArrowRight, Sun, Moon, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/theme-provider';
import { useLang } from '@/components/language-provider';
import { Language } from '@/lib/translations';

const langLabels: Record<Language, string> = {
  uz: 'UZ',
  ru: 'RU',
  en: 'EN',
};

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang, t } = useLang();

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > 20) setScrolled(true);
      else setScrolled(false);
      if (currentScrollY > lastScrollY && currentScrollY > 200 && !mobileOpen) setHidden(true);
      else setHidden(false);
      setLastScrollY(currentScrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, mobileOpen]);

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
  };

  const navLinks = [
    { label: t.nav.features, href: '#features' },
    { label: t.nav.pricing, href: '#pricing' },
    { label: t.nav.demo, href: '#demo' },
    { label: t.nav.faq, href: '#faq' },
  ];

  return (
    <>
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          scrolled ? 'glass shadow-sm' : 'bg-transparent',
          hidden ? '-translate-y-full' : 'translate-y-0'
        )}
      >
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a
            href="#"
            className="flex items-center gap-2 text-xl font-extrabold"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 text-white">
              <Film className="h-5 w-5" />
            </span>
            <span className="text-gradient-hero">KinoBot</span>
          </a>

          <div className="hidden items-center gap-8 lg:flex">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => handleNavClick(link.href)}
                className="text-sm font-medium text-slate-600 transition-colors hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400"
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <div className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex h-10 items-center gap-1 rounded-lg px-2 text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label="Language"
              >
                <Globe className="h-5 w-5" />
                <span className="text-xs font-bold">{langLabels[lang]}</span>
              </button>
              {langOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setLangOpen(false)} />
                  <div className="absolute right-0 top-12 z-20 animate-scale-in rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                    {(['uz', 'ru', 'en'] as Language[]).map((l) => (
                      <button
                        key={l}
                        onClick={() => { setLang(l); setLangOpen(false); }}
                        className={cn(
                          'block w-full rounded-md px-4 py-2 text-left text-sm font-medium transition-colors',
                          lang === l
                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                        )}
                      >
                        {langLabels[l]}
                        {l === 'uz' && ' — O\'zbek'}
                        {l === 'ru' && ' — Русский'}
                        {l === 'en' && ' — English'}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={toggleTheme}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </button>

            <div className="hidden lg:block">
              <Button
                onClick={() => handleNavClick('#contact')}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {t.nav.contact}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            <button
              className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menu"
            >
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </nav>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 right-0 top-0 glass animate-slide-down px-4 pb-8 pt-20 shadow-lg">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => handleNavClick(link.href)}
                  className="rounded-lg px-4 py-3 text-left text-base font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-blue-600 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-blue-400"
                >
                  {link.label}
                </button>
              ))}
              <div className="mt-2 flex gap-2 px-4">
                {(['uz', 'ru', 'en'] as Language[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={cn(
                      'rounded-lg px-3 py-2 text-sm font-bold transition-colors',
                      lang === l
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    )}
                  >
                    {langLabels[l]}
                  </button>
                ))}
              </div>
              <Button
                onClick={() => handleNavClick('#contact')}
                className="mt-3 bg-blue-600 text-white hover:bg-blue-700"
              >
                {t.nav.contact}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
