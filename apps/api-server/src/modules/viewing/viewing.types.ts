export type ContentType = "movie" | "episode";
export type RatingScale = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface WatchProgress {
  userId: string;
  contentType: ContentType;
  contentId: string;
  positionSeconds: number;
  totalSeconds?: number;
  completedAt?: Date;
  updatedAt: Date;
}

export interface UpsertProgressDTO {
  contentType: ContentType;
  contentId: string;
  positionSeconds: number;
  totalSeconds?: number;
}

export interface ContentRating {
  userId: string;
  contentType: ContentType;
  contentId: string;
  rating: RatingScale;
  review?: string;
  createdAt: Date;
}

export interface SubmitRatingDTO {
  contentType: ContentType;
  contentId: string;
  rating: RatingScale;
  review?: string;
}
