'use client';

import { Send, Mail, Phone, Clock, MapPin } from 'lucide-react';
import { Reveal } from '@/components/reveal';
import { ContactForm } from '@/components/contact-form';
import { useLang } from '@/components/language-provider';

const infoIcons = [Send, Mail, Phone, Clock, MapPin];

export function Contact() {
  const { t } = useLang();

  const infoItems = [
    { label: t.contact.infoLabels.telegram, value: t.contact.infoValues.telegram },
    { label: t.contact.infoLabels.email, value: t.contact.infoValues.email },
    { label: t.contact.infoLabels.phone, value: t.contact.infoValues.phone },
    { label: t.contact.infoLabels.hours, value: t.contact.infoValues.hours },
    { label: t.contact.infoLabels.address, value: t.contact.infoValues.address },
  ];

  return (
    <section id="contact" className="bg-slate-50 py-16 dark:bg-slate-900 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center">
          <h2 className="font-extrabold text-slate-900 dark:text-white">{t.contact.title}</h2>
          <p className="lead mt-4">{t.contact.subtitle}</p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-5">
          <Reveal className="lg:col-span-3" delay={100}>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 dark:border-slate-700 dark:bg-slate-800">
              <ContactForm />
            </div>
          </Reveal>

          <Reveal className="lg:col-span-2" delay={200}>
            <div className="space-y-3 sm:space-y-4">
              {infoItems.map((info, i) => {
                const Icon = infoIcons[i];
                return (
                  <div key={i} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md sm:p-5 dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 shadow-lg sm:h-12 sm:w-12">
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{info.label}</p>
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{info.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
