import { VideoCode } from "../value-objects/video-code.vo";
import { VideoStatusValue } from "../value-objects/video-status.vo";

export interface VideoCodeProps {
  id: string;
  code: VideoCode;
  title: string;
  description: string | null;
  telegramFileId: string | null;
  channelId: string | null;
  messageId: number | null;
  fileSize: number | null;
  duration: number | null;
  status: VideoStatusValue;
  viewsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export class VideoCodeEntity {
  private constructor(private readonly props: VideoCodeProps) {}

  static create(
    props: Omit<VideoCodeProps, "createdAt" | "updatedAt">,
  ): VideoCodeEntity {
    const now = new Date();
    return new VideoCodeEntity({ ...props, createdAt: now, updatedAt: now });
  }

  static reconstitute(props: VideoCodeProps): VideoCodeEntity {
    return new VideoCodeEntity(props);
  }

  get id(): string {
    return this.props.id;
  }
  get code(): VideoCode {
    return this.props.code;
  }
  get title(): string {
    return this.props.title;
  }
  get description(): string | null {
    return this.props.description;
  }
  get telegramFileId(): string | null {
    return this.props.telegramFileId;
  }
  get channelId(): string | null {
    return this.props.channelId;
  }
  get messageId(): number | null {
    return this.props.messageId;
  }
  get fileSize(): number | null {
    return this.props.fileSize;
  }
  get duration(): number | null {
    return this.props.duration;
  }
  get status(): VideoStatusValue {
    return this.props.status;
  }
  get viewsCount(): number {
    return this.props.viewsCount;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  updateDetails(title?: string, description?: string): void {
    if (title !== undefined) this.props.title = title.trim();
    if (description !== undefined) this.props.description = description;
    this.props.updatedAt = new Date();
  }

  updateStatus(status: VideoStatusValue): void {
    this.props.status = status;
    this.props.updatedAt = new Date();
  }
}
