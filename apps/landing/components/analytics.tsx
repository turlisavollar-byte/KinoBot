'use client';

import Script from 'next/script';

const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const yandexMetricaId = process.env.NEXT_PUBLIC_YANDEX_METRICA_ID;

export function Analytics() {
  return (
    <>
      {gaMeasurementId ? (
        <>
          <Script
            id="ga4-loader"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
          />
          <Script
            id="ga4-config"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaMeasurementId}', { send_page_view: true });
              `,
            }}
          />
        </>
      ) : null}
      {yandexMetricaId ? (
        <>
          <Script
            id="yandex-metrica-loader"
            strategy="afterInteractive"
            src={`https://mc.yandex.com/api/jsapi/v2.js?cid=${yandexMetricaId}`}
          />
          <Script
            id="yandex-metrica-config"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  if (window.ym) {
                    window.ym(${JSON.stringify(yandexMetricaId)}, 'ym', '001');
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
