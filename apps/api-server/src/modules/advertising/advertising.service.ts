/**
 * Advertising Service — STUB
 *
 * TODO: Add `adCampaignsTable`, `adsTable`, `adImpressionsTable` to DB schema.
 * Integration points:
 *   - Bot: show pre-roll ad before video if user has free plan
 *   - Dashboard: campaign management + analytics
 *   - Analytics: click-through rates, CPM, CPC
 */

import type { Ad, AdCampaign } from "./advertising.types";

export class AdvertisingService {
  async listCampaigns(): Promise<AdCampaign[]> {
    return [];
  }

  async getAdForPlacement(_placement: string, _userId?: string): Promise<Ad | null> {
    // TODO: Implement ad selection logic (targeting, frequency capping)
    return null;
  }

  async trackImpression(_adId: string, _userId?: string): Promise<void> {
    // TODO: Increment impressions counter
  }

  async trackClick(_adId: string, _userId?: string): Promise<void> {
    // TODO: Increment click counter
  }
}

export const advertisingService = new AdvertisingService();
