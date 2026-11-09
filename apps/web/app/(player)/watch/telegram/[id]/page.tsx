"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  getTelegramMediaStream,
  recordTelegramMediaView,
  type TelegramMediaStreamTicket,
} from "@streamx/api-client";

export default function TelegramWatchPage() {
  const params = useParams();
  const id = params.id as string;
  const [ticket, setTicket] = useState<TelegramMediaStreamTicket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const viewRecorded = useRef(false);

  useEffect(() => {
    let active = true;
    getTelegramMediaStream(id)
      .then((result) => {
        if (active) setTicket(result);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : "Unable to load video");
        }
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (error) {
    return (
      <main className="min-h-screen bg-black px-6 py-12 text-white">
        <p role="alert" className="mx-auto max-w-3xl text-center">{error}</p>
        <Link className="mt-6 block text-center underline" href="/browse">Back to browse</Link>
      </main>
    );
  }

  if (!ticket) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <Loader2 aria-label="Loading video" className="h-8 w-8 animate-spin" />
      </main>
    );
  }

  const title = ticket.media.caption || ticket.media.fileName || "Telegram video";

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/browse" className="mb-5 inline-block text-sm text-gray-300 hover:text-white">
          Back to browse
        </Link>
        <h1 className="mb-4 text-xl font-semibold">{title}</h1>
        <video
          className="max-h-[80vh] w-full bg-black"
          src={ticket.streamUrl}
          controls
          playsInline
          preload="metadata"
          onPlay={() => {
            if (viewRecorded.current) return;
            viewRecorded.current = true;
            recordTelegramMediaView(id).catch((cause: unknown) => {
              console.error("Failed to record Telegram media view", cause);
            });
          }}
          onError={() => setError("Video playback failed. The link may have expired; reload to request a new one.")}
        />
        <p className="mt-3 text-sm text-gray-400">
          {ticket.media.duration ? `${Math.floor(ticket.media.duration / 60)}:${String(ticket.media.duration % 60).padStart(2, "0")}` : ""}
          {ticket.media.width && ticket.media.height ? ` · ${ticket.media.width}×${ticket.media.height}` : ""}
          {` · ${ticket.media.viewsCount} views`}
        </p>
      </div>
    </main>
  );
}
