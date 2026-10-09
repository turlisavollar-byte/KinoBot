'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export function GA4() {
  const measurementId = process.env.NEXT_PUBLIC_GA4_ID;
  const pathname = usePathname();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!measurementId || !isReady || !pathname || !window.gtag) return;
    window.gtag('config', measurementId, {
      page_path: `${pathname}${window.location.search}`,
      page_title: document.title,
      send_page_view: true,
    });
  }, [isReady, measurementId, pathname]);

  if (!measurementId) return null;

  return (
    <>
      <Script
        id="ga4-loader"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`}
        onReady={() => setIsReady(true)}
      />
      <Script
        id="ga4-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            window.gtag = window.gtag || function(){window.dataLayer.push(arguments);};
            window.gtag('js', new Date());
            window.gtag('config', ${JSON.stringify(measurementId)}, { send_page_view: false });
          `,
        }}
      />
    </>
  );
}