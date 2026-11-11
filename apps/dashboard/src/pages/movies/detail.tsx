import { useParams, useLocation } from "wouter";
import {
  useGetMovie,
  useUpdateMovie,
  useDeleteMovie,
  getGetAnalyticsOverviewQueryKey,
  getGetTopContentQueryKey,
  getGetMovieQueryKey,
  getListMoviesQueryKey,
} from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api-fetch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

type TelegramMovieMedia = {
  id: string;
  fileName: string | null;
  fileSize: number;
  duration: number | null;
  uploadedAt: string | null;
};

export default function MovieDetail() {
  const { t } = useI18n();
  const formSchema = z.object({
    title: z.string().min(1, t("movies.titleRequired")),
    originalTitle: z.string().optional(),
    description: z.string().optional(),
    releaseYear: z.coerce.number().optional(),
    duration: z.coerce.number().optional(),
    ageRating: z.string().optional(),
    posterUrl: z.string().optional(),
    backgroundUrl: z.string().optional(),
    trailerUrl: z.string().optional(),
    telegramFileId: z.string().optional(),
    storageKey: z.string().optional(),
    sourceType: z.string().optional(),
  });
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: movie, isLoading } = useGetMovie(params.id as string, {
    query: {
      queryKey: getGetMovieQueryKey(params.id as string),
      enabled: !!params.id,
    },
  });
  const updateMovie = useUpdateMovie();
  const deleteMovie = useDeleteMovie();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [telegramMedia, setTelegramMedia] = useState<TelegramMovieMedia[]>([]);
  const [selectedTelegramMediaId, setSelectedTelegramMediaId] = useState("");
  const [loadingTelegramMedia, setLoadingTelegramMedia] = useState(false);
  const [linkingTelegramMedia, setLinkingTelegramMedia] = useState(false);
  const [moviePreviewUrl, setMoviePreviewUrl] = useState<string | null>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const posterInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      originalTitle: "",
      description: "",
      releaseYear: undefined,
      duration: undefined,
      ageRating: "",
      posterUrl: "",
      backgroundUrl: "",
      trailerUrl: "",
      telegramFileId: "",
      storageKey: "",
      sourceType: "telegram",
    },
  });

  useEffect(() => {
    if (movie) {
      form.reset({
        title: movie.title,
        originalTitle: (movie as any).originalTitle || "",
        description: movie.description || "",
        releaseYear: (movie as any).releaseYear || undefined,
        duration: (movie as any).duration || undefined,
        ageRating: (movie as any).ageRating || "",
        posterUrl: movie.posterUrl || "",
        backgroundUrl: (movie as any).backgroundUrl || "",
        trailerUrl: (movie as any).trailerUrl || "",
        telegramFileId: (movie as any).telegramFileId || "",
        storageKey: (movie as any).storageKey || "",
        sourceType: (movie as any).sourceType || "telegram",
      });
    }
  }, [movie, form]);

  useEffect(() => {
    if (!movie?.id) return;
    let cancelled = false;
    setLoadingTelegramMedia(true);
    void apiFetch<{
      media: TelegramMovieMedia[];
      movieMediaStatus: "uploaded" | "missing";
      previewUrl: string | null;
    }>(`/api/catalog/movies/${encodeURIComponent(movie.id)}/media`)
      .then(({ media, previewUrl }) => {
        if (!Array.isArray(media))
          throw new Error("Invalid Telegram media response");
        if (cancelled) return;
        setTelegramMedia(media);
        setMoviePreviewUrl(previewUrl);
        setSelectedTelegramMediaId((current) =>
          media.some((item) => item.id === current)
            ? current
            : (media[0]?.id ?? ""),
        );
      })
      .catch(() => {
        if (!cancelled) toast.error(t("movies.loadTelegramMediaError"));
      })
      .finally(() => {
        if (!cancelled) setLoadingTelegramMedia(false);
      });
    return () => {
      cancelled = true;
    };
  }, [movie?.id, t]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!params.id) return;
    updateMovie.mutate(
      { id: params.id, data: values },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getGetMovieQueryKey(params.id as string),
          });
          toast.success(t("movies.updateSuccess"));
          setLocation("/");
        },
        onError: (error) => {
          toast.error(
            error instanceof Error ? error.message : t("movies.updateError"),
          );
        },
      },
    );
  };

  const handleVideoUpload = async () => {
    if (!params.id || !movie || !videoFile) return;
    if (videoFile.size > 1024 * 1024 * 1024) {
      toast.error(t("movies.uploadVideoTooLarge"));
      return;
    }

    setUploadingVideo(true);
    try {
      const body = new FormData();
      body.append("video", videoFile);
      const result = await apiFetch<{
        id: string;
        sourceType: string;
        storageKey: string;
      }>(`/api/catalog/movies/${encodeURIComponent(params.id)}/upload`, {
        method: "POST",
        body,
      });
      form.setValue("sourceType", result.sourceType, { shouldDirty: true });
      form.setValue("storageKey", result.storageKey, { shouldDirty: true });
      await queryClient.invalidateQueries({
        queryKey: getGetMovieQueryKey(params.id),
      });
      toast.success(t("movies.uploadVideoSuccess"));
      setVideoFile(null);
      if (videoInputRef.current) videoInputRef.current.value = "";
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("movies.uploadVideoError"),
      );
    } finally {
      setUploadingVideo(false);
    }
  };

  const handlePosterUpload = async () => {
    if (!params.id || !posterFile) return;
    setUploadingPoster(true);
    try {
      const body = new FormData();
      body.append("poster", posterFile);
      const result = await apiFetch<{ posterUrl: string }>(
        `/api/catalog/movies/${encodeURIComponent(params.id)}/poster`,
        { method: "POST", body },
      );
      form.setValue("posterUrl", result.posterUrl, { shouldDirty: true });
      await queryClient.invalidateQueries({
        queryKey: getGetMovieQueryKey(params.id),
      });
      setPosterFile(null);
      if (posterInputRef.current) posterInputRef.current.value = "";
      toast.success(t("movies.uploadPosterSuccess"));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("movies.uploadPosterError"),
      );
    } finally {
      setUploadingPoster(false);
    }
  };

  const handleTelegramMediaLink = async () => {
    if (!params.id || !selectedTelegramMediaId) return;
    setLinkingTelegramMedia(true);
    try {
      const result = await apiFetch<{
        id: string;
        sourceType: string;
        storageKey: string;
        telegramFileId: string;
      }>(`/api/catalog/movies/${encodeURIComponent(params.id)}/link-media`, {
        method: "POST",
        body: JSON.stringify({ mediaId: selectedTelegramMediaId }),
      });
      form.setValue("sourceType", result.sourceType, { shouldDirty: true });
      form.setValue("storageKey", result.storageKey, { shouldDirty: true });
      form.setValue("telegramFileId", result.telegramFileId, {
        shouldDirty: true,
      });
      const mediaState = await apiFetch<{ previewUrl: string | null }>(
        `/api/catalog/movies/${encodeURIComponent(params.id)}/media`,
      );
      setMoviePreviewUrl(mediaState.previewUrl);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: getGetMovieQueryKey(params.id),
        }),
        queryClient.invalidateQueries({ queryKey: getListMoviesQueryKey() }),
      ]);
      toast.success(t("movies.linkTelegramMediaSuccess"));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("movies.linkTelegramMediaError"),
      );
    } finally {
      setLinkingTelegramMedia(false);
    }
  };

  const handleDelete = () => {
    if (!params.id) return;
    if (confirm(t("movies.deleteConfirm"))) {
      deleteMovie.mutate(
        { id: params.id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey: getListMoviesQueryKey(),
            });
            queryClient.invalidateQueries({
              queryKey: getGetAnalyticsOverviewQueryKey(),
            });
            queryClient.invalidateQueries({
              queryKey: getGetTopContentQueryKey(),
            });
            setLocation("/catalog/movies");
          },
          onError: () => toast.error(t("movies.deleteError")),
        },
      );
    }
  };

  if (isLoading)
    return (
      <div className="text-muted-foreground text-center py-8">
        {t("common.loading")}
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("movies.edit")}
          </h1>
          <p className="text-muted-foreground">{movie?.title}</p>
        </div>
        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={deleteMovie.isPending}
        >
          {t("common.delete")}
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>{t("movies.metadata")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("movies.titleLabel")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="originalTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("movies.originalTitle")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("movies.description")}</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <FormField
                  control={form.control}
                  name="releaseYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("movies.releaseYear")}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("movies.durationMin")}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ageRating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("movies.ageRating")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("movies.mediaStorage")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="posterUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("movies.poster")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="backgroundUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("movies.background")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="sourceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("movies.sourceType")}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t("movies.selectSource")}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="telegram">
                            {t("movies.telegramFileId")}
                          </SelectItem>
                          <SelectItem value="minio">
                            {t("movies.minioStorageKey")}
                          </SelectItem>
                          <SelectItem value="hls">
                            {t("movies.hlsStreamUrl")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="telegramFileId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("movies.fileIdKey")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("movies.uploadVideoTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t("movies.uploadVideoHelp")}
              </p>
              <Input
                ref={videoInputRef}
                type="file"
                accept=".mp4,video/mp4"
                onChange={(event) =>
                  setVideoFile(event.target.files?.[0] ?? null)
                }
              />
              <Button
                type="button"
                onClick={handleVideoUpload}
                disabled={!movie || !params.id || !videoFile || uploadingVideo}
              >
                {uploadingVideo
                  ? t("movies.uploadingVideo")
                  : t("movies.uploadVideoButton")}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("movies.uploadPosterTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t("movies.uploadPosterHelp")}
              </p>
              {movie?.posterUrl && (
                <img
                  src={movie.posterUrl}
                  alt={movie.title}
                  className="max-h-64 max-w-sm rounded-md object-contain"
                />
              )}
              <Input
                ref={posterInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                onChange={(event) =>
                  setPosterFile(event.target.files?.[0] ?? null)
                }
              />
              <Button
                type="button"
                variant="outline"
                onClick={handlePosterUpload}
                disabled={!params.id || !posterFile || uploadingPoster}
              >
                {uploadingPoster
                  ? t("movies.uploadingPoster")
                  : t("movies.uploadPosterButton")}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("movies.linkTelegramMediaTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t("movies.linkTelegramMediaHelp")}
              </p>
              {moviePreviewUrl && (
                <video
                  key={moviePreviewUrl}
                  className="w-full max-h-[28rem] rounded-md bg-black"
                  controls
                  preload="metadata"
                  src={moviePreviewUrl}
                />
              )}
              <Select
                value={selectedTelegramMediaId}
                onValueChange={setSelectedTelegramMediaId}
                disabled={
                  loadingTelegramMedia ||
                  linkingTelegramMedia ||
                  telegramMedia.length === 0
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingTelegramMedia
                        ? t("common.loading")
                        : telegramMedia.length === 0
                          ? t("movies.noTelegramMedia")
                          : t("movies.selectTelegramMedia")
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {telegramMedia.map((media) => (
                    <SelectItem key={media.id} value={media.id}>
                      {media.fileName || t("movies.unnamedTelegramMedia")} (
                      {(media.fileSize / (1024 * 1024)).toFixed(1)} MB
                      {media.duration ? ` · ${media.duration}s` : ""})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                onClick={handleTelegramMediaLink}
                disabled={
                  !params.id || !selectedTelegramMediaId || linkingTelegramMedia
                }
              >
                {linkingTelegramMedia
                  ? t("movies.linkingTelegramMedia")
                  : t("movies.linkTelegramMediaButton")}
              </Button>
            </CardContent>
          </Card>

          <Button type="submit" disabled={updateMovie.isPending} size="lg">
            {updateMovie.isPending
              ? t("common.saving")
              : t("movies.saveChanges")}
          </Button>
        </form>
      </Form>
    </div>
  );
}
