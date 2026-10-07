'use client';

import { Reveal } from '@/components/reveal';
import { useLang } from '@/components/language-provider';

export function FAQ() {
  const { t } = useLang();

  return (
    <section id="faq" className="bg-slate-50 py-16 dark:bg-slate-900 lg:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center">
          <h2 className="font-extrabold text-slate-900 dark:text-white">
            {t.faq.title} <span className="text-gradient-hero">{t.faq.titleHighlight}</span>
          </h2>
        </Reveal>

        <Reveal className="mt-12" delay={100}>
          <div className="space-y-3">
            {t.faq.items.map((faq, i) => (
              <details key={i} className="group rounded-xl border border-slate-200 bg-white px-4 shadow-sm sm:px-6 dark:border-slate-700 dark:bg-slate-800">
                <summary className="cursor-pointer list-none py-4 text-left text-sm font-semibold text-slate-900 sm:text-base dark:text-white">
                  {faq.question}
                </summary>
                <p className="pb-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
