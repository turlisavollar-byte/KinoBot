'use client';

import { Send, Mail, Phone, Clock, MapPin } from 'lucide-react';
import { Reveal } from '@/components/reveal';
import { ContactForm } from '@/components/contact-form';
import { useLang } from '@/components/language-provider';
import { CONTACT_DETAILS } from '@/config';

const infoIcons = [Send, Mail, Phone, Clock, MapPin];

export function Contact() {
  const { t } = useLang();

  const infoItems = [
    { label: t.contact.infoLabels.telegram, value: CONTACT_DETAILS.telegram || 'Bog\'lanish', href: CONTACT_DETAILS.telegram || '#contact' },
    { label: t.contact.infoLabels.email, value: CONTACT_DETAILS.email || 'streamxuz555@mail.com', href: CONTACT_DETAILS.email ? `mailto:${CONTACT_DETAILS.email}` : '#contact' },
    { label: t.contact.infoLabels.phone, value: CONTACT_DETAILS.phone || 'Telefon topilmadi', href: CONTACT_DETAILS.phone ? `tel:${CONTACT_DETAILS.phone.replace(/\s/g, '')}` : '#contact' },
    { label: t.contact.infoLabels.hours, value: CONTACT_DETAILS.hours },
    { label: t.contact.infoLabels.address, value: CONTACT_DETAILS.address || 'Manzil topilmadi' },
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
                const isLink = info.href?.startsWith('mailto:') || info.href?.startsWith('tel:') || info.href?.startsWith('http');
                return (
                  <a
                    key={i}
                    href={info.href ?? '#contact'}
                    target={isLink && info.href?.startsWith('http') ? '_blank' : undefined}
                    rel={isLink && info.href?.startsWith('http') ? 'noreferrer' : undefined}
                    className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md sm:p-5 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 shadow-lg sm:h-12 sm:w-12">
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{info.label}</p>
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{info.value}</p>
                    </div>
                  </a>
                );
              })}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
