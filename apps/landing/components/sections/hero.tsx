'use client';

import { useState, useEffect } from 'react';
import { Play, DollarSign, CheckCircle2, Film, Bot, LayoutDashboard, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLang } from '@/components/language-provider';
import { siteConfig } from '@/config';

function FloatingParticles() {
  const [particles, setParticles] = useState<Array<{ id: number; left: number; top: number; size: number; delay: number; duration: number }>>([]);

  useEffect(() => {
    const arr = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 3 + 1,
      delay: Math.random() * 5,
      duration: Math.random() * 4 + 4,
    }));
    setParticles(arr);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-white/20"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animation: `float ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

function DashboardMockup() {
  return (
    <div className="relative w-full rounded-2xl bg-slate-900 p-3 shadow-2xl ring-1 ring-white/10 sm:p-4">
      <div className="flex items-center gap-2 pb-3">
        <div className="h-3 w-3 rounded-full bg-red-400" />
        <div className="h-3 w-3 rounded-full bg-yellow-400" />
        <div className="h-3 w-3 rounded-full bg-green-400" />
        <span className="ml-3 text-xs text-slate-400">{siteConfig.name} Admin</span>
      </div>
      <div className="grid grid-cols-12 gap-2 sm:gap-3">
        <div className="col-span-3 space-y-2">
          <div className="flex items-center gap-2 rounded-lg bg-blue-600/20 p-2">
            <LayoutDashboard className="h-4 w-4 text-blue-400" />
            <span className="hidden text-xs text-slate-200 sm:inline">Dashboard</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg p-2">
            <Film className="h-4 w-4 text-slate-400" />
            <span className="hidden text-xs text-slate-400 sm:inline">Movies</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg p-2">
            <Bot className="h-4 w-4 text-slate-400" />
            <span className="hidden text-xs text-slate-400 sm:inline">Bots</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg p-2">
            <DollarSign className="h-4 w-4 text-slate-400" />
            <span className="hidden text-xs text-slate-400 sm:inline">Payments</span>
          </div>
        </div>
        <div className="col-span-9 space-y-3">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-lg bg-slate-800 p-2 sm:p-3">
              <p className="text-xs text-slate-400">Users</p>
              <p className="text-base font-bold text-white sm:text-lg">12,847</p>
              <p className="text-xs text-emerald-400">+24% ↑</p>
            </div>
            <div className="rounded-lg bg-slate-800 p-2 sm:p-3">
              <p className="text-xs text-slate-400">Revenue</p>
              <p className="text-base font-bold text-white sm:text-lg">$8,420</p>
              <p className="text-xs text-emerald-400">+18% ↑</p>
            </div>
            <div className="rounded-lg bg-slate-800 p-2 sm:p-3">
              <p className="text-xs text-slate-400">Subscribers</p>
              <p className="text-base font-bold text-white sm:text-lg">3,291</p>
              <p className="text-xs text-emerald-400">+12% ↑</p>
            </div>
          </div>
          <div className="rounded-lg bg-slate-800 p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs text-slate-400">Revenue dynamics</span>
              <span className="text-xs text-slate-500">30d</span>
            </div>
            <div className="flex h-20 items-end gap-1 sm:gap-1.5 sm:h-24">
              {[40, 55, 35, 70, 50, 80, 60, 90, 65, 85, 75, 95, 70, 88, 60, 78, 82, 50, 68, 92, 72, 85, 60, 78, 90, 65, 80, 70, 88, 95].map((h, i) => (
                <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-blue-600 to-violet-500" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
          <div className="hidden gap-3 sm:flex">
            <div className="flex-1 rounded-lg bg-slate-800 p-3">
              <div className="mb-2 flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-blue-500/30" />
                <div className="h-2 w-20 rounded bg-slate-600" />
              </div>
              <div className="h-2 w-full rounded bg-slate-700" />
              <div className="mt-1 h-2 w-3/4 rounded bg-slate-700" />
            </div>
            <div className="flex-1 rounded-lg bg-slate-800 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-slate-400">New movies</span>
                <Star className="h-3 w-3 text-amber-400" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded bg-gradient-to-br from-blue-500 to-violet-500" />
                  <div className="flex-1">
                    <div className="h-2 w-full rounded bg-slate-600" />
                    <div className="mt-1 h-2 w-1/2 rounded bg-slate-700" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded bg-gradient-to-br from-emerald-500 to-blue-500" />
                  <div className="flex-1">
                    <div className="h-2 w-full rounded bg-slate-600" />
                    <div className="mt-1 h-2 w-2/3 rounded bg-slate-700" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  const { t } = useLang();
  const scrollTo = (href: string) => {
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
  };

  const trustSignals = [t.hero.trust1, t.hero.trust2, t.hero.trust3];

  return (
    <section className="relative overflow-hidden hero-gradient pt-28 pb-16 sm:pt-32 sm:pb-20 lg:pt-40 lg:pb-32">
      <div className="absolute inset-0 grid-pattern opacity-30" />
      <FloatingParticles />
      <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
      <div className="absolute -right-40 bottom-20 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex animate-fade-in-up items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            {t.hero.badge}
          </div>

          <h1 className="mt-6 animate-fade-in-up font-extrabold leading-tight text-white" style={{ animationDelay: '0.1s' }}>
            {t.hero.titlePart1}{' '}
            <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              {t.hero.titleHighlight}
            </span>{' '}
            {t.hero.titlePart2}
          </h1>

          <p className="lead mx-auto mt-6 max-w-2xl animate-fade-in-up text-slate-300" style={{ animationDelay: '0.2s' }}>
            {t.hero.subtitle}
          </p>

          <div className="mt-8 flex animate-fade-in-up flex-col items-center justify-center gap-4 sm:flex-row" style={{ animationDelay: '0.3s' }}>
            <Button size="lg" onClick={() => scrollTo('#demo')} className="w-full bg-amber-500 text-slate-900 hover:bg-amber-400 sm:w-auto">
              <Play className="mr-2 h-5 w-5" />
              {t.hero.demoBtn}
            </Button>
            <Button size="lg" variant="outline" onClick={() => scrollTo('#pricing')} className="w-full border-white/30 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 sm:w-auto">
              <DollarSign className="mr-2 h-5 w-5" />
              {t.hero.pricingBtn}
            </Button>
          </div>

          <div className="mt-8 flex animate-fade-in-up flex-col items-center justify-center gap-3 text-sm text-slate-300 sm:flex-row sm:gap-6" style={{ animationDelay: '0.4s' }}>
            {trustSignals.map((signal) => (
              <div key={signal} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                {signal}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 animate-fade-in-up sm:mt-16" style={{ animationDelay: '0.5s' }}>
          <div className="mx-auto max-w-5xl animate-float">
            <DashboardMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
