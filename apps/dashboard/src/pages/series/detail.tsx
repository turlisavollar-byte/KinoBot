import { useParams, useLocation } from "wouter";
import {
  useGetSeries,
  useUpdateSeries,
  useDeleteSeries,
  getGetAnalyticsOverviewQueryKey,
  getGetTopContentQueryKey,
  getGetSeriesQueryKey,
  getListSeriesQueryKey,
  useListSeasons,
  getListSeasonsQueryKey,
  useCreateSeason,
  useListEpisodes,
  getListEpisodesQueryKey,
  useCreateEpisode,
  useUpdateEpisode,
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function SeasonEpisodes({
  seriesId,
  seasonId,
  t,
}: {
  seriesId: string;
  seasonId: string;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const { data: episodes, isLoading } = useListEpisodes(seriesId, seasonId, {
    query: { queryKey: getListEpisodesQueryKey(seriesId, seasonId) },
  });

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground mt-3">
        {t("common.loading")}
      </div>
    );
  }
  if (!episodes?.length) {
    return (
      <div className="text-sm text-muted-foreground mt-3">
        {t("series.noEpisodes")}
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-1">
      {episodes.map((episode) => (
        <div
          key={episode.id}
          className="flex justify-between text-sm text-muted-foreground"
        >
          <span>
            {episode.episodeNumber}. {episode.title}
          </span>
          <span>
            {episode.telegramFileId
              ? t("series.ready")
              : t("series.missingFile")}
          </span>
        </div>
      ))}
    </div>
  );
}

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  originalTitle: z.string().optional(),
  description: z.string().optional(),
  releaseYear: z.coerce.number().optional(),
  ageRating: z.string().optional(),
  posterUrl: z.string().optional(),
  backgroundUrl: z.string().optional(),
  trailerUrl: z.string().optional(),
  telegramFileId: z.string().optional(),
});

