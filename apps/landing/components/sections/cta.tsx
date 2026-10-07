'use client';

import { Send, Mail, CheckCircle2 } from 'lucide-react';
import { Reveal } from '@/components/reveal';
import { Button } from '@/components/ui/button';
import { useLang } from '@/components/language-provider';

export function CTA() {
  const { t } = useLang();
  const scrollTo = (href: string) => document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
  const trustSignals = [t.cta.trust1, t.cta.trust2, t.cta.trust3];

  return (
    <section className="bg-white py-16 dark:bg-slate-950 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl hero-gradient px-6 py-12 text-center shadow-2xl sm:px-12 lg:py-20">
            <div className="absolute inset-0 grid-pattern opacity-20" />
            <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-blue-600/20 blur-3xl" />
            <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-violet-600/20 blur-3xl" />

            <div className="relative">
              <h2 className="font-extrabold text-white">{t.cta.title}</h2>
              <p className="lead mx-auto mt-4 max-w-2xl text-slate-300">{t.cta.subtitle}</p>

              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
                <Button size="lg" onClick={() => scrollTo('#contact')} className="w-full bg-amber-500 text-slate-900 hover:bg-amber-400 sm:w-auto">
                  <Send className="mr-2 h-5 w-5" />
                  {t.cta.telegramBtn}
                </Button>
                <Button size="lg" variant="outline" onClick={() => scrollTo('#contact')} className="w-full border-white/30 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 sm:w-auto">
                  <Mail className="mr-2 h-5 w-5" />
                  {t.cta.emailBtn}
                </Button>
              </div>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 text-sm text-slate-300 sm:flex-row sm:gap-6">
                {trustSignals.map((signal) => (
                  <div key={signal} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    {signal}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
