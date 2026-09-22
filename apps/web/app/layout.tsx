import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers/Providers';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'StreamX - Premium Streaming Platform',
    template: '%s | StreamX',
  },
  description: 'Stream thousands of movies and TV series in stunning quality. Start your free trial today.',
  keywords: ['streaming', 'movies', 'tv shows', 'entertainment', 'watch online'],
  authors: [{ name: 'StreamX' }],
  creator: 'StreamX',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://streamx.com',
    siteName: 'StreamX',
    title: 'StreamX - Premium Streaming Platform',
    description: 'Stream thousands of movies and TV series in stunning quality',
    images: [
      {
        url: 'https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?auto=compress&cs=tinysrgb&w=1200',
        width: 1200,
        height: 630,
        alt: 'StreamX - Premium Streaming',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StreamX - Premium Streaming Platform',
    description: 'Stream thousands of movies and TV series in stunning quality',
    images: ['https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?auto=compress&cs=tinysrgb&w=1200'],
    creator: '@streamx',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
