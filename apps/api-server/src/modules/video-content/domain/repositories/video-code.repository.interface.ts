import { VideoCodeEntity } from "../entities/video-code.entity";
import { VideoCode } from "../value-objects/video-code.vo";
import { VideoStatus } from "../value-objects/video-status.vo";

export interface VideoCodeFilter {
  status?: VideoStatus;
  movieId?: string;
}

export interface IVideoCodeRepository {
  create(video: VideoCodeEntity): Promise<VideoCodeEntity>;
  update(video: VideoCodeEntity): Promise<VideoCodeEntity | null>;
  findById(id: string): Promise<VideoCodeEntity | null>;
  findByCode(code: VideoCode): Promise<VideoCodeEntity | null>;
  findAll(filter?: VideoCodeFilter): Promise<VideoCodeEntity[]>;
  findByMovieId(movieId: string): Promise<VideoCodeEntity[]>;
  movieExists(movieId: string): Promise<boolean>;
  delete(id: string): Promise<boolean>;
  exists(code: VideoCode): Promise<boolean>;
}
