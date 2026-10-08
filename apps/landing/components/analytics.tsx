'use client';

import Script from 'next/script';
import { siteConfig } from '@/config';

export function Analytics() {
  return (
    <>
      {siteConfig.ga4Id ? (
        <>
          <Script
            id="ga4-loader"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${siteConfig.ga4Id}`}
          />
          <Script
            id="ga4-config"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${siteConfig.ga4Id}', { send_page_view: true });
              `,
            }}
          />
        </>
      ) : null}
      {siteConfig.yandexMetricaId ? (
        <>
          <Script
            id="yandex-metrica-loader"
            strategy="afterInteractive"
            src={`https://mc.yandex.com/api/jsapi/v2.js?cid=${siteConfig.yandexMetricaId}`}
          />
          <Script
            id="yandex-metrica-config"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  if (window.ym) {
                    window.ym(${JSON.stringify(siteConfig.yandexMetricaId)}, 'ym', '001');
                    window.ym('hit', 'pageView');
                  }
                })();
              `,
            }}
          />
        </>
      ) : null}
    </>
  );
}
