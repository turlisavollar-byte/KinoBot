"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  Settings,
  Subtitles,
  ChevronLeft,
  Loader2,
} from "lucide-react";
import { useVideoData, useWatchHistory } from "@/features/content";
import { formatDuration } from "@/shared/lib";
import { toast } from "sonner";
import { routes, PLAYER_CONFIG } from "@/shared/config";

const SKIP_SECONDS = PLAYER_CONFIG.skipSeconds;

export default function WatchPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: video, loading: videoLoading } = useVideoData(id);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(75);
  const [showControls, setShowControls] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaveRef = useRef(0);
  const { currentProgress, saveProgress } = useWatchHistory(video?.id ?? null);

  useEffect(() => {
    if (currentProgress > 0 && progress === 0) {
      setProgress(currentProgress);
    }
  }, [currentProgress]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!isPlaying || !video) return;
    const interval = setInterval(() => {
      setProgress((prev) => Math.min(100, prev + 0.1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, video]);

  useEffect(() => {
    if (progress === 0 || !video) return;
    const now = Date.now();
    if (now - lastSaveRef.current < 5000) return;
    lastSaveRef.current = now;
    saveProgress(video.id, video.type, progress);
  }, [progress, saveProgress, video]);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen();
    } else if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  };

  const totalSeconds = 2 * 3600 + 46 * 60;

  const handleSkip = (direction: "back" | "forward") => {
    setProgress((prev) => {
      const delta = (SKIP_SECONDS / totalSeconds) * 100;
      const next = direction === "forward" ? Math.min(100, prev + delta) : Math.max(0, prev - delta);
      return next;
    });
  };

  if (videoLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-white mb-4">Content not found</h1>
        <Button asChild variant="secondary">
          <Link href={routes.browse}>Browse content</Link>
        </Button>
      </div>
    );
  }

  const currentSeconds = (progress / 100) * totalSeconds;

  return (
    <div className="fixed inset-0 bg-black" ref={containerRef} onMouseMove={handleMouseMove}>
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black">
        <Image
          src={video.image}
          alt={video.title}
          fill
          className="object-cover opacity-30"
          priority
          sizes="100vw"
        />
      </div>

      <Link
        href={video.type === "movie" ? routes.movie(video.id) : routes.seriesDetail(video.id)}
        className="absolute top-4 left-4 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors"
      >
        <ChevronLeft className="w-5 h-5" />
        Back
      </Link>

      {!isPlaying && (
        <button
          onClick={() => setIsPlaying(true)}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 w-20 h-20 rounded-full bg-primary/90 hover:bg-primary flex items-center justify-center transition-all hover:scale-105 shadow-2xl shadow-primary/30"
        >
          <Play className="w-8 h-8 fill-white text-white ml-1" />
        </button>
      )}

      <div
        className={`absolute inset-0 flex flex-col justify-end transition-opacity duration-300 ${
          showControls || !isPlaying ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />

        <div className="relative px-4 sm:px-8 pb-4 sm:pb-6">
          <div className="mb-4 group">
            <Slider
              value={[progress]}
              onValueChange={(value) => setProgress(value[0])}
              max={100}
              step={0.1}
              className="cursor-pointer"
            />
            <div className="flex justify-between text-xs text-white/70 mt-1">
              <span>{formatDuration(currentSeconds)}</span>
              <span>{formatDuration(totalSeconds)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 text-white" />
                ) : (
                  <Play className="w-6 h-6 text-white ml-0.5" />
                )}
              </button>

              <button
                onClick={() => handleSkip("back")}
                className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                title="Skip back 10s"
              >
                <SkipBack className="w-5 h-5 text-white" />
              </button>

              <button
                onClick={() => handleSkip("forward")}
                className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                title="Skip forward 10s"
              >
                <SkipForward className="w-5 h-5 text-white" />
              </button>

              <div className="hidden sm:flex items-center gap-2">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                >
                  {isMuted ? (
                    <VolumeX className="w-5 h-5 text-white" />
                  ) : (
                    <Volume2 className="w-5 h-5 text-white" />
                  )}
                </button>
                <Slider
                  value={[isMuted ? 0 : volume]}
                  onValueChange={(value) => {
                    setVolume(value[0]);
                    setIsMuted(value[0] === 0);
                  }}
                  max={100}
                  step={1}
                  className="w-24"
                />
              </div>
            </div>

            <div className="hidden md:block text-center">
              <h1 className="text-lg font-semibold text-white">
                {video.title}
              </h1>
              <p className="text-sm text-white/70">{video.year}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => toast.info("Subtitles are not available for this content")}
                className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                title="Subtitles"
              >
                <Subtitles className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={() => toast.info("Quality settings are not available for this content")}
                className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                title="Settings"
              >
                <Settings className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={toggleFullscreen}
                className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                title="Fullscreen"
              >
                {isFullscreen ? (
                  <Minimize className="w-5 h-5 text-white" />
                ) : (
                  <Maximize className="w-5 h-5 text-white" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
