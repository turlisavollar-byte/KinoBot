'use client';

import { useState } from 'react';
import { LayoutDashboard, Bot, BarChart3, Film, Users, DollarSign, Settings, Search, Play } from 'lucide-react';
import { Reveal } from '@/components/reveal';
import { cn } from '@/lib/utils';
import { useLang } from '@/components/language-provider';

type TabKey = 'admin' | 'bot' | 'analytics';

function AdminMockup() {
  return (
    <div className="rounded-xl bg-slate-900 p-3 ring-1 ring-white/10 sm:p-4">
      <div className="flex items-center gap-2 pb-3 border-b border-white/10">
        <div className="h-3 w-3 rounded-full bg-red-400" />
        <div className="h-3 w-3 rounded-full bg-yellow-400" />
        <div className="h-3 w-3 rounded-full bg-green-400" />
        <div className="ml-3 flex-1 flex items-center gap-2 rounded-md bg-slate-800 px-3 py-1">
          <Search className="h-3 w-3 text-slate-500" />
          <span className="text-xs text-slate-500 hidden sm:inline">admin.kinobot.uz/dashboard</span>
        </div>
      </div>
      <div className="grid grid-cols-12 gap-2 pt-3 sm:gap-3">
        <div className="col-span-3 space-y-1">
          {[
            { icon: LayoutDashboard, active: true },
            { icon: Film },
            { icon: Bot },
            { icon: Users },
            { icon: DollarSign },
            { icon: Settings },
          ].map((item, i) => (
            <div key={i} className={cn('flex items-center gap-2 rounded-lg p-2', item.active ? 'bg-blue-600/30' : 'hover:bg-slate-800')}>
              <item.icon className={cn('h-4 w-4 flex-shrink-0', item.active ? 'text-blue-400' : 'text-slate-400')} />
              <span className={cn('text-xs hidden sm:inline', item.active ? 'text-slate-200' : 'text-slate-400')}>Item {i + 1}</span>
            </div>
          ))}
        </div>
        <div className="col-span-9 space-y-3">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[{ v: '12,847', c: '+24%' }, { v: '$8,420', c: '+18%' }, { v: '3,291', c: '+12%' }].map((stat, i) => (
              <div key={i} className="rounded-lg bg-slate-800 p-2 sm:p-3">
                <p className="text-xs text-slate-400 hidden sm:block">Stat {i + 1}</p>
                <p className="text-base font-bold text-white sm:text-lg">{stat.v}</p>
                <p className="text-xs text-emerald-400">{stat.c} ↑</p>
              </div>
            ))}
          </div>
          <div className="rounded-lg bg-slate-800 p-3 sm:p-4">
            <div className="flex h-24 items-end gap-1 sm:gap-1 sm:h-32">
              {[40, 55, 35, 70, 50, 80, 60, 90, 65, 85, 75, 95, 70, 88, 60, 78, 82, 50, 68, 92, 72, 85, 60, 78, 90, 65, 80, 70, 88, 95].map((h, i) => (
                <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-blue-600 to-violet-500" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BotMockup() {
  return (
    <div className="flex justify-center">
      <div className="w-full max-w-sm rounded-2xl bg-slate-100 p-3 shadow-xl sm:p-4 dark:bg-slate-800">
        <div className="rounded-xl bg-white shadow-sm overflow-hidden dark:bg-slate-700">
          <div className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-violet-600 p-4 text-white">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
              <Film className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold">KinoBot</p>
              <p className="text-xs text-white/80">online</p>
            </div>
          </div>
          <div className="space-y-3 p-4 bg-slate-50 min-h-[320px] dark:bg-slate-600">
            <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-white p-3 shadow-sm dark:bg-slate-500">
              <p className="text-sm text-slate-700 dark:text-slate-100">🎬</p>
            </div>
            <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-blue-600 p-3 text-white shadow-sm">
              <p className="text-sm">101</p>
            </div>
            <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-white p-3 shadow-sm dark:bg-slate-500">
              <div className="flex items-start gap-3">
                <div className="h-16 w-12 flex-shrink-0 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-800 dark:text-white">Inception (2010)</p>
                  <p className="text-xs text-slate-500 dark:text-slate-300">Thriller, Sci-Fi</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Play className="h-4 w-4 text-blue-600" />
                    <span className="text-xs text-blue-600 font-medium">▶</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-blue-600 p-3 text-white shadow-sm">
              <p className="text-sm">Premium</p>
            </div>
            <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-white p-3 shadow-sm dark:bg-slate-500">
              <p className="text-sm text-slate-700 dark:text-slate-100">$5/mo</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button className="rounded-lg bg-emerald-500 py-1.5 text-xs font-medium text-white">Click</button>
                <button className="rounded-lg bg-cyan-500 py-1.5 text-xs font-medium text-white">Payme</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalyticsMockup() {
  return (
    <div className="rounded-xl bg-slate-900 p-4 ring-1 ring-white/10 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h4 className="text-white font-bold">Analytics Dashboard</h4>
        </div>
        <BarChart3 className="h-6 w-6 text-blue-400" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[
          { v: '45.2K', c: 'from-blue-500 to-blue-600' },
          { v: '$12.4K', c: 'from-emerald-500 to-emerald-600' },
          { v: '3.2K', c: 'from-amber-500 to-orange-500' },
          { v: '8.4%', c: 'from-violet-500 to-violet-600' },
        ].map((stat, i) => (
          <div key={i} className="rounded-lg bg-slate-800 p-3 sm:p-4">
            <p className={`text-xl font-bold bg-gradient-to-r ${stat.c} bg-clip-text text-transparent sm:text-2xl`}>{stat.v}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg bg-slate-800 p-4">
          <div className="space-y-2">
            {[95, 78, 62, 53].map((pct, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Movie {i + 1}</span>
                  <span>{(pct / 10).toFixed(1)}K</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-slate-700">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="hidden rounded-lg bg-slate-800 p-4 sm:block">
          <div className="flex h-32 items-end gap-2">
            {[45, 60, 50, 75, 65, 85, 70, 90, 80, 95, 88, 100].map((h, i) => (
              <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-emerald-600 to-emerald-400" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Screenshots() {
  const { t } = useLang();
  const [activeTab, setActiveTab] = useState<TabKey>('admin');

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'admin', label: t.screenshots.tabs.admin },
    { key: 'bot', label: t.screenshots.tabs.bot },
    { key: 'analytics', label: t.screenshots.tabs.analytics },
  ];

  return (
    <section id="screenshots" className="bg-slate-50 py-16 dark:bg-slate-900 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-extrabold text-slate-900 dark:text-white">
            {t.screenshots.title} <span className="text-gradient-hero">{t.screenshots.titleHighlight}</span>
          </h2>
          <p className="lead mt-4">{t.screenshots.subtitle}</p>
        </Reveal>

        <Reveal className="mt-12">
          <div className="flex justify-center">
            <div className="inline-flex gap-1 rounded-xl bg-slate-200 p-1 dark:bg-slate-800">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'rounded-lg px-3 py-2 text-xs font-medium transition-all sm:px-6 sm:text-sm',
                    activeTab === tab.key
                      ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-400'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal className="mt-8 sm:mt-10" delay={100}>
          <div className="overflow-hidden rounded-2xl shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700">
            {activeTab === 'admin' && <AdminMockup />}
            {activeTab === 'bot' && <BotMockup />}
            {activeTab === 'analytics' && <AnalyticsMockup />}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
