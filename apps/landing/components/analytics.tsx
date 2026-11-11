'use client';

import { GA4 } from '@/components/analytics/ga4';
import { YandexMetrica } from '@/components/analytics/yandex-metrica';

export function Analytics() {
  return (
    <>
      <GA4 />
      <YandexMetrica />
    </>
  );
}
