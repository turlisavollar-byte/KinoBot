'use client';

import { ArrowRight, ShoppingCart, Download, Rocket, LucideIcon } from 'lucide-react';
import { Reveal } from '@/components/reveal';
import { useLang } from '@/components/language-provider';

const stepIcons: LucideIcon[] = [ShoppingCart, Download, Rocket];

export function HowItWorks() {
  const { t } = useLang();

  return (
    <section className="bg-white py-16 dark:bg-slate-950 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-extrabold text-slate-900 dark:text-white">
            {t.howItWorks.title} <span className="text-gradient-hero">{t.howItWorks.titleHighlight}</span>
          </h2>
          <p className="lead mt-4">{t.howItWorks.subtitle}</p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3 lg:mt-16">
          {t.howItWorks.steps.map((step, i) => {
            const Icon = stepIcons[i];
            return (
              <Reveal key={i} delay={i * 120}>
                <div className="relative">
                  {i < t.howItWorks.steps.length - 1 && (
                    <div className="absolute top-12 left-full hidden w-full items-center pl-4 md:flex">
                      <ArrowRight className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                    </div>
                  )}
                  <div className="flex flex-col items-center text-center">
                    <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 shadow-xl sm:h-24 sm:w-24">
                      <span className="text-2xl font-extrabold text-white sm:text-3xl">{i + 1}</span>
                      <div className="absolute -bottom-3 -right-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-lg sm:h-10 sm:w-10 dark:bg-slate-800">
                        <Icon className="h-4 w-4 text-blue-600 sm:h-5 sm:w-5" />
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white sm:text-xl">{step.title}</h3>
                    <p className="mt-2 max-w-xs text-sm text-slate-600 dark:text-slate-300">{step.description}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
