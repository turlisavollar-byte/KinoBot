'use client';

import { Bot, LayoutDashboard, Film, CreditCard, ShieldCheck, BarChart3, Bell, Globe, Smartphone, LucideIcon } from 'lucide-react';
import { Reveal } from '@/components/reveal';
import { useLang } from '@/components/language-provider';
import { FEATURES } from '@/config';

const icons: LucideIcon[] = [Bot, LayoutDashboard, Film, CreditCard, ShieldCheck, BarChart3, Bell, Globe, Smartphone];
const gradients = [
  'from-blue-500 to-blue-600', 'from-violet-500 to-violet-600', 'from-amber-500 to-orange-500',
  'from-emerald-500 to-emerald-600', 'from-red-500 to-rose-600', 'from-cyan-500 to-blue-500',
  'from-pink-500 to-rose-500', 'from-indigo-500 to-violet-500', 'from-teal-500 to-emerald-500',
];

export function Features() {
  const { t } = useLang();

  return (
    <section id="features" className="bg-slate-50 py-16 dark:bg-slate-900 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-extrabold text-slate-900 dark:text-white">
            {t.features.title} <span className="text-gradient-hero">{t.features.titleHighlight}</span>
          </h2>
          <p className="lead mt-4">{t.features.subtitle}</p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:mt-16">
          {FEATURES.map((feature, i) => {
            const Icon = icons[i];
            return (
              <Reveal key={i} delay={i * 60}>
                <div className="group h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-blue-200 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-500 dark:hover:shadow-blue-500/10 sm:p-6">
                  <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradients[i]} shadow-lg`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{feature.description}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
