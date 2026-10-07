import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { LanguageProvider } from '@/components/language-provider';
import { Analytics } from '@/components/analytics';
import { SchemaMarkup } from '@/components/schema-markup';

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '700', '800'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://kinobot.uz'),
  title: 'KinoBot — Kino biznesingizni keyingi darajaga olib chiqing',
  description:
    'Telegram bot + Admin panel platformasi. 24/7 ishlaydigan, xavfsiz, professional. Kino biznesingizni avtomatlashtiring.',
  openGraph: {
    title: 'KinoBot — Kino biznesingizni keyingi darajaga olib chiqing',
    description:
      'Telegram bot + Admin panel platformasi. 24/7 ishlaydigan, xavfsiz, professional.',
    type: 'website',
    locale: 'uz_UZ',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KinoBot — Kino biznesingizni keyingi darajaga olib chiqing',
    description:
      'Telegram bot + Admin panel platformasi. 24/7 ishlaydigan, xavfsiz, professional.',
  },
  keywords: ['kinobot', 'telegram bot', 'kino bot', 'admin panel', 'kino biznes', 'o\'zbekiston'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <body className={inter.className}>
        <SchemaMarkup />
        <Analytics />
        <ThemeProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
