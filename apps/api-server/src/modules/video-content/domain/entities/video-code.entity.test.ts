import { describe, expect, it } from "vitest";
import { VideoCodeEntity } from "./video-code.entity";
import { VideoCode } from "../value-objects/video-code.vo";
import { VideoStatusValue } from "../value-objects/video-status.vo";

function createVideo() {
  return VideoCodeEntity.create({
    id: "video-1",
    code: VideoCode.create("AB23"),
    title: "Original title",
    description: null,
    telegramFileId: "file-1",
    channelId: null,
    messageId: null,
    fileSize: null,
    duration: null,
    status: VideoStatusValue.pending(),
    viewsCount: 0,
    accessPolicy: "free",
    requiredChannelIds: null,
  });
}

describe("VideoCodeEntity", () => {
  it("updates details and status", () => {
    const video = createVideo();
    video.updateDetails("Updated title", "Description");
    video.updateStatus(VideoStatusValue.create("active"));

    expect(video.title).toBe("Updated title");
    expect(video.description).toBe("Description");
    expect(video.status.toString()).toBe("active");
    expect(video.updatedAt.getTime()).toBeGreaterThanOrEqual(
      video.createdAt.getTime(),
    );
  });

  it("stores the access policy and required channels explicitly", () => {
    const video = VideoCodeEntity.create({
      id: "video-2",
      code: VideoCode.create("ABCD"),
      title: "Access gated title",
      description: null,
      telegramFileId: "file-2",
      channelId: null,
      messageId: null,
      fileSize: null,
      duration: null,
      status: VideoStatusValue.pending(),
      viewsCount: 0,
      accessPolicy: "channels",
      requiredChannelIds: "@cinemahub,-1001234567890",
    });

    expect(video.accessPolicy).toBe("channels");
    expect(video.requiredChannelIds).toBe("@cinemahub,-1001234567890");
  });
});
