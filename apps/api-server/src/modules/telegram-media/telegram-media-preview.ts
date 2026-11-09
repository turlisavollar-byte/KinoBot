import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

type VideoMetadata = {
  duration: number | null;
  width: number | null;
  height: number | null;
};

const MAX_PREVIEW_BYTES = 5 * 1024 * 1024;
const MAX_COMMAND_OUTPUT_BYTES = 64 * 1024;
const MAX_PREVIEW_SOURCE_BYTES = 512 * 1024 * 1024;

function runMediaCommand(
  command: string,
  args: string[],
  timeoutMs: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "ignore"] });
    let output = "";
    let outputBytes = 0;
    let settled = false;
    const finish = (error?: Error, value?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(value ?? "");
    };
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(new Error(`${command} timed out`));
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      outputBytes += chunk.length;
      if (outputBytes > MAX_COMMAND_OUTPUT_BYTES) {
        child.kill("SIGKILL");
        finish(new Error(`${command} output exceeded its limit`));
        return;
      }
      output += chunk.toString("utf8");
    });
    child.once("error", (error) => finish(error));
    child.once("close", (code) => {
      if (code === 0) finish(undefined, output);
      else finish(new Error(`${command} exited with code ${code ?? "unknown"}`));
    });
  });
}

export async function probeTelegramVideo(filePath: string): Promise<VideoMetadata> {
  const output = await runMediaCommand(
    "ffprobe",
    [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=width,height:format=duration",
      "-of", "json",
      filePath,
    ],
    15_000,
  );
  const parsed = JSON.parse(output) as {
    streams?: Array<{ width?: number; height?: number }>;
    format?: { duration?: string };
  };
  const stream = parsed.streams?.[0];
  const duration = Number(parsed.format?.duration);
  const width = stream?.width;
  const height = stream?.height;
  return {
    duration: Number.isFinite(duration) && duration > 0 ? Math.round(duration) : null,
    width: typeof width === "number" && Number.isInteger(width) && width > 0 ? width : null,
    height: typeof height === "number" && Number.isInteger(height) && height > 0 ? height : null,
  };
}

export async function generateTelegramVideoPosterFromStream(
  source: Readable,
): Promise<Buffer> {
  const directory = await mkdtemp(join(tmpdir(), "telegram-media-source-"));
  const inputPath = join(directory, "source-video");
  let receivedBytes = 0;
  const byteLimit = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      receivedBytes += chunk.length;
      if (receivedBytes > MAX_PREVIEW_SOURCE_BYTES) {
        callback(new Error("Video exceeds the poster source size limit"));
        return;
      }
      callback(null, chunk);
    },
  });
  try {
    await pipeline(source, byteLimit, createWriteStream(inputPath), {
      signal: AbortSignal.timeout(120_000),
    });
    return await generateTelegramVideoPoster(inputPath);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export async function generateTelegramVideoPoster(
  filePath: string,
): Promise<Buffer> {
  const directory = await mkdtemp(join(tmpdir(), "telegram-media-poster-"));
  const outputPath = join(directory, "poster.jpg");
  try {
    await runMediaCommand(
      "ffmpeg",
      [
        "-hide_banner", "-loglevel", "error", "-nostdin", "-y",
        "-ss", "0.5", "-i", filePath,
        "-map", "0:v:0", "-frames:v", "1", "-threads", "1",
        "-vf", "scale=w='min(640,iw)':h=-2",
        "-q:v", "4", "-fs", String(MAX_PREVIEW_BYTES),
        outputPath,
      ],
      45_000,
    );
    const size = (await stat(outputPath)).size;
    if (size <= 0 || size > MAX_PREVIEW_BYTES) {
      throw new Error("Generated poster is outside the accepted size range");
    }
    return await readFile(outputPath);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
