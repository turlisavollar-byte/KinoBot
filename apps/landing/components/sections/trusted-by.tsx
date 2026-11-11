'use client';

import { Star } from 'lucide-react';
import { useLang } from '@/components/language-provider';

const logos = ['CinemaPlus', 'KinoZone', 'MovieStar', 'FilmExpress', 'BollywoodUZ', 'PremiereTV'];

export function TrustedBy() {
  const { t } = useLang();

  return (
    <section className="border-y border-slate-100 bg-white py-12 dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="mb-8 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
          {t.trustedBy}
        </p>
        <div className="relative overflow-hidden">
          <div className="flex animate-marquee gap-12">
            {[...logos, ...logos].map((logo, i) => (
              <div key={i} className="flex flex-shrink-0 items-center gap-2 text-xl font-bold text-slate-600 transition-colors hover:text-slate-800 dark:text-slate-300 dark:hover:text-white">
                <Star className="h-5 w-5" />
                {logo}
              </div>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-white to-transparent dark:from-slate-900" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-white to-transparent dark:from-slate-900" />
        </div>
      </div>
    </section>
  );
}
