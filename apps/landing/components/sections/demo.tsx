'use client';

import { Play, Smartphone, Monitor, CheckCircle2 } from 'lucide-react';
import { Reveal } from '@/components/reveal';
import { Button } from '@/components/ui/button';
import { useLang } from '@/components/language-provider';
import { siteConfig, VISIBLE_SOCIAL_LINKS } from '@/config';

export function Demo() {
  const { t } = useLang();
  const trustSignals = [t.demo.trust1, t.demo.trust2, t.demo.trust3];
  const telegramUrl = VISIBLE_SOCIAL_LINKS.find((link) => link.id === 'telegram')?.url || siteConfig.telegramSupport;
  const adminUrl = siteConfig.url ? `${siteConfig.url}/admin` : '#contact';

  return (
    <section id="demo" className="bg-white py-16 dark:bg-slate-950 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-extrabold text-slate-900 dark:text-white">
            {t.demo.title} <span className="text-gradient-hero">{t.demo.titleHighlight}</span>
          </h2>
          <p className="lead mt-4">{t.demo.subtitle}</p>
        </Reveal>

        <Reveal className="mt-12" delay={100}>
          <div className="relative mx-auto max-w-4xl overflow-hidden rounded-2xl hero-gradient shadow-2xl">
            <div className="absolute inset-0 grid-pattern opacity-20" />
            <div className="relative aspect-video flex items-center justify-center">
              <button
                className="group flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-all hover:scale-110 hover:bg-white/30 sm:h-20 sm:w-20"
                aria-label="Play demo video"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white transition-transform group-hover:scale-105 sm:h-16 sm:w-16">
                  <Play className="ml-1 h-5 w-5 fill-blue-600 text-blue-600 sm:h-7 sm:w-7" />
                </div>
              </button>
              <div className="absolute bottom-4 left-0 right-0 text-center sm:bottom-6">
                <p className="text-sm text-white font-medium sm:text-base">{t.demo.videoLabel}</p>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6" delay={200}>
          <a href={telegramUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 sm:w-auto">
            <Smartphone className="mr-2 h-5 w-5" />
            {t.demo.telegramBtn}
          </a>
          <a href={adminUrl} className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 shadow transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800 sm:w-auto">
            <Monitor className="mr-2 h-5 w-5" />
            {t.demo.adminBtn}
          </a>
        </Reveal>

        <Reveal className="mt-8 flex flex-col items-center justify-center gap-3 text-sm text-slate-500 dark:text-slate-400 sm:flex-row sm:gap-6" delay={300}>
          {trustSignals.map((signal) => (
            <div key={signal} className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              {signal}
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
