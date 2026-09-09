import { describe, expect, it, vi } from "vitest";
import { CodeGeneratorService } from "./code-generator.service";
import { VideoCode } from "../value-objects/video-code.vo";

describe("CodeGeneratorService", () => {
  it("generates a valid unique code", async () => {
    const exists = vi.fn().mockResolvedValue(false);
    const code = await new CodeGeneratorService().generateUniqueCode(exists);

    expect(code).toBeInstanceOf(VideoCode);
    expect(code.toString()).toMatch(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/);
    expect(exists).toHaveBeenCalledOnce();
  });

  it("retries when a generated code already exists", async () => {
    const exists = vi
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    await expect(
      new CodeGeneratorService().generateUniqueCode(exists),
    ).resolves.toBeInstanceOf(VideoCode);
    expect(exists).toHaveBeenCalledTimes(2);
  });
});
