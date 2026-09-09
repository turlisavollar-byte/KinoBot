export type VideoStatus = "pending" | "active" | "inactive";

const VALID_STATUSES: readonly VideoStatus[] = [
  "pending",
  "active",
  "inactive",
];

export class VideoStatusValue {
  private constructor(private readonly value: VideoStatus) {}

  static create(value: string): VideoStatusValue {
    if (!VALID_STATUSES.includes(value as VideoStatus)) {
      throw new Error(`Invalid video status: ${value}`);
    }
    return new VideoStatusValue(value as VideoStatus);
  }

  static pending(): VideoStatusValue {
    return new VideoStatusValue("pending");
  }

  isActive(): boolean {
    return this.value === "active";
  }

  toString(): VideoStatus {
    return this.value;
  }
}
