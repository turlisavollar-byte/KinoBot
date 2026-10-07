'use client';

import { Check, Star, ArrowRight } from 'lucide-react';
import { Reveal } from '@/components/reveal';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLang } from '@/components/language-provider';

export function Pricing() {
  const { t } = useLang();
  const scrollTo = (href: string) => document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });

  const ctaVariants = ['outline', 'primary', 'secondary'] as const;
  const trustSignals = [t.pricing.trust1, t.pricing.trust2, t.pricing.trust3];

  return (
    <section id="pricing" className="bg-slate-50 py-16 dark:bg-slate-900 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-extrabold text-slate-900 dark:text-white">{t.pricing.title}</h2>
          <p className="lead mt-4">{t.pricing.subtitle}</p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-6 lg:mt-16 lg:grid-cols-3 lg:gap-8">
          {t.pricing.plans.map((plan, i) => (
            <Reveal key={i} delay={i * 100}>
              <div
                className={cn(
                  'relative h-full rounded-2xl border-2 p-6 transition-all duration-300 sm:p-8',
                  i === 1
                    ? 'border-blue-600 bg-white shadow-2xl lg:-translate-y-4 dark:bg-slate-800 dark:border-blue-500'
                    : 'border-slate-200 bg-white hover:border-blue-200 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-500'
                )}
              >
                {i === 1 && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-1.5 text-xs font-bold text-white shadow-lg">
                      <Star className="h-3 w-3 fill-white" />
                      {t.pricing.badge}
                    </span>
                  </div>
                )}

                <div className="text-center">
                  <h3 className="text-lg font-bold uppercase tracking-wide text-slate-900 dark:text-white">{plan.name}</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{plan.description}</p>
                  <div className="mt-6">
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">{plan.price}</span>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.pricing.oneTime}</p>
                  </div>
                </div>

                <ul className="mt-8 space-y-3">
                  {plan.features.map((feature, fi) => (
                    <li key={fi} className="flex items-start gap-3">
                      <span className={cn('mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full', i === 1 ? 'bg-blue-100 dark:bg-blue-900' : 'bg-emerald-100 dark:bg-emerald-900')}>
                        <Check className={cn('h-3 w-3', i === 1 ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400')} />
                      </span>
                      <span className="text-sm text-slate-700 dark:text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8">
                  <Button
                    className={cn(
                      'w-full',
                      ctaVariants[i] === 'primary' && 'bg-blue-600 text-white hover:bg-blue-700',
                      ctaVariants[i] === 'secondary' && 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200',
                      ctaVariants[i] === 'outline' && 'border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700'
                    )}
                    variant={ctaVariants[i] === 'outline' ? 'outline' : 'default'}
                    onClick={() => scrollTo('#contact')}
                  >
                    {plan.cta}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-12 flex flex-col items-center justify-center gap-3 text-sm text-slate-600 dark:text-slate-400 sm:flex-row sm:gap-6" delay={200}>
          {trustSignals.map((signal) => (
            <div key={signal} className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-500" />
              {signal}
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
