'use client';

import { useState, useEffect } from 'react';
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { Reveal } from '@/components/reveal';
import { cn } from '@/lib/utils';
import { useLang } from '@/components/language-provider';

const gradients = [
  'from-blue-500 to-violet-500', 'from-emerald-500 to-teal-500', 'from-amber-500 to-orange-500',
  'from-pink-500 to-rose-500', 'from-cyan-500 to-blue-500', 'from-violet-500 to-indigo-500',
];

export function Testimonials() {
  const { t } = useLang();
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const items = t.testimonials.items;

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => setCurrent((prev) => (prev + 1) % items.length), 5000);
    return () => clearInterval(interval);
  }, [isPaused, items.length]);

  const prev = () => setCurrent((p) => (p === 0 ? items.length - 1 : p - 1));
  const next = () => setCurrent((p) => (p + 1) % items.length);

  const initials = items.map((item) => item.name.split(' ').map((w) => w[0]).join('').slice(0, 2));

  return (
    <section className="bg-white py-16 dark:bg-slate-950 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-extrabold text-slate-900 dark:text-white">
            {t.testimonials.title} <span className="text-gradient-hero">{t.testimonials.titleHighlight}</span>
          </h2>
        </Reveal>

        <Reveal className="mt-12" delay={100}>
          <div className="relative mx-auto max-w-3xl" onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)}>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm sm:p-12 dark:border-slate-700 dark:bg-slate-800">
              <Quote className="h-8 w-8 text-blue-200 sm:h-10 sm:w-10 dark:text-blue-500/40" />
              <div className="mt-4 flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400 sm:h-5 sm:w-5" />
                ))}
              </div>
              <p className="mt-4 text-base leading-relaxed text-slate-700 dark:text-slate-200 sm:text-lg">
                &ldquo;{items[current].quote}&rdquo;
              </p>
              <div className="mt-6 flex items-center gap-4">
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br text-white font-bold sm:h-12 sm:w-12', gradients[current % gradients.length])}>
                  {initials[current]}
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">{items[current].name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{items[current].role}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center gap-4">
              <button onClick={prev} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Previous">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="flex flex-wrap gap-2 justify-center">
                {items.map((_, i) => (
                  <button key={i} onClick={() => setCurrent(i)} className={cn('h-2 rounded-full transition-all', i === current ? 'w-8 bg-blue-600' : 'w-2 bg-slate-300 hover:bg-slate-400 dark:bg-slate-600 dark:hover:bg-slate-500')} aria-label={`Go to ${i + 1}`} />
                ))}
              </div>
              <button onClick={next} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Next">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
