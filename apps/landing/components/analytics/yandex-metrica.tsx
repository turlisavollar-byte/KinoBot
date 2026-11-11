'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

declare global {
  interface Window {
    ym?: (...args: unknown[]) => void;
  }
}

export function YandexMetrica() {
  const counterId = process.env.NEXT_PUBLIC_YANDEX_METRICA_ID;
  const pathname = usePathname();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!counterId || !isReady || !pathname || !window.ym) return;
    window.ym(counterId, 'hit', `${pathname}${window.location.search}`);
  }, [counterId, isReady, pathname]);

  if (!counterId) return null;

  return (
    <Script
      id="yandex-metrica-init"
      strategy="afterInteractive"
      onReady={() => setIsReady(true)}
      dangerouslySetInnerHTML={{
        __html: `
          (function(m,e,t,r,i,k,a){
            m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
            m[i].l=1*new Date();
            for (var j=0;j<document.scripts.length;j++) { if (document.scripts[j].src===r) return; }
            k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
          })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');
          window.ym(${JSON.stringify(counterId)}, 'init', {
            clickmap: true,
            trackLinks: true,
            accurateTrackBounce: true,
            webvisor: false
          });
        `,
      }}
    />
  );
}