export default function SeriesDetail() {
  const { t } = useI18n();
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: series, isLoading: isLoadingSeries } = useGetSeries(
    params.id as string,
    {
      query: {
        queryKey: getGetSeriesQueryKey(params.id as string),
        enabled: !!params.id,
      },
    },
  );
  const { data: seasons, isLoading: isLoadingSeasons } = useListSeasons(
    params.id as string,
    {
      query: {
        queryKey: getListSeasonsQueryKey(params.id as string),
        enabled: !!params.id,
      },
    },
  );

  const updateSeries = useUpdateSeries();
  const deleteSeries = useDeleteSeries();
  const createSeason = useCreateSeason();
  const createEpisode = useCreateEpisode();
  const updateEpisode = useUpdateEpisode();
  const [seasonDialogOpen, setSeasonDialogOpen] = useState(false);
  const [episodeDialogOpen, setEpisodeDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [seasonNumber, setSeasonNumber] = useState("1");
  const [seasonTitle, setSeasonTitle] = useState("");
  const [episodeNumber, setEpisodeNumber] = useState("1");
  const [episodeTitle, setEpisodeTitle] = useState("");
  const [telegramFileId, setTelegramFileId] = useState("");
  const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      originalTitle: "",
      description: "",
      releaseYear: undefined,
      ageRating: "",
      posterUrl: "",
      backgroundUrl: "",
      trailerUrl: "",
      telegramFileId: "",
    },
  });

  useEffect(() => {
    if (series) {
      form.reset({
        title: series.title,
        originalTitle: (series as any).originalTitle || "",
        description: series.description || "",
        releaseYear: (series as any).releaseYear || undefined,
        ageRating: (series as any).ageRating || "",
        posterUrl: series.posterUrl || "",
        backgroundUrl: (series as any).backgroundUrl || "",
        trailerUrl: (series as any).trailerUrl || "",
        telegramFileId: (series as any).telegramFileId || "",
      });
    }
  }, [series, form]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!params.id) return;
    updateSeries.mutate(
      { id: params.id, data: values },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getGetSeriesQueryKey(params.id as string),
          });
          toast.success(t("series.updateSuccess"));
          setLocation("/");
        },
        onError: (error) => {
          toast.error(
            error instanceof Error ? error.message : t("series.updateError"),
          );
        },
      },
    );
  };

  const handleDelete = () => {
    if (!params.id) return;
    deleteSeries.mutate(
      { id: params.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListSeriesQueryKey(),
          });
          queryClient.invalidateQueries({
            queryKey: getGetAnalyticsOverviewQueryKey(),
          });
          queryClient.invalidateQueries({
            queryKey: getGetTopContentQueryKey(),
          });
          setLocation("/catalog/series");
        },
      },
    );
  };

  const openSeasonDialog = () => {
    const nextNumber = (seasons?.length ?? 0) + 1;
    setSeasonNumber(String(nextNumber));
    setSeasonTitle(`${nextNumber}-${t("series.seasonTitleDefault")}`);
    setSeasonDialogOpen(true);
  };

  const handleAddSeason = () => {
    if (!params.id) return;
    const parsedSeasonNumber = Number(seasonNumber);
    if (!Number.isInteger(parsedSeasonNumber) || parsedSeasonNumber < 1) {
      toast.error(t("series.seasonNumberPrompt"));
      return;
    }
    if (!seasonTitle.trim()) return;
    createSeason.mutate(
      {
        id: params.id,
        data: { seasonNumber: parsedSeasonNumber, title: seasonTitle.trim() },
      },
      {
        onSuccess: () => {
          setSeasonDialogOpen(false);
          queryClient.invalidateQueries({
            queryKey: getListSeasonsQueryKey(params.id as string),
          });
        },
      },
    );
  };

  const openEpisodeDialog = (seasonId: string) => {
    setActiveSeasonId(seasonId);
    setEpisodeNumber("1");
    setEpisodeTitle(`1-${t("series.episodeTitleDefault")}`);
    setTelegramFileId("");
    setEpisodeDialogOpen(true);
  };

  const handleAddEpisode = () => {
    if (!params.id) return;
    const parsedEpisodeNumber = Number(episodeNumber);
    if (!Number.isInteger(parsedEpisodeNumber) || parsedEpisodeNumber < 1) {
      toast.error(t("series.episodeNumberPrompt"));
      return;
    }
    if (!episodeTitle.trim() || !telegramFileId.trim() || !activeSeasonId) return;
    createEpisode.mutate(
      {
        seriesId: params.id,
        seasonId: activeSeasonId,
        data: {
          episodeNumber: parsedEpisodeNumber,
          title: episodeTitle.trim(),
          telegramFileId: telegramFileId.trim(),
          sourceType: "telegram",
        },
      },
      {
        onSuccess: (episode) => {
          setEpisodeDialogOpen(false);
          if (!episode.id) return;
          updateEpisode.mutate(
            { id: episode.id, data: { isPublished: true } },
            {
              onSuccess: () =>
                queryClient.invalidateQueries({
                  queryKey: getListEpisodesQueryKey(
                    params.id as string,
                    activeSeasonId,
                  ),
                }),
            },
          );
        },
      },
    );
  };

  if (isLoadingSeries)
    return (
      <div className="text-muted-foreground text-center py-8">
        {t("common.loading")}
      </div>
    );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("series.manage")}
          </h1>
          <p className="text-muted-foreground">{series?.title}</p>
        </div>
        <Button
          variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
          disabled={deleteSeries.isPending}
        >
          {t("common.delete")}
        </Button>
      </div>

      <Tabs defaultValue="details">
        <TabsList className="mb-4">
          <TabsTrigger value="details">{t("series.details")}</TabsTrigger>
          <TabsTrigger value="seasons">
            {t("series.seasonsEpisodes")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="space-y-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>{t("series.metadata")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("series.titleLabel")}</FormLabel>
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
                          <FormLabel>{t("series.originalTitle")}</FormLabel>
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
                        <FormLabel>{t("series.description")}</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="releaseYear"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("series.releaseYear")}</FormLabel>
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
                          <FormLabel>{t("series.ageRating")}</FormLabel>
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
                  <CardTitle>{t("series.media")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="posterUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("series.poster")}</FormLabel>
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
                          <FormLabel>{t("series.background")}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="telegramFileId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("series.fileIdKey")}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Button type="submit" disabled={updateSeries.isPending} size="lg">
                {updateSeries.isPending
                  ? t("common.saving")
                  : t("series.saveChanges")}
              </Button>
            </form>
          </Form>
        </TabsContent>
        <TabsContent value="seasons">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>{t("series.seasons")}</CardTitle>
              <Button
                size="sm"
                onClick={openSeasonDialog}
                disabled={createSeason.isPending}
              >
                <Plus className="w-4 h-4 mr-2" /> {t("series.addSeason")}
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingSeasons ? (
                <div className="text-muted-foreground text-sm">
                  {t("common.loading")}
                </div>
              ) : seasons && seasons.length > 0 ? (
                <div className="space-y-4">
                  {seasons.map((season: any) => (
                    <div key={season.id} className="border p-4 rounded-md">
                      <div className="flex justify-between items-center font-medium">
                        <span>
                          {t("series.season")} {season.seasonNumber}{" "}
                          {season.title && `- ${season.title}`}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEpisodeDialog(season.id as string)}
                        >
                          <Plus className="w-4 h-4 mr-1" />{" "}
                          {t("series.addEpisode")}
                        </Button>
                      </div>
                      <SeasonEpisodes
                        seriesId={params.id as string}
                        seasonId={season.id as string}
                        t={t}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground text-sm py-4">
                  {t("series.noSeasons")}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <Dialog open={seasonDialogOpen} onOpenChange={setSeasonDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("series.addSeason")}</DialogTitle>
            <DialogDescription>{t("series.seasonNumberPrompt")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="season-number">{t("series.seasonNumberPrompt")}</Label>
              <Input
                id="season-number"
                type="number"
                min="1"
                value={seasonNumber}
                onChange={(event) => setSeasonNumber(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="season-title">{t("series.seasonTitlePrompt")}</Label>
              <Input
                id="season-title"
                value={seasonTitle}
                onChange={(event) => setSeasonTitle(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSeasonDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleAddSeason} disabled={createSeason.isPending}>
              {t("series.addSeason")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={episodeDialogOpen} onOpenChange={setEpisodeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("series.addEpisode")}</DialogTitle>
            <DialogDescription>{t("series.episodeNumberPrompt")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="episode-number">{t("series.episodeNumberPrompt")}</Label>
              <Input
                id="episode-number"
                type="number"
                min="1"
                value={episodeNumber}
                onChange={(event) => setEpisodeNumber(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="episode-title">{t("series.episodeTitlePrompt")}</Label>
              <Input
                id="episode-title"
                value={episodeTitle}
                onChange={(event) => setEpisodeTitle(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="episode-file-id">{t("series.telegramFileIdPrompt")}</Label>
              <Input
                id="episode-file-id"
                value={telegramFileId}
                onChange={(event) => setTelegramFileId(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEpisodeDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleAddEpisode} disabled={createEpisode.isPending}>
              {t("series.addEpisode")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("series.manage")}</AlertDialogTitle>
            <AlertDialogDescription>{t("series.deleteConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteSeries.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
