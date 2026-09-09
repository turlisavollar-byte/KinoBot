export type AdPlacement = "pre_roll" | "mid_roll" | "banner" | "sponsored_content";
export type AdStatus = "draft" | "active" | "paused" | "completed" | "archived";

export interface Ad {
  id: string;
  title: string;
  placement: AdPlacement;
  status: AdStatus;
  targetUrl?: string;
  mediaUrl?: string;
  impressions: number;
  clicks: number;
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
}

export interface AdCampaign {
  id: string;
  name: string;
  advertiser: string;
  budget: number;
  currency: string;
  status: AdStatus;
  ads: Ad[];
  createdAt: Date;
}
