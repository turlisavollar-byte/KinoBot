import { VideoCode } from "../value-objects/video-code.vo";

export class CodeGeneratorService {
  private readonly maxAttempts = 10;

  async generateUniqueCode(
    exists: (code: VideoCode) => Promise<boolean>,
  ): Promise<VideoCode> {
    for (let attempt = 0; attempt < this.maxAttempts; attempt += 1) {
      const candidate = VideoCode.generate();
      if (!(await exists(candidate))) return candidate;
    }
    throw new Error("Could not generate a unique video code");
  }
}
