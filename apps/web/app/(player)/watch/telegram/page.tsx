"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { listTelegramMedia, type TelegramMediaItem } from "@streamx/api-client";

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TelegramMediaLibraryPage() {
  const [media, setMedia] = useState<TelegramMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listTelegramMedia()
      .then((items) => {
        if (active) setMedia(items);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : "Unable to load videos");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/browse" className="mb-6 inline-block text-sm text-gray-300 hover:text-white">
          Back to browse
        </Link>
        <h1 className="mb-6 text-2xl font-semibold">Telegram videos</h1>
        {loading && <Loader2 aria-label="Loading videos" className="h-8 w-8 animate-spin" />}
        {error && <p role="alert" className="text-red-300">{error}</p>}
        {!loading && !error && media.length === 0 && (
          <p className="text-gray-300">No videos are available right now.</p>
        )}
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {media.map((item) => (
            <li key={item.id} className="rounded-lg border border-gray-700 p-4">
              <Link href={`/watch/telegram/${encodeURIComponent(item.id)}`} className="block hover:text-gray-300">
                {item.thumbnailUrl && (
                  <img
                    src={item.thumbnailUrl}
                    alt=""
                    className="mb-3 aspect-video w-full rounded object-cover"
                    loading="lazy"
                  />
                )}
                <h2 className="font-medium">{item.caption || item.fileName || "Telegram video"}</h2>
                <p className="mt-2 text-sm text-gray-400">
                  {formatFileSize(item.fileSize)}
                  {item.duration ? ` · ${Math.floor(item.duration / 60)}:${String(item.duration % 60).padStart(2, "0")}` : ""}
                  {item.width && item.height ? ` · ${item.width}×${item.height}` : ""}
                  {` · ${item.viewsCount} views`}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
